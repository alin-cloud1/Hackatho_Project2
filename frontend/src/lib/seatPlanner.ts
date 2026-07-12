import type { SeatAssignment, SeatId, Student } from "../types";
import { needsFrontRow } from "../types";

export interface SeatPlanResult {
  grid: SeatAssignment[][];
  rows: number;
  cols: number;
  aisleCols: Set<number>;
  kuddusSeat: { row: number; col: number } | null;
  kuddusCol: number | null;
  /** Seats in front of Kuddus (his column) that are NOT shorter than him — should always be empty. */
  blockedBy: SeatId[];
  /** Seats holding vision/hearing-impaired students (front of the other columns). */
  accessibilitySeats: SeatId[];
  lineOfSightClear: boolean;
  unseated: Student[];
  notes: string[];
}

function seatKey(row: number, col: number): SeatId {
  return `${row}-${col}`;
}

function usableColumns(cols: number, aisleCols: Set<number>): number[] {
  return Array.from({ length: cols }, (_, c) => c).filter((c) => !aisleCols.has(c));
}

function emptyGrid(rows: number, cols: number): SeatAssignment[][] {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => ({
      seatId: seatKey(row, col),
      row,
      col,
      student: null as Student | null,
    }))
  );
}

const byHeightAsc = (a: Student, b: Student) => a.heightCm - b.heightCm;

/**
 * Seat planner built around Kuddus's anti-camouflage rules:
 *
 *  1. Kuddus sits in one dedicated column ("Kuddus's column").
 *  2. Only students SHORTER than Kuddus may sit in front of him in that column,
 *     so Rashid Sir always has a clear line of sight to Kuddus's desk.
 *  3. Vision/hearing-impaired students never sit in Kuddus's column — they get
 *     the front seats of the OTHER columns.
 *  4. Everyone else is seated by ascending height, front to back.
 */
export function planSeats(
  students: Student[],
  rows: number,
  cols: number,
  aisleCols: Set<number> = new Set(),
  kuddusColPref?: number
): SeatPlanResult {
  const grid = emptyGrid(rows, cols);
  const notes: string[] = [];
  const usable = usableColumns(cols, aisleCols);

  const kuddus = students.find((s) => s.isKuddus) ?? null;
  const others = students.filter((s) => !s.isKuddus);

  if (usable.length === 0) {
    return {
      grid, rows, cols, aisleCols,
      kuddusSeat: null, kuddusCol: null, blockedBy: [], accessibilitySeats: [],
      lineOfSightClear: false, unseated: students,
      notes: ["No usable columns — every column is an aisle."],
    };
  }

  // Kuddus's column: prefer a caller choice, else the rightmost usable column.
  const kuddusCol =
    kuddusColPref != null && usable.includes(kuddusColPref)
      ? kuddusColPref
      : usable[usable.length - 1];
  const otherCols = usable.filter((c) => c !== kuddusCol);

  const impaired = others.filter((s) => needsFrontRow(s)).sort(byHeightAsc);
  const regular = others.filter((s) => !needsFrontRow(s)).sort(byHeightAsc);

  const kuddusHeight = kuddus?.heightCm ?? Infinity;
  // Only non-impaired students strictly shorter than Kuddus can sit ahead of him.
  const shorterThanKuddus = regular.filter((s) => s.heightCm < kuddusHeight);
  const notShorter = regular.filter((s) => s.heightCm >= kuddusHeight);

  const unseated: Student[] = [];
  const accessibilitySeats: SeatId[] = [];

  // ---- Step A: Kuddus's column -----------------------------------------
  let kuddusSeat: { row: number; col: number } | null = null;
  let overflowShorter: Student[] = [];

  if (kuddus) {
    const frontCapacity = Math.max(0, rows - 1); // leave a seat behind the shorter ones for Kuddus
    const front = shorterThanKuddus.slice(0, frontCapacity);
    overflowShorter = shorterThanKuddus.slice(frontCapacity);

    front.forEach((s, i) => {
      grid[i][kuddusCol].student = s;
    });
    const kuddusRow = front.length; // directly behind the shorter students
    grid[kuddusRow][kuddusCol].student = kuddus;
    kuddusSeat = { row: kuddusRow, col: kuddusCol };
    notes.push(
      `Kuddus seated at row ${kuddusRow + 1}, column ${kuddusCol + 1}; ${front.length} shorter ` +
        `student(s) placed in front of him so the podium keeps a clear line of sight.`
    );
  } else {
    // No Kuddus in roster — his column just behaves like any other column.
    overflowShorter = shorterThanKuddus;
  }

  // ---- Step B: other columns (impaired first, then everyone else) -------
  // Front-to-back, left-to-right seat order across the non-Kuddus columns.
  const otherSeats: SeatAssignment[] = [];
  for (let r = 0; r < rows; r++) for (const c of otherCols) otherSeats.push(grid[r][c]);

  // Remaining students to place in the other columns, in priority order:
  // impaired (front) → then remaining regulars by ascending height.
  const remainingPool = [...overflowShorter, ...notShorter].sort(byHeightAsc);
  const otherQueue = [...impaired, ...remainingPool];

  if (impaired.length > 0) {
    notes.push(
      `${impaired.length} vision/hearing-impaired student(s) placed at the front of the ` +
        `non-Kuddus columns — never in Kuddus's column.`
    );
  }

  let qi = 0;
  for (const seat of otherSeats) {
    if (qi >= otherQueue.length) break;
    const student = otherQueue[qi++];
    seat.student = student;
    if (needsFrontRow(student)) accessibilitySeats.push(seat.seatId);
  }

  // ---- Step C: overflow into the seats BEHIND Kuddus (never blocks view) -
  if (qi < otherQueue.length && kuddusSeat) {
    for (let r = kuddusSeat.row + 1; r < rows && qi < otherQueue.length; r++) {
      const seat = grid[r][kuddusCol];
      if (!seat.student) {
        const student = otherQueue[qi++];
        seat.student = student;
        if (needsFrontRow(student)) accessibilitySeats.push(seat.seatId);
      }
    }
  }
  while (qi < otherQueue.length) unseated.push(otherQueue[qi++]);
  if (unseated.length > 0) {
    notes.push(`${unseated.length} student(s) could not be seated — grid is too small.`);
  }

  // ---- Verify the line of sight to Kuddus ------------------------------
  const blockedBy: SeatId[] = [];
  if (kuddusSeat) {
    for (let r = 0; r < kuddusSeat.row; r++) {
      const seat = grid[r][kuddusCol];
      if (seat.student && seat.student.heightCm >= kuddusHeight) blockedBy.push(seat.seatId);
    }
  }

  return {
    grid, rows, cols, aisleCols,
    kuddusSeat, kuddusCol,
    blockedBy, accessibilitySeats,
    lineOfSightClear: kuddusSeat != null && blockedBy.length === 0,
    unseated, notes,
  };
}

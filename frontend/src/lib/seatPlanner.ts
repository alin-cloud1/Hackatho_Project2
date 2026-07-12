import type { SeatAssignment, Student } from "../types";

export const PODIUM_EYE_HEIGHT_CM = 160;
const SEATED_RATIO = 0.55; // rough seated-head-height as a fraction of standing height
const CLEARANCE_CM = 6; // margin the sightline must clear above a blocker's head

export interface SeatPlanResult {
  grid: SeatAssignment[][];
  rows: number;
  cols: number;
  aisleCols: Set<number>;
  kuddusSeat: { row: number; col: number } | null;
  blockedBy: SeatId[];
  swapLog: { studentName: string; from: string; to: string }[];
  lineOfSightClear: boolean;
}

type SeatId = string;

function seatedHead(heightCm: number): number {
  return heightCm * SEATED_RATIO + 45; // + desk/chair base offset
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

function flatten(grid: SeatAssignment[][]): SeatAssignment[] {
  return grid.flat();
}

/** Sightline height (cm) the teacher's eye-line occupies at a given row, aiming at a target seat. */
function sightlineHeightAtRow(rowIndex: number, targetRow: number, targetHeight: number): number {
  const t = (rowIndex + 1) / (targetRow + 1);
  return PODIUM_EYE_HEIGHT_CM + t * (targetHeight - PODIUM_EYE_HEIGHT_CM);
}

function findBlockers(grid: SeatAssignment[][], kRow: number, kCol: number): SeatAssignment[] {
  const target = grid[kRow][kCol].student;
  if (!target) return [];
  const targetHeight = seatedHead(target.heightCm);
  const blockers: SeatAssignment[] = [];
  for (let r = 0; r < kRow; r++) {
    const seat = grid[r][kCol];
    if (!seat.student) continue;
    const ceiling = sightlineHeightAtRow(r, kRow, targetHeight) - CLEARANCE_CM;
    if (seatedHead(seat.student.heightCm) > ceiling) {
      blockers.push(seat);
    }
  }
  return blockers;
}

export function planSeats(
  students: Student[],
  rows: number,
  cols: number,
  aisleCols: Set<number> = new Set()
): SeatPlanResult {
  const grid = emptyGrid(rows, cols);
  const cols_ = usableColumns(cols, aisleCols);
  const seatOrder: [number, number][] = [];
  for (let r = 0; r < rows; r++) for (const c of cols_) seatOrder.push([r, c]);

  const frontNeeds = students.filter((s) => s.needsFrontRow).sort((a, b) => a.heightCm - b.heightCm);
  const rest = students.filter((s) => !s.needsFrontRow).sort((a, b) => a.heightCm - b.heightCm);
  const ordered = [...frontNeeds, ...rest];

  let seatIdx = 0;
  for (const student of ordered) {
    if (seatIdx >= seatOrder.length) break;
    const [r, c] = seatOrder[seatIdx];
    grid[r][c].student = student;
    seatIdx++;
  }

  let kuddusSeat: { row: number; col: number } | null = null;
  for (const seat of flatten(grid)) {
    if (seat.student?.isKuddus) kuddusSeat = { row: seat.row, col: seat.col };
  }

  const swapLog: { studentName: string; from: string; to: string }[] = [];

  if (kuddusSeat) {
    let guard = 0;
    while (guard < 30) {
      guard++;
      const blockers = findBlockers(grid, kuddusSeat.row, kuddusSeat.col);
      if (blockers.length === 0) break;

      // tallest blocker gets moved
      blockers.sort((a, b) => (b.student?.heightCm ?? 0) - (a.student?.heightCm ?? 0));
      const blocker = blockers[0];

      // find shortest-height swap target seated behind Kuddus's row, not a front-row-locked student
      const candidates = flatten(grid).filter(
        (s) =>
          s.row > kuddusSeat!.row &&
          s.student &&
          !s.student.needsFrontRow &&
          !s.student.isKuddus
      );
      candidates.sort((a, b) => (a.student?.heightCm ?? 999) - (b.student?.heightCm ?? 999));
      const swapTarget = candidates[0];

      if (!swapTarget || !blocker.student) break;

      const blockerName = blocker.student.name;
      const a = blocker.student;
      const b = swapTarget.student;
      grid[blocker.row][blocker.col].student = b;
      grid[swapTarget.row][swapTarget.col].student = a;
      swapLog.push({
        studentName: blockerName,
        from: seatKey(blocker.row, blocker.col),
        to: seatKey(swapTarget.row, swapTarget.col),
      });
    }
  }

  const finalBlockers = kuddusSeat ? findBlockers(grid, kuddusSeat.row, kuddusSeat.col) : [];

  return {
    grid,
    rows,
    cols,
    aisleCols,
    kuddusSeat,
    blockedBy: finalBlockers.map((b) => b.seatId),
    swapLog,
    lineOfSightClear: finalBlockers.length === 0,
  };
}

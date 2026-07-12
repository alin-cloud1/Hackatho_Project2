// Server-side port of the anti-camouflage seat planner.
//  1. Kuddus gets his own column; only students SHORTER than him sit in front.
//  2. Vision/hearing-impaired students never sit in Kuddus's column — they take
//     the front of the other columns.
//  3. Everyone else is seated by ascending height, front to back.

function needsFrontRow(s) {
  return s.visionImpaired || s.hearingImpaired;
}

const byHeightAsc = (a, b) => a.heightCm - b.heightCm;

export function planSeats(students, rows, cols, aisleCols = new Set(), kuddusColPref = null) {
  const grid = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => ({ seatId: `${row}-${col}`, row, col, student: null }))
  );
  const notes = [];
  const usable = Array.from({ length: cols }, (_, c) => c).filter((c) => !aisleCols.has(c));

  const kuddus = students.find((s) => s.isKuddus) ?? null;
  const others = students.filter((s) => !s.isKuddus);

  if (usable.length === 0) {
    return { grid, rows, cols, kuddusSeat: null, kuddusCol: null, blockedBy: [], accessibilitySeats: [], lineOfSightClear: false, unseated: students, notes: ["No usable columns."] };
  }

  const kuddusCol = kuddusColPref != null && usable.includes(kuddusColPref) ? kuddusColPref : usable[usable.length - 1];
  const otherCols = usable.filter((c) => c !== kuddusCol);

  const impaired = others.filter(needsFrontRow).sort(byHeightAsc);
  const regular = others.filter((s) => !needsFrontRow(s)).sort(byHeightAsc);

  const kuddusHeight = kuddus?.heightCm ?? Infinity;
  const shorterThanKuddus = regular.filter((s) => s.heightCm < kuddusHeight);
  const notShorter = regular.filter((s) => s.heightCm >= kuddusHeight);

  const unseated = [];
  const accessibilitySeats = [];

  // Step A: Kuddus's column — shorter students in front, Kuddus behind them.
  let kuddusSeat = null;
  let overflowShorter = [];
  if (kuddus) {
    const frontCapacity = Math.max(0, rows - 1);
    const front = shorterThanKuddus.slice(0, frontCapacity);
    overflowShorter = shorterThanKuddus.slice(frontCapacity);
    front.forEach((s, i) => {
      grid[i][kuddusCol].student = s;
    });
    const kuddusRow = front.length;
    grid[kuddusRow][kuddusCol].student = kuddus;
    kuddusSeat = { row: kuddusRow, col: kuddusCol };
    notes.push(`Kuddus seated at row ${kuddusRow + 1}, column ${kuddusCol + 1}; ${front.length} shorter student(s) in front of him.`);
  } else {
    overflowShorter = shorterThanKuddus;
  }

  // Step B: other columns — impaired first (front), then the rest by height.
  const otherSeats = [];
  for (let r = 0; r < rows; r++) for (const c of otherCols) otherSeats.push(grid[r][c]);
  const remainingPool = [...overflowShorter, ...notShorter].sort(byHeightAsc);
  const otherQueue = [...impaired, ...remainingPool];
  if (impaired.length > 0) {
    notes.push(`${impaired.length} vision/hearing-impaired student(s) placed at the front of the non-Kuddus columns.`);
  }

  let qi = 0;
  for (const seat of otherSeats) {
    if (qi >= otherQueue.length) break;
    const student = otherQueue[qi++];
    seat.student = student;
    if (needsFrontRow(student)) accessibilitySeats.push(seat.seatId);
  }

  // Step C: overflow behind Kuddus (never blocks the sightline).
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

  const blockedBy = [];
  if (kuddusSeat) {
    for (let r = 0; r < kuddusSeat.row; r++) {
      const seat = grid[r][kuddusCol];
      if (seat.student && seat.student.heightCm >= kuddusHeight) blockedBy.push(seat.seatId);
    }
  }

  return {
    grid, rows, cols, kuddusSeat, kuddusCol, blockedBy, accessibilitySeats,
    lineOfSightClear: kuddusSeat != null && blockedBy.length === 0,
    unseated, notes,
  };
}

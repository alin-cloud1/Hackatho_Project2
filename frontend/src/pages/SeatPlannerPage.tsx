import { useMemo, useState } from "react";
import { Eye, EyeOff, RefreshCw, Crown, Accessibility } from "lucide-react";
import { ROSTER } from "../data/mockData";
import { planSeats } from "../lib/seatPlanner";
import { Badge, Card, Field, PageHeader, inputClass } from "../components/ui";

export function SeatPlannerPage() {
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(5);
  const [aisleCol, setAisleCol] = useState(2); // -1 = no aisle

  const aisleCols = useMemo(() => {
    const set = new Set<number>();
    if (aisleCol >= 0 && aisleCol < cols) set.add(aisleCol);
    return set;
  }, [aisleCol, cols]);

  const result = useMemo(() => planSeats(ROSTER, rows, cols, aisleCols), [rows, cols, aisleCols]);

  return (
    <div>
      <PageHeader
        eyebrow="Mission 2"
        title="Anti-Camouflage Seat Planner"
        description="Height-sorted seating with a line-of-sight algorithm that guarantees Rashid Sir can always see Kuddus's desk from the podium."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-ink-800 px-3 py-1.5 text-xs font-semibold text-ink-300">
                  Teacher's Podium ↓
                </span>
              </div>
              <div className="flex items-center gap-2">
                {result.lineOfSightClear ? (
                  <Badge tone="success">
                    <Eye className="h-3 w-3" /> Line of sight clear to Kuddus
                  </Badge>
                ) : (
                  <Badge tone="danger">
                    <EyeOff className="h-3 w-3" /> Sightline blocked
                  </Badge>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <div
                className="grid gap-2.5 mx-auto"
                style={{
                  gridTemplateColumns: `repeat(${cols}, minmax(56px, 1fr))`,
                  maxWidth: `${cols * 90}px`,
                }}
              >
                {result.grid.flat().map((seat) => {
                  const s = seat.student;
                  const isBlocker = result.blockedBy.includes(seat.seatId);
                  const isAisle = aisleCols.has(seat.col);

                  if (isAisle) {
                    return (
                      <div
                        key={seat.seatId}
                        className="flex aspect-square items-center justify-center"
                        title="Center aisle — no seating"
                      >
                        <div className="h-full w-1 rounded-full bg-ink-800/80" />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={seat.seatId}
                      className={`relative flex aspect-square flex-col items-center justify-center rounded-xl border p-1.5 text-center transition-colors ${
                        !s
                          ? "border-dashed border-ink-800 bg-ink-900/40"
                          : s.isKuddus
                            ? "border-signal-500 bg-signal-500/15"
                            : isBlocker
                              ? "border-alert-500 bg-alert-500/15"
                              : s.needsFrontRow
                                ? "border-electric-500/50 bg-electric-500/10"
                                : "border-ink-600 bg-ink-900"
                      }`}
                      title={s ? `${s.name} — ${s.heightCm}cm` : "empty seat"}
                    >
                      {s?.isKuddus && (
                        <Crown className="absolute -top-2 h-3.5 w-3.5 text-signal-400" />
                      )}
                      {s?.needsFrontRow && (
                        <Accessibility className="absolute -top-2 right-0.5 h-3 w-3 text-electric-400" />
                      )}
                      {s ? (
                        <>
                          <span className="text-[10px] font-bold leading-tight text-ink-100">
                            {s.name.split(" ")[0]}
                          </span>
                          <span className="text-[9px] text-ink-400">{s.heightCm}cm</span>
                        </>
                      ) : (
                        <span className="text-[9px] text-ink-700">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3 text-[11px] text-ink-400">
              <LegendDot className="border-signal-500 bg-signal-500/15" label="Kuddus" />
              <LegendDot className="border-electric-500/50 bg-electric-500/10" label="Accessibility priority" />
              <LegendDot className="border-alert-500 bg-alert-500/15" label="Sightline blocker" />
              <LegendDot className="border-ink-600 bg-ink-900" label="Regular seat" />
            </div>
          </Card>

          {result.swapLog.length > 0 && (
            <Card className="mt-6 p-6">
              <div className="mb-3 flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-electric-400" />
                <h3 className="font-display text-sm font-bold text-ink-100">
                  Auto-Resolved Swaps ({result.swapLog.length})
                </h3>
              </div>
              <ul className="space-y-1.5 text-xs text-ink-400">
                {result.swapLog.map((s, i) => (
                  <li key={i}>
                    Moved <span className="text-ink-200 font-medium">{s.studentName}</span> from
                    seat {s.from} to seat {s.to} to clear the podium's sightline to Kuddus.
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-4 font-display text-sm font-bold text-ink-100">Grid Configuration</h3>
            <div className="space-y-4">
              <Field label={`Rows: ${rows}`}>
                <input
                  type="range"
                  min={3}
                  max={8}
                  value={rows}
                  onChange={(e) => setRows(Number(e.target.value))}
                  className="w-full accent-electric-500"
                />
              </Field>
              <Field label={`Columns: ${cols}`}>
                <input
                  type="range"
                  min={3}
                  max={6}
                  value={cols}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setCols(next);
                    if (aisleCol >= next) setAisleCol(-1);
                  }}
                  className="w-full accent-electric-500"
                />
              </Field>
              <Field label="Center Aisle Column">
                <select
                  className={inputClass}
                  value={aisleCol}
                  onChange={(e) => setAisleCol(Number(e.target.value))}
                >
                  <option value={-1}>None</option>
                  {Array.from({ length: cols }, (_, c) => c).map((c) => (
                    <option key={c} value={c}>
                      Column {c + 1}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-2 font-display text-sm font-bold text-ink-100">
              Line-of-Sight Algorithm
            </h3>
            <p className="text-xs leading-relaxed text-ink-400">
              Students are seated shortest-to-tallest front-to-back. For Kuddus's column, the
              planner computes the teacher's eye-line geometrically (podium eye height vs. each
              row's seated head height) and, if anyone in front blocks the view, swaps the tallest
              blocker with the shortest eligible student further back — repeating until the
              podium has a clear line of sight to Kuddus's desk.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="mb-2 font-display text-sm font-bold text-ink-100">
              Dynamic Constraints
            </h3>
            <p className="text-xs leading-relaxed text-ink-400">
              Students flagged for vision/hearing accommodation are always seated first, in the
              earliest available rows, regardless of height — and are never selected as swap
              targets by the sightline optimizer.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="mb-3 font-display text-sm font-bold text-ink-100">Roster ({ROSTER.length})</h3>
            <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1 text-xs">
              {ROSTER.map((s) => (
                <div key={s.rollNumber} className="flex items-center justify-between text-ink-400">
                  <span className="text-ink-300">
                    #{s.rollNumber} {s.name}
                  </span>
                  <span>{s.heightCm}cm</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded border ${className}`} />
      {label}
    </span>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Crown, Accessibility, Ruler, Save, Check } from "lucide-react";
import { KUDDUS } from "../data/mockData";
import { needsFrontRow } from "../types";
import type { SeatPlan, SeatProfile, Student } from "../types";
import { api } from "../lib/api";
import { useAppState } from "../state/AppStateContext";
import { Badge, Button, Card, Field, PageHeader, inputClass } from "../components/ui";

export function SeatPlannerPage() {
  const { currentStudent, setSeatProfile } = useAppState();
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(5);
  const [aisleCol, setAisleCol] = useState(2); // -1 = no aisle
  const [result, setResult] = useState<SeatPlan | null>(null);

  const aisleCols = useMemo(() => {
    const set = new Set<number>();
    if (aisleCol >= 0 && aisleCol < cols) set.add(aisleCol);
    return set;
  }, [aisleCol, cols]);

  // The seating plan is computed server-side (merging persisted seat profiles).
  const fetchPlan = useCallback(async () => {
    try {
      setResult(await api.getSeatPlan(rows, cols, aisleCol));
    } catch {
      setResult(null);
    }
  }, [rows, cols, aisleCol]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  // The logged-in person can edit their OWN seat attributes (teacher has no seat).
  const canEditSelf = currentStudent && !currentStudent.isTeacher && !currentStudent.isKuddus;

  // The caller's current effective attributes, pulled from the plan grid.
  const myStudent = useMemo<Student | null>(() => {
    if (!result || !currentStudent) return null;
    for (const row of result.grid)
      for (const seat of row) if (seat.student?.rollNumber === currentStudent.rollNumber) return seat.student;
    return null;
  }, [result, currentStudent]);

  const handleSaveProfile = useCallback(
    async (rollNumber: string, profile: SeatProfile) => {
      const res = await setSeatProfile(rollNumber, profile);
      if (res.ok) await fetchPlan();
      return res;
    },
    [setSeatProfile, fetchPlan]
  );

  if (!result) {
    return (
      <div>
        <PageHeader eyebrow="Mission 2" title="Anti-Camouflage Seat Planner" description="Loading the classroom grid…" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Mission 2"
        title="Anti-Camouflage Seat Planner"
        description="Only students shorter than Kuddus sit in front of him, and no vision/hearing-impaired student is ever placed in his column — so Rashid Sir always sees Kuddus's desk."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full bg-ink-800 px-3 py-1.5 text-xs font-semibold text-ink-300">
                Teacher's Podium ↓
              </span>
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

            <div className="overflow-x-auto">
              <div
                className="mx-auto grid gap-2.5"
                style={{
                  gridTemplateColumns: `repeat(${cols}, minmax(56px, 1fr))`,
                  maxWidth: `${cols * 90}px`,
                }}
              >
                {result.grid.flat().map((seat) => {
                  const s = seat.student;
                  const isBlocker = result.blockedBy.includes(seat.seatId);
                  const isAisle = aisleCols.has(seat.col);
                  const isKuddusCol = seat.col === result.kuddusCol;
                  const isMe = !!currentStudent && s?.rollNumber === currentStudent.rollNumber;

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
                          ? `border-dashed ${isKuddusCol ? "border-signal-500/30 bg-signal-500/5" : "border-ink-800 bg-ink-900/40"}`
                          : s.isKuddus
                            ? "border-signal-500 bg-signal-500/15"
                            : isBlocker
                              ? "border-alert-500 bg-alert-500/15"
                              : needsFrontRow(s)
                                ? "border-electric-500/50 bg-electric-500/10"
                                : isKuddusCol
                                  ? "border-mint-500/40 bg-mint-500/5"
                                  : "border-ink-600 bg-ink-900"
                      } ${isMe ? "ring-2 ring-electric-400 ring-offset-2 ring-offset-ink-950" : ""}`}
                      title={s ? `#${s.rollNumber} ${s.name} — ${s.heightCm}cm${needsFrontRow(s) ? " (accessibility)" : ""}` : "empty seat"}
                    >
                      {s?.isKuddus && <Crown className="absolute -top-2 h-3.5 w-3.5 text-signal-400" />}
                      {s && needsFrontRow(s) && (
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
              <LegendDot className="border-mint-500/40 bg-mint-500/5" label="Kuddus's column" />
              <LegendDot className="border-electric-500/50 bg-electric-500/10" label="Vision/hearing (front of other cols)" />
              <LegendDot className="border-alert-500 bg-alert-500/15" label="Sightline blocker" />
            </div>
          </Card>

          {result.notes.length > 0 && (
            <Card className="mt-6 p-6">
              <h3 className="mb-3 font-display text-sm font-bold text-ink-100">Placement Log</h3>
              <ul className="list-disc space-y-1.5 pl-4 text-xs text-ink-400">
                {result.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {canEditSelf ? (
            <SelfSeatForm
              rollNumber={currentStudent!.rollNumber}
              name={currentStudent!.name}
              initial={myStudent}
              onSave={handleSaveProfile}
            />
          ) : (
            <Card className="p-6">
              <h3 className="mb-2 font-display text-sm font-bold text-ink-100">Your Seat Details</h3>
              <p className="text-xs leading-relaxed text-ink-400">
                {currentStudent?.isTeacher
                  ? "As the class teacher you observe from the podium — you don't occupy a classroom desk."
                  : "Only seated students can enter their own height and accessibility needs."}
              </p>
            </Card>
          )}

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
            <h3 className="mb-2 font-display text-sm font-bold text-ink-100">Seating Rules</h3>
            <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-ink-400">
              <li>
                Kuddus (<span className="text-signal-400">{KUDDUS.heightCm}cm</span>) gets his own
                column; only students <span className="text-mint-400">shorter than him</span> sit in
                front of him.
              </li>
              <li>
                Vision or hearing-impaired students are seated at the front of the{" "}
                <span className="text-electric-400">other</span> columns — never in Kuddus's column.
              </li>
              <li>Everyone else is arranged shortest-to-tallest, front to back.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SelfSeatForm({
  rollNumber,
  name,
  initial,
  onSave,
}: {
  rollNumber: string;
  name: string;
  initial: Student | null;
  onSave: (roll: string, p: SeatProfile) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [height, setHeight] = useState<string>(String(initial?.heightCm ?? 150));
  const [vision, setVision] = useState<boolean>(initial?.visionImpaired ?? false);
  const [hearing, setHearing] = useState<boolean>(initial?.hearingImpaired ?? false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const h = Number(height);
    if (!Number.isFinite(h) || h < 100 || h > 210) {
      setError("Height must be 100–210 cm.");
      return;
    }
    setError(null);
    const res = await onSave(rollNumber, { heightCm: Math.round(h), visionImpaired: vision, hearingImpaired: hearing });
    if (!res.ok) {
      setError(res.error ?? "Failed to save.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <Ruler className="h-4 w-4 text-electric-400" />
        <h3 className="font-display text-sm font-bold text-ink-100">Enter Your Seat Details</h3>
      </div>
      <p className="mb-4 text-[11px] text-ink-500">
        Tied to your login — Roll #{rollNumber} ({name.split(" ")[0]}). You can only set your own.
      </p>

      <div className="space-y-4">
        <Field label="Height (cm)">
          <input
            type="number"
            min={100}
            max={210}
            className={inputClass}
            value={height}
            onChange={(e) => setHeight(e.target.value)}
          />
        </Field>

        <ToggleRow
          label="Vision problem"
          hint="If yes, you'll never be seated in Kuddus's column."
          checked={vision}
          onChange={setVision}
        />
        <ToggleRow
          label="Hearing problem"
          hint="If yes, you'll never be seated in Kuddus's column."
          checked={hearing}
          onChange={setHearing}
        />

        <Button onClick={submit} className="w-full">
          {saved ? (
            <>
              <Check className="h-4 w-4" /> Saved
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Save My Seat Details
            </>
          )}
        </Button>
        {error && <p className="text-[11px] font-medium text-signal-400">{error}</p>}
      </div>
    </Card>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-ink-700 bg-ink-900/60 px-3.5 py-3">
      <span className="text-sm">
        <span className="font-medium text-ink-200">{label}</span>
        <span className="mt-0.5 block text-[11px] text-ink-500">{hint}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-electric-500"
      />
    </label>
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

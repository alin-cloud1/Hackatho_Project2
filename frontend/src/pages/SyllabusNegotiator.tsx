import { useState } from "react";
import { Sparkles, ListChecks, Trash2, CalendarClock } from "lucide-react";
import { api } from "../lib/api";
import type { SyllabusResult } from "../types";
import { Badge, Button, Card, Field, PageHeader, inputClass } from "../components/ui";

const SAMPLE =
  "For the 10-mark test, study Chapters 1 to 7, including the writer's biography, the index, and the barcode on the back cover. Also cover photosynthesis, cell structure, and Newton's laws of motion in detail, plus the entire periodic table basics and simple machines. Don't forget the acknowledgements page and the publisher's address.";

export function SyllabusNegotiator() {
  const [rawText, setRawText] = useState(SAMPLE);
  const [testDate, setTestDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 6);
    return d.toISOString().slice(0, 10);
  });
  const [result, setResult] = useState<SyllabusResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!rawText.trim()) return;
    setProcessing(true);
    setError(null);
    try {
      const res = await api.summarizeSyllabus(rawText, testDate);
      setResult(res);
      setMode(res.mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Mission 3"
        title="Syllabus Negotiator"
        description="Paste Kuddus's terrifying syllabus decree. The engine cross-references it against the real curriculum and outputs a bite-sized study plan."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card className="p-6">
            <Field label="Kuddus's Syllabus Announcement">
              <textarea
                className={`${inputClass} min-h-40 resize-y`}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
              />
            </Field>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Field label="Test Date">
                <input
                  type="date"
                  className={inputClass}
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                />
              </Field>
              <div className="flex items-end">
                <Button onClick={handleAnalyze} disabled={processing} className="w-full">
                  {processing ? (
                    "Analyzing..."
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Negotiate Syllabus
                    </>
                  )}
                </Button>
              </div>
            </div>
            {error && (
              <p className="mt-3 rounded-lg border border-signal-500/30 bg-signal-500/10 px-3 py-2 text-xs font-medium text-signal-400">
                {error}
              </p>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="mb-2 font-display text-sm font-bold text-ink-100">
              Contextual RAG (Advanced Engineering)
            </h3>
            <p className="text-xs leading-relaxed text-ink-400">
              Every candidate topic pulled from Kuddus's rambling text is scored against the
              official curriculum's topic list (the injected context) using term-overlap
              similarity. Anything that doesn't match a real chapter — "the barcode on the back
              cover," "the writer's biography" — gets filtered out as non-examinable garbage
              instead of reaching the study plan.
            </p>
            <p className="mt-2 text-[11px] text-ink-500">
              This calls the backend RAG service. With a{" "}
              <code className="rounded bg-ink-900 px-1 py-0.5">GEMINI_API_KEY</code> set, it uses
              real embeddings + generation (Google Gemini free tier); otherwise it falls back to a
              local keyword filter.
              {mode && (
                <>
                  {" "}
                  Last run: <span className="font-semibold text-ink-300">{mode === "rag" ? "Gemini RAG" : "local fallback"}</span>.
                </>
              )}
            </p>
          </Card>
        </div>

        <div className="space-y-6">
          {!result && (
            <Card className="flex h-full min-h-64 flex-col items-center justify-center p-6 text-center">
              <ListChecks className="mb-3 h-8 w-8 text-ink-600" />
              <p className="text-sm text-ink-400">
                Results will appear here — filtered topics and a day-by-day study countdown.
              </p>
            </Card>
          )}

          {result && (
            <>
              <Card className="p-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-ink-100">
                    Examinable Topics ({result.keptTopics.length})
                  </h3>
                  <Badge tone="success">RAG-filtered</Badge>
                </div>
                <ul className="space-y-1.5">
                  {result.keptTopics.map((t) => (
                    <li key={t} className="flex items-center gap-2 text-sm text-ink-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-mint-400" /> {t}
                    </li>
                  ))}
                  {result.keptTopics.length === 0 && (
                    <p className="text-xs text-ink-500">No curriculum-matched topics found.</p>
                  )}
                </ul>
              </Card>

              {result.filteredOut.length > 0 && (
                <Card className="p-6">
                  <div className="mb-3 flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-signal-400" />
                    <h3 className="font-display text-sm font-bold text-ink-100">
                      Filtered as Garbage ({result.filteredOut.length})
                    </h3>
                  </div>
                  <ul className="space-y-1 text-xs text-ink-500">
                    {result.filteredOut.map((t, i) => (
                      <li key={i} className="line-through decoration-signal-500/50">
                        {t}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              <Card className="p-6">
                <div className="mb-3 flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-electric-400" />
                  <h3 className="font-display text-sm font-bold text-ink-100">
                    Study Countdown (JSON Plan)
                  </h3>
                </div>
                <div className="space-y-2">
                  {result.studyPlan.map((block) => (
                    <div key={block.day} className="rounded-xl border border-ink-700 bg-ink-900/60 p-3">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-semibold text-ink-100">
                          Day {block.day} &middot; {block.date}
                        </span>
                        <span className="text-ink-500">{block.minutes} min</span>
                      </div>
                      <p className="text-xs text-ink-400">{block.topics.join(", ")}</p>
                    </div>
                  ))}
                  {result.studyPlan.length === 0 && (
                    <p className="text-xs text-ink-500">No plan generated.</p>
                  )}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

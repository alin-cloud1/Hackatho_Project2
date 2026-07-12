import { useState } from "react";
import type { FormEvent } from "react";
import { Search, ShieldCheck, ShieldX, Quote, BookMarked } from "lucide-react";
import { factCheckClaim } from "../lib/factCheck";
import type { FactCheckResult } from "../lib/factCheck";
import { RULEBOOK } from "../data/mockData";
import { Badge, Button, Card, PageHeader, inputClass } from "../components/ui";

const SAMPLE_CLAIMS = [
  "The Headmaster said 1st Captains don't have to do homework",
  "Captains can charge a washroom bribe",
  "Seating must be assigned by an impartial height standard",
  "Three anonymous complaints trigger impeachment",
];

export function FactChecker() {
  const [claim, setClaim] = useState("");
  const [result, setResult] = useState<FactCheckResult | null>(null);

  const runCheck = (text: string) => {
    if (!text.trim()) return;
    setResult(factCheckClaim(text));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    runCheck(claim);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Mission 6"
        title="Kuddus Fact-Checker"
        description="Paste a claim Kuddus made and instantly debunk it against the official school rulebook."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  className={`${inputClass} pl-10`}
                  placeholder="e.g. 1st Captains don't have to do homework"
                  value={claim}
                  onChange={(e) => setClaim(e.target.value)}
                />
              </div>
              <Button type="submit">Fact-Check</Button>
            </form>
            <div className="mt-4 flex flex-wrap gap-2">
              {SAMPLE_CLAIMS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setClaim(c);
                    runCheck(c);
                  }}
                  className="rounded-full border border-ink-700 bg-ink-900 px-3 py-1.5 text-[11px] text-ink-400 hover:border-electric-500 hover:text-ink-200"
                >
                  {c}
                </button>
              ))}
            </div>
          </Card>

          {result && (
            <Card
              className={`animate-fade-up p-6 border-2 ${
                result.verdict === "TRUE" ? "border-mint-500/40" : "border-signal-500/40"
              }`}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {result.verdict === "TRUE" ? (
                    <ShieldCheck className="h-6 w-6 text-mint-400" />
                  ) : (
                    <ShieldX className="h-6 w-6 text-signal-400" />
                  )}
                  <span
                    className={`font-display text-2xl font-extrabold tracking-wide ${
                      result.verdict === "TRUE" ? "text-mint-400" : "text-signal-400"
                    }`}
                  >
                    [{result.verdict}]
                  </span>
                </div>
                <Badge tone={result.mode === "exact" ? "info" : "warning"}>
                  {result.mode === "exact" ? "String match" : "Semantic match"}
                </Badge>
              </div>

              <div className="mb-4">
                <div className="mb-1 flex items-center justify-between text-xs text-ink-400">
                  <span>Confidence Score</span>
                  <span className="font-display font-bold text-ink-100">
                    {(result.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-ink-900">
                  <div
                    className={`h-full rounded-full ${
                      result.verdict === "TRUE" ? "bg-mint-500" : "bg-signal-500"
                    }`}
                    style={{ width: `${result.confidence * 100}%` }}
                  />
                </div>
              </div>

              {result.matchedRule ? (
                <div className="rounded-xl border border-ink-700 bg-ink-900/60 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink-300">
                    <Quote className="h-3.5 w-3.5" /> {result.matchedRule.section}
                  </div>
                  <p className="text-sm italic text-ink-200">&ldquo;{result.matchedRule.text}&rdquo;</p>
                </div>
              ) : (
                <p className="text-xs text-ink-500">No matching rule found in the official rulebook.</p>
              )}
            </Card>
          )}

          <Card className="p-6">
            <h3 className="mb-2 font-display text-sm font-bold text-ink-100">
              Semantic Fact-Checking Engine (Advanced Engineering)
            </h3>
            <p className="text-xs leading-relaxed text-ink-400">
              Beyond exact substring matching, claims are scored against each rule's keyword
              embedding set to catch paraphrased fabrications — not just verbatim quotes. Swap{" "}
              <code className="rounded bg-ink-900 px-1 py-0.5">src/lib/factCheck.ts</code> for a
              real vector embedding API later without changing the calling page.
            </p>
          </Card>
        </div>

        <div>
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <BookMarked className="h-4 w-4 text-electric-400" />
              <h3 className="font-display text-sm font-bold text-ink-100">
                Official Rulebook ({RULEBOOK.length})
              </h3>
            </div>
            <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
              {RULEBOOK.map((r) => (
                <div key={r.id} className="rounded-xl border border-ink-700 bg-ink-900/60 p-3">
                  <p className="mb-1 text-[11px] font-semibold text-electric-400">{r.section}</p>
                  <p className="text-xs text-ink-300">{r.text}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

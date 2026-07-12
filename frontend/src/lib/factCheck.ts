import { RULEBOOK } from "../data/mockData";
import type { RulebookEntry } from "../types";

export interface FactCheckResult {
  verdict: "TRUE" | "FALSE";
  confidence: number;
  matchedRule: RulebookEntry | null;
  mode: "exact" | "semantic";
}

// Baseline: exact/substring string match against the rulebook table.
function exactMatch(claim: string): RulebookEntry | null {
  const lower = claim.toLowerCase();
  return RULEBOOK.find((r) => lower.includes(r.text.toLowerCase().slice(0, 12))) ?? null;
}

// Advanced: lightweight local stand-in for embedding-based semantic search —
// scores keyword overlap between the claim and each rule's keyword set.
// Swap for a real embedding API (see README) without changing the call shape.
function semanticMatch(claim: string): { rule: RulebookEntry | null; score: number } {
  const claimWords = new Set(claim.toLowerCase().split(/\W+/).filter(Boolean));
  let best: RulebookEntry | null = null;
  let bestScore = 0;

  for (const rule of RULEBOOK) {
    let hits = 0;
    for (const kw of rule.keywords) {
      if (claim.toLowerCase().includes(kw)) hits++;
      else {
        for (const w of claimWords) {
          if (kw.includes(w) && w.length > 3) {
            hits += 0.5;
            break;
          }
        }
      }
    }
    const score = hits / rule.keywords.length;
    if (score > bestScore) {
      bestScore = score;
      best = rule;
    }
  }
  return { rule: best, score: Math.min(0.99, bestScore) };
}

const KUDDUS_CLAIM_MARKERS = [
  "don't have to",
  "dont have to",
  "exempt",
  "no need to",
  "allowed to",
  "can skip",
  "headmaster said",
];

export function factCheckClaim(claim: string): FactCheckResult {
  const exact = exactMatch(claim);
  const { rule: semanticRule, score } = semanticMatch(claim);

  const matchedRule = exact ?? semanticRule;
  const mode: "exact" | "semantic" = exact ? "exact" : "semantic";
  const confidence = exact ? 0.97 : Math.max(0.35, score);

  const soundsLikeFabrication = KUDDUS_CLAIM_MARKERS.some((m) => claim.toLowerCase().includes(m));
  const verdict: "TRUE" | "FALSE" = matchedRule && !soundsLikeFabrication && score > 0.4 ? "TRUE" : "FALSE";

  return { verdict, confidence, matchedRule, mode };
}

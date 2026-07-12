import { llmEnabled } from "../config.js";
import { query } from "../db.js";
import { generateJson } from "./rag.js";

// Words that signal Kuddus is claiming a permission/exemption the rulebook denies.
const PERMISSION_MARKERS = [
  "don't have to", "dont have to", "do not have to", "no need", "exempt", "allowed to",
  "can ", "may ", "free to", "permitted", "no homework", "skip", "entitled", "right to charge",
  "can charge", "can tax", "can collect",
];

function keywordScore(claim, rule) {
  const text = claim.toLowerCase();
  let hits = 0;
  for (const kw of rule.keywords) if (text.includes(kw.toLowerCase())) hits++;
  return rule.keywords.length ? hits / rule.keywords.length : 0;
}

function bestRuleKeyword(claim, rules) {
  let best = null;
  let bestScore = -1;
  for (const rule of rules) {
    const score = keywordScore(claim, rule);
    if (score > bestScore) {
      bestScore = score;
      best = rule;
    }
  }
  return { rule: best, score: bestScore };
}

/** Heuristic verdict for the no-API fallback. */
function heuristicVerdict(claim) {
  const text = claim.toLowerCase();
  // The rulebook is a set of prohibitions/guarantees; Kuddus claiming a
  // permission/exemption contradicts it => FALSE.
  return PERMISSION_MARKERS.some((m) => text.includes(m)) ? "FALSE" : "TRUE";
}

// LLM fact-check over the WHOLE rulebook (only a handful of rules, so no
// embeddings/retrieval needed) — works with either Groq or Gemini.
async function llmFactCheck(claim, rules) {
  const ruleList = rules.map((r) => `[${r.section}] ${r.body}`).join("\n");
  const prompt = `Kuddus, a power-hungry Class 7 captain, invents school rules to grab power. Judge his claim STRICTLY against the official rulebook below and pick the single most relevant rule.

OFFICIAL RULEBOOK:
${ruleList}

KUDDUS'S CLAIM:
"${claim}"

Rules of judgement:
- A claim that grants Kuddus a power, exemption, or charge that the rulebook forbids is FALSE.
- A claim that restates or agrees with a rule is TRUE.
- Use "UNVERIFIED" only if no rule is relevant.

Return ONLY JSON:
{"status":"TRUE"|"FALSE"|"UNVERIFIED","confidence":0.0-1.0,"section":"<exact section header of the rule you used, or null>","reason":"<one short sentence>"}`;

  const v = await generateJson(prompt);
  const status = ["TRUE", "FALSE", "UNVERIFIED"].includes(v.status) ? v.status : "UNVERIFIED";
  // Anchor the quote to the REAL rule text (never trust an LLM-quoted string).
  const matched = rules.find((r) => v.section && r.section.toLowerCase().includes(String(v.section).toLowerCase().slice(0, 12)))
    || rules.find((r) => String(v.section || "").toLowerCase().includes(r.section.toLowerCase().slice(0, 12)));
  const confidence = typeof v.confidence === "number" ? Math.min(0.99, Math.max(0.3, v.confidence)) : 0.75;
  return {
    status,
    confidence: Number(confidence.toFixed(2)),
    quote: matched ? matched.body : null,
    section: matched ? matched.section : null,
    mode: "semantic",
    reason: v.reason || "Judged against the official rulebook.",
  };
}

export async function factCheck(claim) {
  const { rows } = await query("SELECT id, section, body, keywords FROM rulebook");
  // keywords is stored as JSON text in SQLite.
  const rules = rows.map((r) => ({ ...r, keywords: Array.isArray(r.keywords) ? r.keywords : JSON.parse(r.keywords || "[]") }));

  if (llmEnabled) {
    try {
      const result = await llmFactCheck(claim, rules);
      if (result.status !== "UNVERIFIED" || result.section) return result;
    } catch (err) {
      console.warn("LLM fact-check failed, falling back to keyword match:", err.message);
    }
  }

  // Local fallback: keyword match to the closest rule + heuristic verdict.
  const match = bestRuleKeyword(claim, rules);
  if (!match.rule || match.score <= 0) {
    return {
      status: "UNVERIFIED",
      confidence: 0,
      quote: null,
      section: null,
      mode: "string-match",
      reason: "No matching rule found in the official rulebook.",
    };
  }
  return {
    status: heuristicVerdict(claim),
    confidence: Number(Math.min(0.99, Math.max(0.4, match.score)).toFixed(2)),
    quote: match.rule.body,
    section: match.rule.section,
    mode: "string-match",
    reason: "Judged against the closest official rule.",
  };
}

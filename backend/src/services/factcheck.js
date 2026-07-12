import { ragEnabled, config } from "../config.js";
import { query } from "../db.js";
import { embedText } from "./rag.js";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function cosineSimilarity(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

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

async function bestRuleSemantic(claim, rules) {
  const claimVec = await embedText(claim);
  let best = null;
  let bestScore = -1;
  for (const rule of rules) {
    if (!rule.embedding) continue;
    const score = cosineSimilarity(claimVec, JSON.parse(rule.embedding));
    if (score > bestScore) {
      bestScore = score;
      best = rule;
    }
  }
  return { rule: best, score: bestScore };
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

async function llmVerdict(claim, rule) {
  const url = `${GEMINI_BASE}/${config.gemini.genModel}:generateContent?key=${config.gemini.apiKey}`;
  const prompt = `A class captain named Kuddus makes claims about school rules to grab power. Judge whether his claim is TRUE or FALSE strictly according to the official rule provided.

OFFICIAL RULE (${rule.section}):
"${rule.body}"

KUDDUS'S CLAIM:
"${claim}"

Return ONLY JSON: {"status":"TRUE"|"FALSE","confidence":0.0-1.0,"reason":"<one short sentence>"}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini verdict failed: ${res.status}`);
  const data = await res.json();
  return JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}");
}

/** Heuristic verdict for the no-API fallback. */
function heuristicVerdict(claim) {
  const text = claim.toLowerCase();
  const claimsPermission = PERMISSION_MARKERS.some((m) => text.includes(m));
  // The rulebook is a set of prohibitions/guarantees; Kuddus claiming a
  // permission/exemption contradicts it => FALSE.
  return claimsPermission ? "FALSE" : "TRUE";
}

export async function factCheck(claim) {
  const { rows } = await query("SELECT id, section, body, keywords, embedding FROM rulebook");
  // keywords is stored as JSON text in SQLite.
  const rules = rows.map((r) => ({ ...r, keywords: Array.isArray(r.keywords) ? r.keywords : JSON.parse(r.keywords || "[]") }));

  let match;
  let mode;
  if (ragEnabled) {
    try {
      match = await bestRuleSemantic(claim, rules);
      mode = "semantic";
    } catch {
      match = bestRuleKeyword(claim, rules);
      mode = "string-match";
    }
  } else {
    match = bestRuleKeyword(claim, rules);
    mode = "string-match";
  }

  if (!match.rule || match.score <= 0) {
    return {
      status: "UNVERIFIED",
      confidence: 0,
      quote: null,
      section: null,
      mode,
      reason: "No matching rule found in the official rulebook.",
    };
  }

  let status;
  let confidence = Math.min(0.99, Math.max(0.4, match.score));
  let reason;

  if (ragEnabled) {
    try {
      const verdict = await llmVerdict(claim, match.rule);
      status = verdict.status === "TRUE" ? "TRUE" : "FALSE";
      confidence = typeof verdict.confidence === "number" ? verdict.confidence : confidence;
      reason = verdict.reason;
    } catch {
      status = heuristicVerdict(claim);
      reason = "Judged against the closest official rule.";
    }
  } else {
    status = heuristicVerdict(claim);
    reason = "Judged against the closest official rule.";
  }

  return {
    status,
    confidence: Number(confidence.toFixed(2)),
    quote: match.rule.body,
    section: match.rule.section,
    mode,
    reason,
  };
}

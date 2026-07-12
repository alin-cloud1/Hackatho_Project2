import { config, ragEnabled } from "../config.js";
import { query } from "../db.js";
import { CURRICULUM_TOPICS } from "../data/seedData.js";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// ---------------------------------------------------------------------------
// Gemini REST helpers (no SDK dependency — uses built-in fetch).
// ---------------------------------------------------------------------------

export async function embedText(text) {
  const url = `${GEMINI_BASE}/${config.gemini.embedModel}:embedContent?key=${config.gemini.apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${config.gemini.embedModel}`,
      content: { parts: [{ text }] },
    }),
  });
  if (!res.ok) throw new Error(`Gemini embed failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.embedding.values;
}

async function generateJson(prompt) {
  const url = `${GEMINI_BASE}/${config.gemini.genModel}:generateContent?key=${config.gemini.apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini generate failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  return JSON.parse(raw);
}

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

// ---------------------------------------------------------------------------
// Retrieval: pull the curriculum topics most relevant to Kuddus's syllabus
// text (the "official curriculum" context injected into the LLM prompt).
// ---------------------------------------------------------------------------

async function retrieveCurriculumContext(syllabusText, topK = 8) {
  const { rows } = await query("SELECT topic, embedding FROM curriculum_topics WHERE embedding IS NOT NULL");
  if (rows.length === 0) return CURRICULUM_TOPICS.slice(0, topK);

  const queryVec = await embedText(syllabusText);
  return rows
    .map((r) => ({ topic: r.topic, score: cosineSimilarity(queryVec, JSON.parse(r.embedding)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((r) => r.topic);
}

// ---------------------------------------------------------------------------
// Main entry: summarize + filter Kuddus's syllabus, then build a study plan.
// Uses true RAG when a Gemini key is configured, else a local keyword filter.
// ---------------------------------------------------------------------------

export async function summarizeSyllabus(rawText, testDate) {
  if (ragEnabled) {
    try {
      return await ragSummarize(rawText, testDate);
    } catch (err) {
      console.warn("RAG summarize failed, falling back to local filter:", err.message);
    }
  }
  return localSummarize(rawText, testDate);
}

async function ragSummarize(rawText, testDate) {
  const context = await retrieveCurriculumContext(rawText);

  const prompt = `You are a study assistant for a Class 7 student. A tyrannical class captain named Kuddus has announced a bloated, padded syllabus and included non-examinable junk (e.g. "the writer's biography", "the index", "the barcode on the back cover").

OFFICIAL CURRICULUM CONTEXT (retrieved — the ONLY examinable topics):
${context.map((t) => `- ${t}`).join("\n")}

KUDDUS'S RAW SYLLABUS TEXT:
"""${rawText}"""

Cross-reference the raw syllabus against the official curriculum context. Return ONLY valid JSON of the form:
{
  "keptTopics": ["<clean examinable topic titles that match the curriculum>"],
  "filteredOut": ["<the non-examinable junk you removed>"],
  "studyPlan": [
    { "day": 1, "date": "YYYY-MM-DD", "topics": ["..."], "minutes": 80 }
  ]
}
The study plan must distribute keptTopics across the days between today and the test date ${testDate || "(about one week out)"}, front-loaded, roughly 40 minutes per topic. Today is ${new Date().toISOString().slice(0, 10)}.`;

  const result = await generateJson(prompt);
  return {
    mode: "rag",
    keptTopics: Array.isArray(result.keptTopics) ? result.keptTopics : [],
    filteredOut: Array.isArray(result.filteredOut) ? result.filteredOut : [],
    studyPlan: Array.isArray(result.studyPlan) ? result.studyPlan : buildStudyPlan(result.keptTopics || [], testDate),
    retrievedContext: context,
  };
}

// ---------------------------------------------------------------------------
// Local fallback (no API key): word-overlap similarity against the curriculum.
// ---------------------------------------------------------------------------

const STOPWORDS = new Set(["the", "a", "an", "and", "or", "of", "in", "on", "to", "for", "with", "is", "are", "at", "by", "from", "as", "also", "cover", "detail", "entire", "plus", "forget", "dont"]);

function meaningfulWords(text) {
  return new Set(text.toLowerCase().split(/\W+/).filter((w) => w.length > 2 && !STOPWORDS.has(w)));
}

function wordSimilarity(a, b) {
  const wa = meaningfulWords(a);
  const wb = meaningfulWords(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  let overlap = 0;
  for (const w of wa) if (wb.has(w)) overlap++;
  return overlap / (new Set([...wa, ...wb]).size || 1);
}

function localSummarize(rawText, testDate) {
  const candidates = rawText
    .split(/[\n.;,]|(?:\band\b)|(?:\bincluding\b)/gi)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  const kept = [];
  const filteredOut = [];
  for (const candidate of candidates) {
    let best = 0;
    let bestTopic = "";
    for (const topic of CURRICULUM_TOPICS) {
      const score = wordSimilarity(candidate, topic);
      if (score > best) {
        best = score;
        bestTopic = topic;
      }
    }
    if (best >= 0.12) kept.push(bestTopic.replace(/\b\w/g, (c) => c.toUpperCase()));
    else filteredOut.push(candidate);
  }

  const uniqueKept = [...new Set(kept)];
  return {
    mode: "fallback",
    keptTopics: uniqueKept,
    filteredOut,
    studyPlan: buildStudyPlan(uniqueKept, testDate),
  };
}

function buildStudyPlan(topics, testDateStr) {
  if (topics.length === 0) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const testDate = testDateStr ? new Date(testDateStr) : new Date(today.getTime() + 6 * 86400000);
  testDate.setHours(0, 0, 0, 0);

  const dayCount = Math.max(1, Math.round((testDate.getTime() - today.getTime()) / 86400000));
  const topicsPerDay = Math.ceil(topics.length / dayCount);
  const blocks = [];
  for (let day = 0; day < dayCount; day++) {
    const dayTopics = topics.slice(day * topicsPerDay, (day + 1) * topicsPerDay);
    if (dayTopics.length === 0) continue;
    const date = new Date(today.getTime() + day * 86400000);
    blocks.push({ day: day + 1, date: date.toISOString().slice(0, 10), topics: dayTopics, minutes: dayTopics.length * 40 });
  }
  return blocks;
}

export { retrieveCurriculumContext };

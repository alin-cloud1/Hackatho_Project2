import { config, ragEnabled, llmProvider, embeddingsEnabled } from "../config.js";
import { query } from "../db.js";
import { CURRICULUM_TOPICS } from "../data/seedData.js";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 20000;

function withTimeout() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

// ---------------------------------------------------------------------------
// Gemini REST helpers (no SDK dependency — uses built-in fetch).
// Auth is sent via the x-goog-api-key header so the key never lands in URLs/logs.
// ---------------------------------------------------------------------------

async function geminiFetch(path, body) {
  if (!config.gemini.apiKey) throw new Error("GEMINI_API_KEY is not set");
  const t = withTimeout();
  try {
    const res = await fetch(`${GEMINI_BASE}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": config.gemini.apiKey },
      body: JSON.stringify(body),
      signal: t.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Gemini ${res.status} ${res.statusText}: ${detail.slice(0, 300)}`);
    }
    return await res.json();
  } finally {
    t.done();
  }
}

/** Embeddings — Gemini only (Groq has no embeddings endpoint). */
export async function embedText(text) {
  if (!embeddingsEnabled) throw new Error("Embeddings unavailable for this provider");
  const data = await geminiFetch(`${config.gemini.embedModel}:embedContent`, {
    model: `models/${config.gemini.embedModel}`,
    content: { parts: [{ text }] },
  });
  const values = data?.embedding?.values;
  if (!Array.isArray(values)) throw new Error("Gemini embed returned no vector");
  return values;
}

/** Tolerant JSON extraction — handles ```json fences or prose around the object. */
function parseJsonLoose(text) {
  if (!text) throw new Error("LLM returned empty output");
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(t);
  } catch {
    const match = t.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("LLM returned non-JSON output");
  }
}

async function geminiGenerateJson(prompt) {
  const data = await geminiFetch(`${config.gemini.genModel}:generateContent`, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.2, maxOutputTokens: 2048 },
  });
  const finish = data?.candidates?.[0]?.finishReason;
  if (finish && finish !== "STOP" && finish !== "MAX_TOKENS") {
    throw new Error(`Gemini stopped early (${finish})`);
  }
  return parseJsonLoose(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
}

async function groqGenerateJson(prompt) {
  if (!config.groq.apiKey) throw new Error("GROQ_API_KEY is not set");
  const t = withTimeout();
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.groq.apiKey}` },
      body: JSON.stringify({
        model: config.groq.model,
        messages: [
          { role: "system", content: "You are a precise assistant. Respond ONLY with valid JSON — no markdown, no prose." },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 2048,
        response_format: { type: "json_object" },
      }),
      signal: t.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Groq ${res.status} ${res.statusText}: ${detail.slice(0, 300)}`);
    }
    const data = await res.json();
    return parseJsonLoose(data?.choices?.[0]?.message?.content ?? "");
  } finally {
    t.done();
  }
}

/** Provider-agnostic JSON generation. Exported for the fact-checker too. */
export async function generateJson(prompt) {
  if (llmProvider === "groq") return groqGenerateJson(prompt);
  return geminiGenerateJson(prompt);
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

async function retrieveCurriculumContext(syllabusText, topK = 12) {
  const { rows } = await query("SELECT topic, embedding FROM curriculum_topics WHERE embedding IS NOT NULL");

  // No stored embeddings yet (e.g. the key was added AFTER seeding). The
  // curriculum is small, so inject ALL topics as context rather than a weak
  // slice — the LLM still gets the full ground truth to filter against.
  if (rows.length === 0) {
    const all = await query("SELECT topic FROM curriculum_topics");
    return all.rows.length ? all.rows.map((r) => r.topic) : CURRICULUM_TOPICS;
  }

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

  const today = new Date().toISOString().slice(0, 10);
  const prompt = `You are a precise study assistant for a Class 7 student. A tyrannical class captain, Kuddus, announced a padded syllabus mixing real topics with non-examinable junk (front/back matter such as the writer's biography, the index, the barcode, the acknowledgements, the publisher's address, dedication, preface, glossary, ISBN, table of contents, chapter/page ranges like "Chapters 1 to 7").

OFFICIAL CURRICULUM — these are the ONLY examinable topics. You MUST NOT invent topics outside this list, and you MUST copy the titles EXACTLY as written here:
${context.map((t) => `- ${t}`).join("\n")}

KUDDUS'S RAW SYLLABUS TEXT:
"""${rawText}"""

TASK — reason step by step, then output ONLY the JSON:
1. For every official curriculum topic above, decide if Kuddus's text refers to it (allow paraphrases, synonyms, and partial wording). If yes, put the EXACT official title in "keptTopics".
2. Put every piece of Kuddus's text that is padding / non-examinable junk (front or back matter, page/chapter ranges, vague filler) into "filteredOut", quoting his wording.
3. Never place a topic in both lists. Never keep a topic that is not in the official curriculum.
4. Build a "studyPlan" distributing keptTopics across days from today (${today}) up to the test date ${testDate || "(about one week out)"}, front-loaded, ~40 minutes per topic (a day may hold multiple topics; set "minutes" to 40 × topics that day).

Return ONLY valid JSON, no markdown:
{
  "keptTopics": ["<exact official titles>"],
  "filteredOut": ["<Kuddus's junk, quoted>"],
  "studyPlan": [ { "day": 1, "date": "YYYY-MM-DD", "topics": ["<exact official titles>"], "minutes": 40 } ]
}`;

  const result = await generateJson(prompt);

  // Guard against hallucination: keep only titles that actually exist in the
  // retrieved curriculum context (case-insensitive), preserving official casing.
  const canonical = new Map(context.map((t) => [t.toLowerCase().trim(), t]));
  const keptTopics = [...new Set((Array.isArray(result.keptTopics) ? result.keptTopics : [])
    .map((t) => canonical.get(String(t).toLowerCase().trim()))
    .filter(Boolean))];

  const studyPlan = Array.isArray(result.studyPlan) && result.studyPlan.length
    ? result.studyPlan
    : buildStudyPlan(keptTopics, testDate);

  return {
    mode: "rag",
    keptTopics,
    filteredOut: Array.isArray(result.filteredOut) ? result.filteredOut : [],
    studyPlan,
    retrievedContext: context,
  };
}

// ---------------------------------------------------------------------------
// Local fallback (no API key): word-overlap similarity against the curriculum.
// ---------------------------------------------------------------------------

const STOPWORDS = new Set(["the", "a", "an", "and", "or", "of", "in", "on", "to", "for", "with", "is", "are", "at", "by", "from", "as", "also", "cover", "detail", "entire", "plus", "forget", "dont", "study", "chapter", "chapters", "page", "pages", "including", "back", "front", "test", "mark", "marks"]);

// Non-examinable front/back matter Kuddus loves to pad the syllabus with.
const JUNK_PATTERNS = [
  /biograph/i, /\bindex\b/i, /barcode/i, /\bcover\b/i, /acknowledge?ment/i,
  /publisher/i, /dedication/i, /\bpreface\b/i, /appendix/i, /glossary/i,
  /\bisbn\b/i, /foreword/i, /\bblurb\b/i, /table of contents/i,
  /author'?s? note/i, /copyright/i, /\bprice\b/i, /chapters?\s+\d+/i,
];

// Light singular stem so "acids"/"acid", "laws"/"law", "triangles"/"triangle"
// all match — closes the most common plural gap without a real stemmer.
function stem(w) {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y"; // properties -> property
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1); // bases -> base, laws -> law
  return w;
}

function meaningfulWords(text) {
  return new Set(
    text
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
      .map(stem)
  );
}

function titleCase(s) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function isJunk(text) {
  return JUNK_PATTERNS.some((re) => re.test(text));
}

/** Recall of an official topic's words within a text: how much of the topic is present. */
function topicCoverage(topic, textWords) {
  const tw = [...meaningfulWords(topic)];
  if (tw.length === 0) return 0;
  let hit = 0;
  for (const w of tw) if (textWords.has(w)) hit++;
  return hit / tw.length;
}

function mentionsTopic(topic, lowerText, textWords) {
  return lowerText.includes(topic.toLowerCase()) || topicCoverage(topic, textWords) >= 0.6;
}

function localSummarize(rawText, testDate) {
  const lowerText = rawText.toLowerCase();
  const textWords = meaningfulWords(rawText);

  // 1) Keep every official curriculum topic clearly referenced in the text
  //    (exact phrase OR ≥60% of the topic's words present).
  const keptRaw = CURRICULUM_TOPICS.filter((t) => mentionsTopic(t, lowerText, textWords));
  const keptTopics = keptRaw.map(titleCase);

  // Every meaningful word belonging to a kept topic — used so that fragments of
  // a kept topic (e.g. "triangles" from "Geometry: Angles and Triangles") are
  // NOT mislabelled as junk.
  const keptWords = new Set();
  for (const t of keptRaw) for (const w of meaningfulWords(t)) keptWords.add(w);

  // 2) Flag Kuddus's padding: a phrase is junk if it matches a known junk
  //    pattern, or shares no words with any topic we decided to keep.
  const candidates = rawText
    .split(/[\n.;,]|(?:\band\b)|(?:\bincluding\b)/gi)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  const filteredOut = [];
  const seen = new Set();
  for (const c of candidates) {
    const cWords = meaningfulWords(c);
    const overlapsKept = [...cWords].some((w) => keptWords.has(w));
    if (isJunk(c) || !overlapsKept) {
      const key = c.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        filteredOut.push(c);
      }
    }
  }

  return {
    mode: "fallback",
    keptTopics,
    filteredOut,
    studyPlan: buildStudyPlan(keptTopics, testDate),
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

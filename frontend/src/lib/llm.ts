import { CURRICULUM_TOPICS } from "../data/mockData";
import type { StudyBlock, SyllabusResult } from "../types";

// Frontend-only placeholder "AI engine": splits Kuddus's rambling syllabus
// text into candidate topics, then cross-references each against the
// official curriculum topic list (the RAG "context") to filter out garbage
// like "the barcode on the back cover". Swap `summarize()` for a real
// LLM API call (see README) once the backend is wired up — the call
// signature is designed to stay identical.
function splitIntoCandidates(raw: string): string[] {
  return raw
    .split(/[\n.;,]|(?:\band\b)|(?:\bincluding\b)/gi)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "in", "on", "to", "for", "with",
  "is", "are", "at", "by", "from", "as", "also", "cover", "detail",
  "entire", "plus", "forget", "don't",
]);

function meaningfulWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

function similarity(a: string, b: string): number {
  const wordsA = meaningfulWords(a);
  const wordsB = meaningfulWords(b);
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) if (wordsB.has(w)) overlap++;
  const union = new Set([...wordsA, ...wordsB]).size || 1;
  return overlap / union;
}

const RELEVANCE_THRESHOLD = 0.12;

export function summarizeSyllabus(rawText: string, testDate: string): SyllabusResult {
  const candidates = splitIntoCandidates(rawText);
  const kept: string[] = [];
  const filteredOut: string[] = [];

  for (const candidate of candidates) {
    let bestScore = 0;
    let bestTopic = "";
    for (const topic of CURRICULUM_TOPICS) {
      const score = similarity(candidate, topic);
      if (score > bestScore) {
        bestScore = score;
        bestTopic = topic;
      }
    }
    if (bestScore >= RELEVANCE_THRESHOLD) {
      kept.push(bestTopic.replace(/\b\w/g, (c) => c.toUpperCase()));
    } else {
      filteredOut.push(candidate);
    }
  }

  const uniqueKept = Array.from(new Set(kept));
  const studyPlan = buildStudyPlan(uniqueKept, testDate);

  return { keptTopics: uniqueKept, filteredOut, studyPlan };
}

function buildStudyPlan(topics: string[], testDateStr: string): StudyBlock[] {
  if (topics.length === 0) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const testDate = testDateStr ? new Date(testDateStr) : new Date(today.getTime() + 6 * 86400000);
  testDate.setHours(0, 0, 0, 0);

  const dayCount = Math.max(1, Math.round((testDate.getTime() - today.getTime()) / 86400000));
  const blocks: StudyBlock[] = [];
  const topicsPerDay = Math.ceil(topics.length / dayCount);

  for (let day = 0; day < dayCount; day++) {
    const dayTopics = topics.slice(day * topicsPerDay, (day + 1) * topicsPerDay);
    if (dayTopics.length === 0) continue;
    const date = new Date(today.getTime() + day * 86400000);
    blocks.push({
      day: day + 1,
      date: date.toISOString().slice(0, 10),
      topics: dayTopics,
      minutes: dayTopics.length * 40,
    });
  }
  return blocks;
}

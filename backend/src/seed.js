// Seeds roster, rulebook, and curriculum into MongoDB. Used by both the
// `npm run db:seed` script and startup auto-seeding (so a fresh database
// works with zero manual steps).
import { collections } from "./db.js";
import { embeddingsEnabled } from "./config.js";
import { embedText } from "./services/rag.js";
import { ROSTER, RULEBOOK, CURRICULUM_TOPICS } from "./data/seedData.js";

// Precompute embeddings only when the provider supports them (Gemini) and it
// isn't disabled (startup auto-seed skips them for a fast boot — RAG still
// works via full-curriculum context injection).
function embedDuringSeed(withEmbeddings) {
  return withEmbeddings && embeddingsEnabled && process.env.SEED_EMBEDDINGS !== "false";
}

export async function seedStudents() {
  for (const s of ROSTER) {
    await collections.students.updateOne(
      { rollNumber: s.rollNumber },
      { $set: { ...s } },
      { upsert: true }
    );
  }
  console.log(`✓ Seeded ${ROSTER.length} roster entries.`);
}

export async function seedRulebook(withEmbeddings = false) {
  const embed = embedDuringSeed(withEmbeddings);
  for (const r of RULEBOOK) {
    let embedding = null;
    if (embed) {
      try {
        embedding = await embedText(`${r.section}. ${r.body}`);
      } catch (err) {
        console.warn(`  (embedding skipped for ${r.id}: ${err.message})`);
      }
    }
    await collections.rulebook.updateOne(
      { id: r.id },
      { $set: { id: r.id, section: r.section, body: r.body, keywords: r.keywords, embedding } },
      { upsert: true }
    );
  }
  console.log(`✓ Seeded ${RULEBOOK.length} rulebook articles${embed ? " (with embeddings)" : ""}.`);
}

export async function seedCurriculum(withEmbeddings = false) {
  const embed = embedDuringSeed(withEmbeddings);
  await collections.curriculumTopics.deleteMany({});
  for (const topic of CURRICULUM_TOPICS) {
    let embedding = null;
    if (embed) {
      try {
        embedding = await embedText(topic);
      } catch (err) {
        console.warn(`  (embedding skipped for "${topic}": ${err.message})`);
      }
    }
    await collections.curriculumTopics.insertOne({ topic, embedding });
  }
  console.log(`✓ Seeded ${CURRICULUM_TOPICS.length} curriculum topics${embed ? " (with embeddings)" : ""}.`);
}

export async function seedAll({ withEmbeddings = false } = {}) {
  await seedStudents();
  await seedRulebook(withEmbeddings);
  await seedCurriculum(withEmbeddings);
}

/** Seed reference data on startup if the database is empty. */
export async function seedIfEmpty() {
  const hasStudents = await collections.students.countDocuments();
  if (hasStudents > 0) return false;
  console.log("Empty database detected — seeding roster, rulebook, and curriculum…");
  await seedAll({ withEmbeddings: false });
  return true;
}

// Seeds roster, rulebook, and curriculum. If GEMINI_API_KEY is set, also
// precomputes embeddings for rulebook + curriculum (used by semantic search
// and RAG retrieval). Run: npm run db:seed
import { db, query } from "../src/db.js";
import { ragEnabled } from "../src/config.js";
import { embedText } from "../src/services/rag.js";
import { ROSTER, RULEBOOK, CURRICULUM_TOPICS } from "../src/data/seedData.js";

async function seedStudents() {
  for (const s of ROSTER) {
    await query(
      `INSERT INTO students (roll_number, name, height_cm, vision_impaired, hearing_impaired, role, is_kuddus, is_teacher, pin)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (roll_number) DO UPDATE SET
         name=excluded.name, height_cm=excluded.height_cm, vision_impaired=excluded.vision_impaired,
         hearing_impaired=excluded.hearing_impaired, role=excluded.role, is_kuddus=excluded.is_kuddus,
         is_teacher=excluded.is_teacher, pin=excluded.pin`,
      [s.rollNumber, s.name, s.heightCm, s.visionImpaired, s.hearingImpaired, s.role, s.isKuddus, s.isTeacher, s.pin]
    );
  }
  console.log(`✓ Seeded ${ROSTER.length} roster entries.`);
}

async function seedRulebook() {
  for (const r of RULEBOOK) {
    let embedding = null;
    if (ragEnabled) {
      try {
        embedding = await embedText(`${r.section}. ${r.body}`);
      } catch (err) {
        console.warn(`  (embedding skipped for ${r.id}: ${err.message})`);
      }
    }
    await query(
      `INSERT INTO rulebook (id, section, body, keywords, embedding)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO UPDATE SET
         section=excluded.section, body=excluded.body, keywords=excluded.keywords, embedding=excluded.embedding`,
      [r.id, r.section, r.body, JSON.stringify(r.keywords), embedding ? JSON.stringify(embedding) : null]
    );
  }
  console.log(`✓ Seeded ${RULEBOOK.length} rulebook articles${ragEnabled ? " (with embeddings)" : ""}.`);
}

async function seedCurriculum() {
  await query("DELETE FROM curriculum_topics");
  // sqlite_sequence only exists once an AUTOINCREMENT row has been inserted.
  try {
    await query("DELETE FROM sqlite_sequence WHERE name = 'curriculum_topics'");
  } catch {
    // no sequence yet — fine on a fresh database
  }
  for (const topic of CURRICULUM_TOPICS) {
    let embedding = null;
    if (ragEnabled) {
      try {
        embedding = await embedText(topic);
      } catch (err) {
        console.warn(`  (embedding skipped for "${topic}": ${err.message})`);
      }
    }
    await query("INSERT INTO curriculum_topics (topic, embedding) VALUES ($1, $2)", [
      topic,
      embedding ? JSON.stringify(embedding) : null,
    ]);
  }
  console.log(`✓ Seeded ${CURRICULUM_TOPICS.length} curriculum topics${ragEnabled ? " (with embeddings)" : ""}.`);
}

async function main() {
  await seedStudents();
  await seedRulebook();
  await seedCurriculum();
  console.log(ragEnabled ? "Done. RAG embeddings ready." : "Done. (No GEMINI_API_KEY — semantic features use local fallback.)");
  db.close();
}

main().catch((err) => {
  console.error("Seeding failed:", err.message);
  process.exit(1);
});

// Seeds roster, rulebook, and curriculum into MongoDB. If GEMINI_API_KEY is
// set, also precomputes embeddings for rulebook + curriculum (used by
// semantic search and RAG retrieval). Run: npm run db:seed
import { connectDb, closeDb } from "../src/db.js";
import { embeddingsEnabled } from "../src/config.js";
import { seedAll } from "../src/seed.js";

async function main() {
  await connectDb();
  await seedAll({ withEmbeddings: true });
  console.log(
    embeddingsEnabled && process.env.SEED_EMBEDDINGS !== "false"
      ? "Done. RAG embeddings ready."
      : "Done. (LLM RAG uses full-context injection; no local embeddings needed.)"
  );
  await closeDb();
}

main().catch((err) => {
  console.error("Seeding failed:", err.message);
  process.exit(1);
});

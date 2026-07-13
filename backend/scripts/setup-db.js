// Resets the MongoDB database (drops all collections, recreates indexes).
// Run: npm run db:setup
import { connectDb, collections, closeDb } from "../src/db.js";

try {
  await connectDb();
  for (const [name, coll] of Object.entries(collections)) {
    await coll.deleteMany({});
    console.log(`  cleared ${name}`);
  }
  console.log("✓ MongoDB collections reset (indexes in place).");
  await closeDb();
} catch (err) {
  console.error("Database setup failed:", err.message);
  process.exit(1);
}

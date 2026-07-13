// Quick read-only peek at any MongoDB collection's documents.
// Run:        node scripts/view-table.js <collection> [limit]
// Watch mode: node scripts/view-table.js <collection> [limit] --watch [intervalSeconds]
import { connectDb, collections, closeDb } from "../src/db.js";

const args = process.argv.slice(2).filter((a) => a !== "--watch");
const watch = process.argv.includes("--watch");
const name = args[0];
const limit = Number(args[1]) || 20;
const intervalMs = (Number(args[2]) || 3) * 1000;

// Accept both the Mongo collection names and the old snake_case table names.
const ALIASES = {
  students: "students",
  complaints: "complaints",
  seatprofiles: "seatProfiles",
  seat_profiles: "seatProfiles",
  ledgerentries: "ledgerEntries",
  ledger_entries: "ledgerEntries",
  sosalerts: "sosAlerts",
  sos_alerts: "sosAlerts",
  rulebook: "rulebook",
  curriculumtopics: "curriculumTopics",
  curriculum_topics: "curriculumTopics",
};

const collName = name ? ALIASES[name.toLowerCase()] : undefined;
if (!collName) {
  console.error(
    `Usage: node scripts/view-table.js <collection> [limit] [--watch [intervalSeconds]]\n` +
      `Collections: ${[...new Set(Object.values(ALIASES))].join(", ")}`
  );
  process.exit(1);
}

// Newest-first for time-ordered collections.
const sortByCreated = ["complaints", "ledgerEntries", "sosAlerts"].includes(collName);

async function fetchRows() {
  const cursor = collections[collName].find({}, { projection: { _id: 0 } });
  if (sortByCreated) cursor.sort({ createdAt: -1 });
  return cursor.limit(limit).toArray();
}

function printSnapshot(rows) {
  console.clear();
  console.log(`${collName} — ${new Date().toLocaleTimeString()} (${rows.length} doc${rows.length === 1 ? "" : "s"})`);
  console.table(rows);
}

await connectDb();

if (!watch) {
  try {
    printSnapshot(await fetchRows());
  } catch (err) {
    console.error("Query failed:", err.message);
  } finally {
    await closeDb();
  }
} else {
  console.log(`Watching "${collName}" every ${intervalMs / 1000}s — Ctrl+C to stop.`);
  let lastSnapshot = "";
  let stopped = false;

  process.on("SIGINT", async () => {
    stopped = true;
    console.log("\nStopped.");
    await closeDb();
    process.exit(0);
  });

  while (!stopped) {
    try {
      const rows = await fetchRows();
      const snapshot = JSON.stringify(rows);
      if (snapshot !== lastSnapshot) {
        printSnapshot(rows);
        lastSnapshot = snapshot;
      }
    } catch (err) {
      console.error("Query failed:", err.message);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

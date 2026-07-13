// Quick read-only peek at any table's rows.
// Run:        node scripts/view-table.js <table> [limit]
// Watch mode: node scripts/view-table.js <table> [limit] --watch [intervalSeconds]
import { pool } from "../src/db.js";

const args = process.argv.slice(2).filter((a) => a !== "--watch");
const watch = process.argv.includes("--watch");
const table = args[0];
const limit = Number(args[1]) || 20;
const intervalMs = (Number(args[2]) || 3) * 1000;

const ALLOWED = [
  "students",
  "complaints",
  "seat_profiles",
  "ledger_entries",
  "sos_alerts",
  "rulebook",
  "curriculum_topics",
];

if (!table || !ALLOWED.includes(table)) {
  console.error(
    `Usage: node scripts/view-table.js <table> [limit] [--watch [intervalSeconds]]\nTables: ${ALLOWED.join(", ")}`
  );
  process.exit(1);
}

const orderCol = ["complaints", "ledger_entries", "sos_alerts"].includes(table) ? "created_at DESC" : null;
const sql = `SELECT * FROM ${table}${orderCol ? ` ORDER BY ${orderCol}` : ""} LIMIT $1`;

async function fetchRows() {
  const { rows } = await pool.query(sql, [limit]);
  return rows;
}

function printSnapshot(rows) {
  console.clear();
  console.log(`${table} — ${new Date().toLocaleTimeString()} (${rows.length} row${rows.length === 1 ? "" : "s"})`);
  console.table(rows);
}

if (!watch) {
  try {
    printSnapshot(await fetchRows());
  } catch (err) {
    console.error("Query failed:", err.message);
  } finally {
    await pool.end();
  }
} else {
  console.log(`Watching "${table}" every ${intervalMs / 1000}s — Ctrl+C to stop.`);
  let lastSnapshot = "";
  let stopped = false;

  process.on("SIGINT", async () => {
    stopped = true;
    console.log("\nStopped.");
    await pool.end();
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

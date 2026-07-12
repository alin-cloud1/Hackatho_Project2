// Creates the schema (drops + recreates all tables). Run: npm run db:setup
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db, exec } from "../src/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

try {
  const sql = fs.readFileSync(path.join(__dirname, "..", "db", "schema.sql"), "utf8");
  exec(sql);
  console.log("✓ Schema created (tables reset).");
  db.close();
} catch (err) {
  console.error("Schema setup failed:", err.message);
  process.exit(1);
}

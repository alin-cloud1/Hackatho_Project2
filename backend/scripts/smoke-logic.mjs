// DB-independent smoke test of core mission logic (no PostgreSQL required).
import assert from "node:assert";
import { planSeats } from "../src/lib/seatPlanner.js";
import { hashRollNumber } from "../src/lib/crypto.js";
import { summarizeSyllabus } from "../src/services/rag.js";
import { ROSTER } from "../src/data/seedData.js";

let passed = 0;
const ok = (name) => { console.log(`  ✓ ${name}`); passed++; };

// --- M2 seat planner ---
const seatable = ROSTER.filter((s) => !s.isTeacher);
const plan = planSeats(seatable, 5, 5, new Set([2]));
const kuddus = seatable.find((s) => s.isKuddus);
assert.ok(plan.kuddusSeat, "Kuddus seated");
// Everyone in front of Kuddus in his column must be shorter than him.
for (let r = 0; r < plan.kuddusSeat.row; r++) {
  const st = plan.grid[r][plan.kuddusCol].student;
  if (st) assert.ok(st.heightCm < kuddus.heightCm, `front-of-Kuddus ${st.name} shorter`);
}
ok("only shorter students sit in front of Kuddus");
assert.strictEqual(plan.lineOfSightClear, true);
ok("line of sight to Kuddus is clear");
// No impaired student sits in Kuddus's column.
for (let r = 0; r < 5; r++) {
  const st = plan.grid[r][plan.kuddusCol].student;
  if (st) assert.ok(!(st.visionImpaired || st.hearingImpaired), "no impaired in Kuddus column");
}
ok("no vision/hearing-impaired student in Kuddus's column");

// --- M1 anonymity hash ---
const h1 = hashRollNumber("07");
const h2 = hashRollNumber("07");
const h3 = hashRollNumber("08");
assert.strictEqual(h1, h2, "hash deterministic");
assert.notStrictEqual(h1, h3, "different rolls differ");
assert.strictEqual(h1.length, 16, "16 hex chars");
assert.ok(!h1.includes("07"), "raw roll not present");
ok("roll-number hashing is deterministic + non-reversible");

// --- M3 syllabus local RAG fallback ---
const syl = await summarizeSyllabus(
  "Read Chapter 1 photosynthesis and the water cycle, plus the barcode on the back cover and the writer's biography.",
  ""
);
assert.ok(syl.keptTopics.length > 0, "kept some topics");
assert.ok(syl.filteredOut.some((f) => /barcode|biography/i.test(f)), "filtered the junk");
ok(`syllabus filter kept [${syl.keptTopics.join(", ")}], dropped junk (mode: ${syl.mode})`);

console.log(`\n${passed} logic checks passed ✅`);
process.exit(0);

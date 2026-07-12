import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { planSeats } from "../lib/seatPlanner.js";

const router = Router();

// Build the effective roster: base roster merged with any student-entered
// seat profiles, excluding the teacher (who has no desk).
async function effectiveRoster() {
  const { rows } = await query(`
    SELECT s.roll_number, s.name, s.is_kuddus, s.is_teacher,
           COALESCE(p.height_cm, s.height_cm)               AS height_cm,
           COALESCE(p.vision_impaired, s.vision_impaired)   AS vision_impaired,
           COALESCE(p.hearing_impaired, s.hearing_impaired) AS hearing_impaired
    FROM students s
    LEFT JOIN seat_profiles p ON p.roll_number = s.roll_number
    WHERE s.is_teacher = FALSE
    ORDER BY s.roll_number
  `);
  return rows.map((r) => ({
    rollNumber: r.roll_number,
    name: r.name,
    heightCm: r.height_cm,
    visionImpaired: Boolean(r.vision_impaired),
    hearingImpaired: Boolean(r.hearing_impaired),
    isKuddus: Boolean(r.is_kuddus),
  }));
}

// GET /api/seating/plan?rows=5&cols=5&aisle=2
router.get("/plan", requireAuth, async (req, res, next) => {
  try {
    const rows = Math.min(8, Math.max(3, Number(req.query.rows) || 5));
    const cols = Math.min(6, Math.max(3, Number(req.query.cols) || 5));
    const aisle = req.query.aisle != null ? Number(req.query.aisle) : -1;
    const aisleCols = new Set();
    if (aisle >= 0 && aisle < cols) aisleCols.add(aisle);

    const roster = await effectiveRoster();
    const plan = planSeats(roster, rows, cols, aisleCols);
    return res.json(plan);
  } catch (err) {
    next(err);
  }
});

// GET /api/seating/profile — the caller's own saved seat attributes.
router.get("/profile", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query("SELECT * FROM seat_profiles WHERE roll_number = $1", [req.user.rollNumber]);
    if (!rows[0]) return res.json({ profile: null });
    const p = rows[0];
    return res.json({
      profile: { heightCm: p.height_cm, visionImpaired: Boolean(p.vision_impaired), hearingImpaired: Boolean(p.hearing_impaired) },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/seating/profile — student sets ONLY their own height/vision/hearing.
router.put("/profile", requireAuth, async (req, res, next) => {
  try {
    if (req.user.isTeacher) return res.status(403).json({ error: "The teacher has no classroom seat." });
    const { heightCm, visionImpaired = false, hearingImpaired = false } = req.body ?? {};
    const h = Number(heightCm);
    if (!Number.isFinite(h) || h < 100 || h > 210) return res.status(400).json({ error: "Height must be 100–210 cm." });

    await query(
      `INSERT INTO seat_profiles (roll_number, height_cm, vision_impaired, hearing_impaired, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (roll_number)
       DO UPDATE SET height_cm = excluded.height_cm,
                     vision_impaired = excluded.vision_impaired,
                     hearing_impaired = excluded.hearing_impaired,
                     updated_at = excluded.updated_at`,
      [req.user.rollNumber, Math.round(h), Boolean(visionImpaired), Boolean(hearingImpaired), Date.now()]
    );
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;

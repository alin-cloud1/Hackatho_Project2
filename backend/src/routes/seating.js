import { Router } from "express";
import { collections } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { planSeats } from "../lib/seatPlanner.js";

const router = Router();

// Build the effective roster: base roster merged with any student-entered
// seat profiles, excluding the teacher (who has no desk).
async function effectiveRoster() {
  const students = await collections.students.find({ isTeacher: { $ne: true } }).sort({ rollNumber: 1 }).toArray();
  const profiles = await collections.seatProfiles.find().toArray();
  const byRoll = new Map(profiles.map((p) => [p.rollNumber, p]));

  return students.map((s) => {
    const p = byRoll.get(s.rollNumber);
    return {
      rollNumber: s.rollNumber,
      name: s.name,
      heightCm: p?.heightCm ?? s.heightCm,
      visionImpaired: Boolean(p ? p.visionImpaired : s.visionImpaired),
      hearingImpaired: Boolean(p ? p.hearingImpaired : s.hearingImpaired),
      isKuddus: Boolean(s.isKuddus),
    };
  });
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
    const p = await collections.seatProfiles.findOne({ rollNumber: req.user.rollNumber });
    if (!p) return res.json({ profile: null });
    return res.json({
      profile: { heightCm: p.heightCm, visionImpaired: Boolean(p.visionImpaired), hearingImpaired: Boolean(p.hearingImpaired) },
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

    await collections.seatProfiles.updateOne(
      { rollNumber: req.user.rollNumber },
      {
        $set: {
          heightCm: Math.round(h),
          visionImpaired: Boolean(visionImpaired),
          hearingImpaired: Boolean(hearingImpaired),
          updatedAt: Date.now(),
        },
      },
      { upsert: true }
    );
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;

import { Router } from "express";
import { query } from "../db.js";
import { signToken, requireAuth } from "../middleware/auth.js";

const router = Router();

function rowToStudent(row) {
  return {
    rollNumber: row.roll_number,
    name: row.name,
    heightCm: row.height_cm,
    visionImpaired: Boolean(row.vision_impaired),
    hearingImpaired: Boolean(row.hearing_impaired),
    role: row.role,
    isKuddus: Boolean(row.is_kuddus),
    isTeacher: Boolean(row.is_teacher),
  };
}

// POST /api/auth/login  { rollNumber, pin }
router.post("/login", async (req, res, next) => {
  try {
    const { rollNumber, pin } = req.body ?? {};
    if (!rollNumber || !pin) return res.status(400).json({ error: "Roll number and PIN are required." });

    const { rows } = await query("SELECT * FROM students WHERE roll_number = $1", [String(rollNumber).trim()]);
    const row = rows[0];
    if (!row) return res.status(401).json({ error: "Roll number not recognized." });

    // Kuddus's access is revoked (no role / no pin).
    if (row.is_kuddus || !row.role || !row.pin) {
      return res.status(403).json({ error: "This account has been revoked. Access denied by class decree." });
    }
    if (row.pin !== String(pin).trim()) return res.status(401).json({ error: "Incorrect secret PIN." });

    const student = rowToStudent(row);
    return res.json({ token: signToken(student), student });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query("SELECT * FROM students WHERE roll_number = $1", [req.user.rollNumber]);
    if (!rows[0]) return res.status(404).json({ error: "Student not found." });
    return res.json({ student: rowToStudent(rows[0]) });
  } catch (err) {
    next(err);
  }
});

export default router;

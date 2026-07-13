import { Router } from "express";
import { collections } from "../db.js";
import { signToken, requireAuth } from "../middleware/auth.js";

const router = Router();

function docToStudent(doc) {
  return {
    rollNumber: doc.rollNumber,
    name: doc.name,
    heightCm: doc.heightCm,
    visionImpaired: Boolean(doc.visionImpaired),
    hearingImpaired: Boolean(doc.hearingImpaired),
    role: doc.role,
    isKuddus: Boolean(doc.isKuddus),
    isTeacher: Boolean(doc.isTeacher),
  };
}

// POST /api/auth/login  { rollNumber, pin }
router.post("/login", async (req, res, next) => {
  try {
    const { rollNumber, pin } = req.body ?? {};
    if (!rollNumber || !pin) return res.status(400).json({ error: "Roll number and PIN are required." });

    const doc = await collections.students.findOne({ rollNumber: String(rollNumber).trim() });
    if (!doc) return res.status(401).json({ error: "Roll number not recognized." });

    // Kuddus's access is revoked (no role / no pin).
    if (doc.isKuddus || !doc.role || !doc.pin) {
      return res.status(403).json({ error: "This account has been revoked. Access denied by class decree." });
    }
    if (doc.pin !== String(pin).trim()) return res.status(401).json({ error: "Incorrect secret PIN." });

    const student = docToStudent(doc);
    return res.json({ token: signToken(student), student });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const doc = await collections.students.findOne({ rollNumber: req.user.rollNumber });
    if (!doc) return res.status(404).json({ error: "Student not found." });
    return res.json({ student: docToStudent(doc) });
  } catch (err) {
    next(err);
  }
});

export default router;

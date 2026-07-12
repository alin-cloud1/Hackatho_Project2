import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { summarizeSyllabus } from "../services/rag.js";

const router = Router();

// POST /api/syllabus/summarize  { text, testDate }
// Student self-service tool: RAG-filter Kuddus's syllabus + build a study plan.
router.post("/summarize", requireAuth, requireRole("student"), async (req, res, next) => {
  try {
    const { text, testDate } = req.body ?? {};
    if (!text || !text.trim()) return res.status(400).json({ error: "Paste Kuddus's syllabus text first." });
    const result = await summarizeSyllabus(text.trim(), testDate || "");
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;

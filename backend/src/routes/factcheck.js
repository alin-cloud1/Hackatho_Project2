import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { factCheck } from "../services/factcheck.js";

const router = Router();

// POST /api/factcheck  { claim }
// Student tool: debunk Kuddus's fabricated rules with a validation card.
router.post("/", requireAuth, requireRole("student"), async (req, res, next) => {
  try {
    const { claim } = req.body ?? {};
    if (!claim || !claim.trim()) return res.status(400).json({ error: "Type a claim to check." });
    const result = await factCheck(claim.trim());
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;

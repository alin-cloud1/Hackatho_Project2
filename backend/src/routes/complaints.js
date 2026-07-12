import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { hashRollNumber } from "../lib/crypto.js";

const router = Router();

const CATEGORIES = ["Tiffin Theft", "Washroom Bribe", "Syllabus Bloat", "Sports Veto", "Human Shield Seating", "Other"];

function rowToComplaint(row) {
  return {
    id: row.id,
    category: row.category,
    description: row.description,
    submitterHash: row.submitter_hash,
    hasPhoto: Boolean(row.has_photo),
    photoStrippedMeta: Boolean(row.photo_stripped_meta),
    timestamp: row.created_at,
  };
}

// GET /api/complaints
// Admins see every complaint; students see only their own (matched by hash).
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const strikeRes = await query("SELECT COUNT(*) AS n FROM complaints");
    const totalComplaints = strikeRes.rows[0].n;
    const strikeCount = Math.min(3, totalComplaints);

    if (req.user.role === "admin") {
      const { rows } = await query("SELECT * FROM complaints ORDER BY created_at DESC");
      return res.json({ complaints: rows.map(rowToComplaint), strikeCount, totalComplaints });
    }

    const myHash = hashRollNumber(req.user.rollNumber);
    const { rows } = await query(
      "SELECT * FROM complaints WHERE submitter_hash = $1 ORDER BY created_at DESC",
      [myHash]
    );
    // Students never receive the class-wide total or strike count.
    return res.json({ complaints: rows.map(rowToComplaint) });
  } catch (err) {
    next(err);
  }
});

// POST /api/complaints  { category, description, hasPhoto, photoStrippedMeta }
// Students only — admins may not file complaints.
router.post("/", requireAuth, requireRole("student"), async (req, res, next) => {
  try {
    const { category, description, hasPhoto = false, photoStrippedMeta = false } = req.body ?? {};
    if (!category || !CATEGORIES.includes(category)) return res.status(400).json({ error: "Invalid category." });
    if (!description || !description.trim()) return res.status(400).json({ error: "Description is required." });

    const submitterHash = hashRollNumber(req.user.rollNumber);
    const { rows } = await query(
      `INSERT INTO complaints (id, category, description, submitter_hash, has_photo, photo_stripped_meta, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [crypto.randomUUID(), category, description.trim(), submitterHash, Boolean(hasPhoto), Boolean(photoStrippedMeta), Date.now()]
    );
    return res.status(201).json({ complaint: rowToComplaint(rows[0]) });
  } catch (err) {
    next(err);
  }
});

export default router;

import { Router } from "express";
import { collections } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { hashRollNumber } from "../lib/crypto.js";

const router = Router();

const CATEGORIES = ["Tiffin Theft", "Washroom Bribe", "Syllabus Bloat", "Sports Veto", "Human Shield Seating", "Other"];

function docToComplaint(doc) {
  return {
    id: doc.id,
    category: doc.category,
    description: doc.description,
    submitterHash: doc.submitterHash,
    hasPhoto: Boolean(doc.hasPhoto),
    photoStrippedMeta: Boolean(doc.photoStrippedMeta),
    timestamp: doc.createdAt,
  };
}

// GET /api/complaints
// Admins see every complaint; students see only their own (matched by hash).
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const totalComplaints = await collections.complaints.countDocuments();
    const strikeCount = Math.min(3, totalComplaints);

    if (req.user.role === "admin") {
      const docs = await collections.complaints.find().sort({ createdAt: -1 }).toArray();
      return res.json({ complaints: docs.map(docToComplaint), strikeCount, totalComplaints });
    }

    const myHash = hashRollNumber(req.user.rollNumber);
    const docs = await collections.complaints.find({ submitterHash: myHash }).sort({ createdAt: -1 }).toArray();
    // Students never receive the class-wide total or strike count.
    return res.json({ complaints: docs.map(docToComplaint) });
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

    const complaint = {
      id: crypto.randomUUID(),
      category,
      description: description.trim(),
      submitterHash: hashRollNumber(req.user.rollNumber),
      hasPhoto: Boolean(hasPhoto),
      photoStrippedMeta: Boolean(photoStrippedMeta),
      createdAt: Date.now(),
    };
    await collections.complaints.insertOne({ ...complaint });
    return res.status(201).json({ complaint: docToComplaint(complaint) });
  } catch (err) {
    next(err);
  }
});

export default router;

import { Router } from "express";
import { collections } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { broadcast } from "../realtime.js";

const router = Router();

const LOCATIONS = ["Library", "Playground", "Corridor", "Classroom", "Canteen"];

function docToAlert(doc) {
  return {
    id: doc.id,
    location: doc.location,
    status: doc.status,
    timestamp: doc.createdAt,
  };
}

// GET /api/sos — all alerts (admins monitor; the dashboard reads this too).
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const docs = await collections.sosAlerts.find().sort({ createdAt: -1 }).toArray();
    return res.json({ alerts: docs.map(docToAlert) });
  } catch (err) {
    next(err);
  }
});

// POST /api/sos — students only. Raises a distress signal + broadcasts to admins.
router.post("/", requireAuth, requireRole("student"), async (req, res, next) => {
  try {
    const { location, status } = req.body ?? {};
    if (!location || !LOCATIONS.includes(location)) return res.status(400).json({ error: "Pick a valid location." });
    const alertDoc = {
      id: crypto.randomUUID(),
      location,
      status: status === "queued" ? "queued" : "sent",
      createdAt: Date.now(),
    };
    await collections.sosAlerts.insertOne({ ...alertDoc });
    const alert = docToAlert(alertDoc);
    broadcast({ type: "sos:new", alert }); // real-time push to connected admins
    return res.status(201).json({ alert });
  } catch (err) {
    next(err);
  }
});

// POST /api/sos/:id/ack — admins acknowledge an alert.
router.post("/:id/ack", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const doc = await collections.sosAlerts.findOneAndUpdate(
      { id: req.params.id },
      { $set: { status: "acknowledged" } },
      { returnDocument: "after" }
    );
    if (!doc) return res.status(404).json({ error: "Alert not found." });
    const alert = docToAlert(doc);
    broadcast({ type: "sos:update", alert });
    return res.json({ alert });
  } catch (err) {
    next(err);
  }
});

export default router;

import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { broadcast } from "../realtime.js";

const router = Router();

const LOCATIONS = ["Library", "Playground", "Corridor", "Classroom", "Canteen"];

function rowToAlert(row) {
  return {
    id: row.id,
    location: row.location,
    status: row.status,
    timestamp: row.created_at,
  };
}

// GET /api/sos — all alerts (admins monitor; the dashboard reads this too).
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query("SELECT * FROM sos_alerts ORDER BY created_at DESC");
    return res.json({ alerts: rows.map(rowToAlert) });
  } catch (err) {
    next(err);
  }
});

// POST /api/sos — students only. Raises a distress signal + broadcasts to admins.
router.post("/", requireAuth, requireRole("student"), async (req, res, next) => {
  try {
    const { location, status } = req.body ?? {};
    if (!location || !LOCATIONS.includes(location)) return res.status(400).json({ error: "Pick a valid location." });
    const initialStatus = status === "queued" ? "queued" : "sent";
    const { rows } = await query(
      "INSERT INTO sos_alerts (id, location, status, created_at) VALUES ($1, $2, $3, $4) RETURNING *",
      [crypto.randomUUID(), location, initialStatus, Date.now()]
    );
    const alert = rowToAlert(rows[0]);
    broadcast({ type: "sos:new", alert }); // real-time push to connected admins
    return res.status(201).json({ alert });
  } catch (err) {
    next(err);
  }
});

// POST /api/sos/:id/ack — admins acknowledge an alert.
router.post("/:id/ack", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { rows } = await query(
      "UPDATE sos_alerts SET status = 'acknowledged' WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Alert not found." });
    const alert = rowToAlert(rows[0]);
    broadcast({ type: "sos:update", alert });
    return res.json({ alert });
  } catch (err) {
    next(err);
  }
});

export default router;

import { Router } from "express";
import { query } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { CALORIE_TABLE, CRICKET_BAT_PRICE_TAKA, JHALMURI_PACKET_PRICE_TAKA } from "../data/seedData.js";

const router = Router();

function rowToEntry(row) {
  return {
    id: row.id,
    kind: row.kind,
    label: row.label,
    amountTaka: row.amount_taka,
    calories: row.calories,
    timestamp: row.created_at,
  };
}

async function computeTotals() {
  const { rows } = await query(`
    SELECT
      COALESCE(SUM(amount_taka), 0)                              AS total_cash,
      COALESCE(SUM(calories), 0)                                 AS total_calories,
      COALESCE(SUM(CASE WHEN kind = 'food' THEN 1 ELSE 0 END), 0) AS food_count,
      COUNT(*)                                                   AS entry_count
    FROM ledger_entries
  `);
  const t = rows[0];
  return {
    totalCash: t.total_cash,
    totalCalories: t.total_calories,
    foodCount: t.food_count,
    entryCount: t.entry_count,
    cricketBats: Number((t.total_cash / CRICKET_BAT_PRICE_TAKA).toFixed(2)),
    jhalmuriPackets: Number((t.total_cash / JHALMURI_PACKET_PRICE_TAKA).toFixed(2)),
  };
}

// GET /api/ledger — entries + aggregate totals (dashboard reads the totals).
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query("SELECT * FROM ledger_entries ORDER BY created_at DESC");
    return res.json({ entries: rows.map(rowToEntry), totals: await computeTotals() });
  } catch (err) {
    next(err);
  }
});

// POST /api/ledger — students log a forced payment (with amount) or stolen food.
router.post("/", requireAuth, requireRole("student"), async (req, res, next) => {
  try {
    const { kind } = req.body ?? {};
    if (kind === "toll") {
      const taka = Number(req.body.amountTaka);
      if (!Number.isFinite(taka) || taka <= 0) return res.status(400).json({ error: "Enter the amount of money taken (Tk)." });
      const amount = Math.round(taka);
      const { rows } = await query(
        `INSERT INTO ledger_entries (id, kind, label, amount_taka, calories, created_at) VALUES ($1, 'toll', $2, $3, 0, $4) RETURNING *`,
        [crypto.randomUUID(), `Cash Extorted (${amount} Tk)`, amount, Date.now()]
      );
      return res.status(201).json({ entry: rowToEntry(rows[0]), totals: await computeTotals() });
    }
    if (kind === "food") {
      const item = req.body.foodItem;
      if (!item || !(item in CALORIE_TABLE)) return res.status(400).json({ error: "Unknown food item." });
      const { rows } = await query(
        `INSERT INTO ledger_entries (id, kind, label, amount_taka, calories, created_at) VALUES ($1, 'food', $2, 0, $3, $4) RETURNING *`,
        [crypto.randomUUID(), item, CALORIE_TABLE[item], Date.now()]
      );
      return res.status(201).json({ entry: rowToEntry(rows[0]), totals: await computeTotals() });
    }
    return res.status(400).json({ error: "kind must be 'toll' or 'food'." });
  } catch (err) {
    next(err);
  }
});

export default router;

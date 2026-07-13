import { Router } from "express";
import { collections } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { CALORIE_TABLE, CRICKET_BAT_PRICE_TAKA, JHALMURI_PACKET_PRICE_TAKA } from "../data/seedData.js";

const router = Router();

function docToEntry(doc) {
  return {
    id: doc.id,
    kind: doc.kind,
    label: doc.label,
    amountTaka: doc.amountTaka,
    calories: doc.calories,
    timestamp: doc.createdAt,
  };
}

async function computeTotals() {
  const [t] = await collections.ledgerEntries
    .aggregate([
      {
        $group: {
          _id: null,
          totalCash: { $sum: "$amountTaka" },
          totalCalories: { $sum: "$calories" },
          foodCount: { $sum: { $cond: [{ $eq: ["$kind", "food"] }, 1, 0] } },
          entryCount: { $sum: 1 },
        },
      },
    ])
    .toArray();
  const totalCash = t?.totalCash ?? 0;
  return {
    totalCash,
    totalCalories: t?.totalCalories ?? 0,
    foodCount: t?.foodCount ?? 0,
    entryCount: t?.entryCount ?? 0,
    cricketBats: Number((totalCash / CRICKET_BAT_PRICE_TAKA).toFixed(2)),
    jhalmuriPackets: Number((totalCash / JHALMURI_PACKET_PRICE_TAKA).toFixed(2)),
  };
}

// GET /api/ledger — entries + aggregate totals (dashboard reads the totals).
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const docs = await collections.ledgerEntries.find().sort({ createdAt: -1 }).toArray();
    return res.json({ entries: docs.map(docToEntry), totals: await computeTotals() });
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
      const entry = {
        id: crypto.randomUUID(),
        kind: "toll",
        label: `Cash Extorted (${amount} Tk)`,
        amountTaka: amount,
        calories: 0,
        createdAt: Date.now(),
      };
      await collections.ledgerEntries.insertOne({ ...entry });
      return res.status(201).json({ entry: docToEntry(entry), totals: await computeTotals() });
    }
    if (kind === "food") {
      const item = req.body.foodItem;
      if (!item || !(item in CALORIE_TABLE)) return res.status(400).json({ error: "Unknown food item." });
      const entry = {
        id: crypto.randomUUID(),
        kind: "food",
        label: item,
        amountTaka: 0,
        calories: CALORIE_TABLE[item],
        createdAt: Date.now(),
      };
      await collections.ledgerEntries.insertOne({ ...entry });
      return res.status(201).json({ entry: docToEntry(entry), totals: await computeTotals() });
    }
    return res.status(400).json({ error: "kind must be 'toll' or 'food'." });
  } catch (err) {
    next(err);
  }
});

export default router;

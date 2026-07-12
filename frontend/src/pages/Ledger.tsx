import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Coins, Flame, PlusCircle, Zap } from "lucide-react";
import { useAppState } from "../state/AppStateContext";
import { CALORIE_TABLE, CRICKET_BAT_PRICE_TAKA, JHALMURI_PACKET_PRICE_TAKA } from "../data/mockData";
import type { LedgerEntry } from "../types";
import { Badge, Button, Card, Field, PageHeader, inputClass } from "../components/ui";

export function Ledger() {
  const { ledger, addLedgerEntry } = useAppState();
  const [kind, setKind] = useState<"toll" | "food">("toll");
  const [foodItem, setFoodItem] = useState(Object.keys(CALORIE_TABLE)[0]);

  const totalCash = ledger.filter((e) => e.kind === "toll").reduce((s, e) => s + e.amountTaka, 0);
  const totalCalories = ledger.filter((e) => e.kind === "food").reduce((s, e) => s + e.calories, 0);
  const foodCount = ledger.filter((e) => e.kind === "food").length;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const entry: LedgerEntry =
      kind === "toll"
        ? {
            id: crypto.randomUUID(),
            kind: "toll",
            label: "Washroom Toll",
            amountTaka: 2,
            calories: 0,
            timestamp: Date.now(),
          }
        : {
            id: crypto.randomUUID(),
            kind: "food",
            label: foodItem,
            amountTaka: 0,
            calories: CALORIE_TABLE[foodItem],
            timestamp: Date.now(),
          };
    addLedgerEntry(entry);
  };

  const chartData = useMemo(() => {
    const sorted = [...ledger].sort((a, b) => a.timestamp - b.timestamp);
    let runningCash = 0;
    return sorted.map((e, i) => {
      if (e.kind === "toll") runningCash += e.amountTaka;
      return {
        idx: i + 1,
        cash: runningCash,
        label: new Date(e.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
    });
  }, [ledger]);

  const foodBarData = useMemo(() => {
    const counts: Record<string, number> = {};
    ledger.filter((e) => e.kind === "food").forEach((e) => {
      counts[e.label] = (counts[e.label] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [ledger]);

  const kineticExpenditure = 0; // Kuddus's indoor Ludu lifestyle, modeled mathematically as zero
  const caloricDisparity = totalCalories - kineticExpenditure;
  const cricketBats = totalCash / CRICKET_BAT_PRICE_TAKA;
  const jhalmuriPackets = totalCash / JHALMURI_PACKET_PRICE_TAKA;

  return (
    <div>
      <PageHeader
        eyebrow="Mission 4"
        title="Corrupt Economy & Tiffin Ledger"
        description="Track the illicit cash and caloric wealth Kuddus is hoarding through the washroom toll and tiffin extortion."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard icon={Coins} label="Cash Extorted" value={`${totalCash} Tk`} tone="text-alert-400" />
            <StatCard icon={Flame} label="Tiffins Stolen" value={foodCount} tone="text-signal-400" />
            <StatCard icon={Zap} label="Calories Hoarded" value={totalCalories} tone="text-electric-400" />
            <StatCard icon={Coins} label="Entries Logged" value={ledger.length} tone="text-mint-400" />
          </div>

          <Card className="p-6">
            <h3 className="mb-4 font-display text-sm font-bold text-ink-100">
              Cumulative Extorted Cash Over Time
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffb020" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#ffb020" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1d2436" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#8b97c2" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#8b97c2" }} />
                  <Tooltip
                    contentStyle={{
                      background: "#151a28",
                      border: "1px solid #2a3350",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="cash" stroke="#ffb020" fill="url(#cashGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 font-display text-sm font-bold text-ink-100">Stolen Food Breakdown</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={foodBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1d2436" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#8b97c2" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#8b97c2" }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#151a28",
                      border: "1px solid #2a3350",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="#ff4d4f" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-2 flex items-center gap-2">
              <Flame className="h-4 w-4 text-signal-400" />
              <h3 className="font-display text-sm font-bold text-ink-100">
                Caloric vs. Kinetic Disparity Engine
              </h3>
            </div>
            <p className="mb-4 text-xs text-ink-400">
              Estimated caloric intake from the stolen food ledger versus active energy
              expenditure, modeled mathematically as zero due to his indoor Ludu lifestyle.
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-ink-900/60 p-3">
                <p className="text-[10px] uppercase text-ink-500">Intake</p>
                <p className="font-display text-lg font-bold text-signal-400">{totalCalories} kcal</p>
              </div>
              <div className="rounded-xl bg-ink-900/60 p-3">
                <p className="text-[10px] uppercase text-ink-500">Expenditure</p>
                <p className="font-display text-lg font-bold text-ink-400">{kineticExpenditure} kcal</p>
              </div>
              <div className="rounded-xl bg-signal-500/10 p-3 border border-signal-500/20">
                <p className="text-[10px] uppercase text-ink-500">Net Disparity</p>
                <p className="font-display text-lg font-bold text-signal-400">+{caloricDisparity} kcal</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-4 font-display text-sm font-bold text-ink-100">Log an Entry</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Type">
                <select
                  className={inputClass}
                  value={kind}
                  onChange={(e) => setKind(e.target.value as "toll" | "food")}
                >
                  <option value="toll">Washroom Toll (2 Tk)</option>
                  <option value="food">Stolen Tiffin Item</option>
                </select>
              </Field>
              {kind === "food" && (
                <Field label="Item">
                  <select className={inputClass} value={foodItem} onChange={(e) => setFoodItem(e.target.value)}>
                    {Object.keys(CALORIE_TABLE).map((item) => (
                      <option key={item} value={item}>
                        {item} ({CALORIE_TABLE[item]} kcal)
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Button type="submit" className="w-full">
                <PlusCircle className="h-4 w-4" /> Log Anonymously
              </Button>
            </form>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 font-display text-sm font-bold text-ink-100">
              Projected Weaponry Conversion
            </h3>
            <p className="mb-4 text-xs text-ink-400">
              Real-time conversion of extorted cash into relatable metrics.
            </p>
            <div className="space-y-3">
              <ConversionRow label="Cricket bats" value={cricketBats} unit={`@ ${CRICKET_BAT_PRICE_TAKA} Tk`} />
              <ConversionRow
                label="Jhalmuri packets"
                value={jhalmuriPackets}
                unit={`@ ${JHALMURI_PACKET_PRICE_TAKA} Tk`}
              />
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-3 font-display text-sm font-bold text-ink-100">Recent Entries</h3>
            <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
              {ledger.slice(0, 12).map((e) => (
                <div key={e.id} className="flex items-center justify-between text-xs">
                  <Badge tone={e.kind === "toll" ? "warning" : "danger"}>{e.label}</Badge>
                  <span className="text-ink-500">{new Date(e.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
              {ledger.length === 0 && <p className="text-xs text-ink-500">No entries yet.</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Coins;
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <Card className="p-4">
      <Icon className={`mb-2 h-4 w-4 ${tone}`} />
      <p className="font-display text-lg font-bold text-ink-100">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-ink-500">{label}</p>
    </Card>
  );
}

function ConversionRow({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-ink-300">{label}</span>
        <span className="font-display font-bold text-ink-100">{value.toFixed(2)}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-900">
        <div
          className="h-full rounded-full bg-gradient-to-r from-electric-500 to-mint-500"
          style={{ width: `${Math.min(100, value * 10)}%` }}
        />
      </div>
      <span className="text-[10px] text-ink-500">{unit}</span>
    </div>
  );
}

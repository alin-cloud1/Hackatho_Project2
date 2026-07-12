import { Link } from "react-router-dom";
import {
  MessageSquareWarning,
  Grid3x3,
  BookOpenText,
  Coins,
  Siren,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import { useAppState } from "../state/AppStateContext";
import { StrikeMeter } from "../components/StrikeMeter";
import { Card, PageHeader } from "../components/ui";

const MISSIONS = [
  {
    to: "/whistleblower",
    title: "Whistleblower Portal",
    desc: "File anonymous, cryptographically-masked complaints.",
    icon: MessageSquareWarning,
    tone: "text-signal-400 bg-signal-500/10 border-signal-500/20",
  },
  {
    to: "/seating",
    title: "Seat Planner",
    desc: "Line-of-sight optimized classroom grid.",
    icon: Grid3x3,
    tone: "text-electric-400 bg-electric-500/10 border-electric-500/20",
  },
  {
    to: "/syllabus",
    title: "Syllabus Negotiator",
    desc: "RAG-filtered summaries + JSON study plans.",
    icon: BookOpenText,
    tone: "text-mint-400 bg-mint-500/10 border-mint-500/20",
  },
  {
    to: "/ledger",
    title: "Corrupt Economy Ledger",
    desc: "Track extorted cash and stolen tiffins.",
    icon: Coins,
    tone: "text-alert-400 bg-alert-500/10 border-alert-500/20",
  },
  {
    to: "/sos",
    title: "SOS Rescue Flare",
    desc: "Real-time distress broadcast to captains.",
    icon: Siren,
    tone: "text-signal-400 bg-signal-500/10 border-signal-500/20",
  },
  {
    to: "/fact-check",
    title: "Fact-Checker",
    desc: "Debunk Kuddus's fabricated rules instantly.",
    icon: ShieldCheck,
    tone: "text-electric-400 bg-electric-500/10 border-electric-500/20",
  },
];

export function Dashboard() {
  const { complaints, ledger, sosAlerts, strikeCount, currentStudent } = useAppState();

  const totalCash = ledger.filter((e) => e.kind === "toll").reduce((s, e) => s + e.amountTaka, 0);
  const totalFoodItems = ledger.filter((e) => e.kind === "food").length;
  const activeSos = sosAlerts.filter((a) => a.status !== "acknowledged").length;

  return (
    <div>
      <PageHeader
        eyebrow="Command Center"
        title={`Welcome back, ${currentStudent?.name.split(" ")[0] ?? "Comrade"}`}
        description="Track the resistance's progress across all six missions. Every strike, taka, and seat swap in one place."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <StrikeMeter strikeCount={strikeCount} />
        </div>
        <Card className="p-6">
          <p className="font-display text-xs font-bold uppercase tracking-widest text-ink-300">
            Live Signals
          </p>
          <div className="mt-4 space-y-3">
            <StatRow label="Complaints logged" value={complaints.length} />
            <StatRow label="Cash extorted tracked" value={`${totalCash} Tk`} />
            <StatRow label="Tiffins stolen logged" value={totalFoodItems} />
            <StatRow label="Active SOS alerts" value={activeSos} tone={activeSos > 0 ? "text-signal-400" : undefined} />
          </div>
        </Card>
      </div>

      <h2 className="mt-10 mb-4 font-display text-lg font-bold text-ink-100">Missions</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MISSIONS.map((m) => (
          <Link key={m.to} to={m.to} className="group">
            <Card className="h-full p-5 transition-transform duration-150 group-hover:-translate-y-1 group-hover:border-ink-500">
              <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border ${m.tone}`}>
                <m.icon className="h-5 w-5" />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-ink-100">{m.title}</h3>
                <ArrowUpRight className="h-4 w-4 text-ink-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink-200" />
              </div>
              <p className="mt-1.5 text-xs text-ink-400">{m.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatRow({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-800 pb-2 last:border-0 last:pb-0">
      <span className="text-xs text-ink-400">{label}</span>
      <span className={`font-display text-sm font-bold ${tone ?? "text-ink-100"}`}>{value}</span>
    </div>
  );
}

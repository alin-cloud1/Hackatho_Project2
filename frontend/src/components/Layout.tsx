import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquareWarning,
  Grid3x3,
  BookOpenText,
  Coins,
  Siren,
  ShieldCheck,
  LogOut,
  Wifi,
  WifiOff,
  Menu,
  X,
  Shield,
} from "lucide-react";
import { useAppState } from "../state/AppStateContext";
import { StrikeMeter } from "./StrikeMeter";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/whistleblower", label: "M1 · Whistleblower", icon: MessageSquareWarning },
  { to: "/seating", label: "M2 · Seat Planner", icon: Grid3x3 },
  { to: "/syllabus", label: "M3 · Syllabus Negotiator", icon: BookOpenText },
  { to: "/ledger", label: "M4 · Corrupt Economy", icon: Coins },
  { to: "/sos", label: "M5 · SOS Flare", icon: Siren },
  { to: "/fact-check", label: "M6 · Fact-Checker", icon: ShieldCheck },
];

export function Layout() {
  const { currentStudent, logout, isOnline, strikeCount } = useAppState();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen lg:flex">
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-ink-800 bg-ink-900/90 px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-signal-400" />
          <span className="font-display text-sm font-bold">Anti-Kuddus Protocol</span>
        </div>
        <button onClick={() => setMobileOpen((v) => !v)} className="text-ink-200">
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`${
          mobileOpen ? "block" : "hidden"
        } w-full border-b border-ink-800 bg-ink-900/95 lg:block lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r`}
      >
        <div className="sticky top-0 flex h-screen flex-col p-5">
          <div className="hidden items-center gap-2.5 px-1 pb-6 lg:flex">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal-500/15 border border-signal-500/30">
              <Shield className="h-5 w-5 text-signal-400" />
            </div>
            <div>
              <p className="font-display text-sm font-bold leading-tight text-ink-100">
                Anti-Kuddus Protocol
              </p>
              <p className="text-[11px] text-ink-400">Class 7-B Resistance HQ</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-electric-500/15 text-electric-400 border border-electric-500/30"
                      : "text-ink-300 hover:bg-ink-800 hover:text-ink-100 border border-transparent"
                  }`
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-4 space-y-3 border-t border-ink-800 pt-4">
            <StrikeMeter strikeCount={strikeCount} compact />
            <div className="flex items-center gap-1.5 text-xs text-ink-400">
              {isOnline ? (
                <Wifi className="h-3.5 w-3.5 text-mint-400" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-signal-400" />
              )}
              {isOnline ? "Connected" : "Offline — SOS queued locally"}
            </div>
            {currentStudent && (
              <div className="flex items-center justify-between rounded-xl bg-ink-800 px-3 py-2.5">
                <div>
                  <p className="text-xs font-semibold text-ink-100">{currentStudent.name}</p>
                  <p className="text-[11px] text-ink-400">Roll #{currentStudent.rollNumber}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-700 hover:text-signal-400"
                  title="Log out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Siren, MapPin, WifiOff, Wifi, CheckCircle2, Radio } from "lucide-react";
import { useAppState } from "../state/AppStateContext";
import type { SosAlert, SosLocation } from "../types";
import { Badge, Button, Card, Field, PageHeader, inputClass } from "../components/ui";

const LOCATIONS: SosLocation[] = ["Library", "Playground", "Corridor", "Classroom", "Canteen"];

export function SosFlare() {
  const { sosAlerts, addSosAlert, updateSosAlert, isOnline } = useAppState();
  const [location, setLocation] = useState<SosLocation>("Corridor");
  const [simulateOffline, setSimulateOffline] = useState(false);
  const [justSent, setJustSent] = useState(false);

  const effectivelyOnline = isOnline && !simulateOffline;

  // Auto-sync queued alerts the moment connectivity returns.
  useEffect(() => {
    if (!effectivelyOnline) return;
    const queued = sosAlerts.filter((a) => a.status === "queued");
    queued.forEach((a) => updateSosAlert(a.id, "sent"));
  }, [effectivelyOnline, sosAlerts, updateSosAlert]);

  const handleSos = () => {
    const alert: SosAlert = {
      id: crypto.randomUUID(),
      location,
      timestamp: Date.now(),
      status: effectivelyOnline ? "sent" : "queued",
    };
    addSosAlert(alert);
    setJustSent(true);
    setTimeout(() => setJustSent(false), 2000);
  };

  const queuedCount = sosAlerts.filter((a) => a.status === "queued").length;

  return (
    <div>
      <PageHeader
        eyebrow="Mission 5"
        title="SOS Rescue Flare"
        description="One tap alerts Biltu and Miltu's live dashboard the instant Kuddus corners you in the corridor."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card className="flex flex-col items-center gap-5 p-8 text-center">
            <Field label="Current Location">
              <select
                className={inputClass}
                value={location}
                onChange={(e) => setLocation(e.target.value as SosLocation)}
              >
                {LOCATIONS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>

            <button
              onClick={handleSos}
              className="group relative flex h-40 w-40 items-center justify-center rounded-full bg-signal-500 shadow-2xl shadow-signal-500/40 transition-transform active:scale-95"
            >
              <span className="absolute inset-0 rounded-full bg-signal-500 animate-pulse-ring" />
              <span className="relative flex flex-col items-center gap-1 text-white">
                <Siren className="h-9 w-9" />
                <span className="font-display text-lg font-extrabold tracking-wide">SOS</span>
              </span>
            </button>

            {justSent && (
              <p className="flex items-center gap-2 text-xs font-medium text-mint-400">
                <CheckCircle2 className="h-4 w-4" />
                {effectivelyOnline ? "Alert broadcast to captains." : "Alert queued — will sync when back online."}
              </p>
            )}

            <button
              onClick={() => setSimulateOffline((v) => !v)}
              className="flex items-center gap-1.5 text-[11px] text-ink-500 hover:text-ink-300"
            >
              {simulateOffline ? <WifiOff className="h-3 w-3" /> : <Wifi className="h-3 w-3" />}
              {simulateOffline ? "Simulating offline — tap to reconnect" : "Simulate offline mode"}
            </button>
          </Card>

          <Card className="p-6">
            <h3 className="mb-2 font-display text-sm font-bold text-ink-100">
              Real-Time Broadcast (Advanced Engineering)
            </h3>
            <p className="text-xs leading-relaxed text-ink-400">
              In production this button emits over a WebSocket/Web Push channel so Biltu and
              Miltu's screens light up within milliseconds, bypassing page refreshes entirely.
              This frontend demo wires the same event straight into shared app state so you can
              see the captain dashboard update live, right now.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="mb-2 font-display text-sm font-bold text-ink-100">Offline Resilience</h3>
            <p className="text-xs leading-relaxed text-ink-400">
              If the network drops mid-emergency, the alert is queued locally instead of lost.
              The moment connectivity returns — automatically detected via the browser's online
              event — every queued alert flushes to the captains' dashboard.
            </p>
            {queuedCount > 0 && (
              <p className="mt-2">
                <Badge tone="warning">{queuedCount} alert(s) queued offline</Badge>
              </p>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Radio className="h-4 w-4 text-signal-400" />
              <h3 className="font-display text-sm font-bold text-ink-100">
                Captains' Live Dashboard (Biltu &amp; Miltu's View)
              </h3>
            </div>
            <div className="space-y-3">
              {sosAlerts.length === 0 && (
                <p className="text-xs text-ink-500">No distress signals yet. All quiet.</p>
              )}
              {sosAlerts.map((a) => (
                <div
                  key={a.id}
                  className={`flex items-center justify-between rounded-xl border p-4 animate-fade-up ${
                    a.status === "acknowledged"
                      ? "border-ink-700 bg-ink-900/40 opacity-60"
                      : "border-signal-500/40 bg-signal-500/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-signal-400" />
                    <div>
                      <p className="text-sm font-semibold text-ink-100">{a.location}</p>
                      <p className="text-[11px] text-ink-500">
                        {new Date(a.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      tone={a.status === "queued" ? "warning" : a.status === "sent" ? "danger" : "success"}
                    >
                      {a.status}
                    </Badge>
                    {a.status !== "acknowledged" && (
                      <Button variant="ghost" onClick={() => updateSosAlert(a.id, "acknowledged")}>
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

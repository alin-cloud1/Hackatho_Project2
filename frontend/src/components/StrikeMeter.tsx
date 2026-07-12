interface StrikeMeterProps {
  strikeCount: number;
  compact?: boolean;
}

export function StrikeMeter({ strikeCount, compact }: StrikeMeterProps) {
  const pct = (strikeCount / 3) * 100;
  const impeached = strikeCount >= 3;

  const barColor = impeached
    ? "from-signal-500 to-signal-400"
    : strikeCount === 2
      ? "from-alert-500 to-alert-400"
      : "from-electric-500 to-mint-500";

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-2 w-32 rounded-full bg-ink-800 overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="font-display text-sm font-semibold text-ink-100">{strikeCount}/3</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-850/80 p-6 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-sm uppercase tracking-widest text-ink-300">
          Warnings Tracker
        </h3>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
            impeached
              ? "bg-signal-500/20 text-signal-400 animate-pulse-ring"
              : "bg-ink-800 text-ink-200"
          }`}
        >
          {impeached ? "Impeachment Triggered" : `${3 - strikeCount} strike${3 - strikeCount === 1 ? "" : "s"} left`}
        </span>
      </div>
      <div className="h-6 w-full rounded-full bg-ink-900 overflow-hidden border border-ink-700">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700 flex items-center justify-end pr-2`}
          style={{ width: `${Math.max(pct, 6)}%` }}
        >
          {strikeCount > 0 && (
            <span className="text-[10px] font-bold text-ink-950">{strikeCount}</span>
          )}
        </div>
      </div>
      <div className="mt-3 flex justify-between font-display text-2xl font-bold">
        <span className="text-ink-100">
          Warnings: <span className="text-signal-400">{strikeCount}</span>
          <span className="text-ink-400">/3</span>
        </span>
      </div>
      <p className="mt-1 text-xs text-ink-400">
        {impeached
          ? "Three legitimate strikes logged — Rashid Sir has been notified. Kuddus is impeached."
          : "Strikes left until Kuddus's impeachment before Rashid Sir."}
      </p>
    </div>
  );
}

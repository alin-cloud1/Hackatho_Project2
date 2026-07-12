import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-ink-700 bg-ink-850/80 backdrop-blur-sm shadow-lg shadow-black/20 ${className}`}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "danger" | "success" | "warning" | "info";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-ink-800 text-ink-200 border-ink-600",
    danger: "bg-signal-500/15 text-signal-400 border-signal-500/30",
    success: "bg-mint-500/15 text-mint-400 border-mint-500/30",
    warning: "bg-alert-500/15 text-alert-400 border-alert-500/30",
    info: "bg-electric-500/15 text-electric-400 border-electric-500/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-fade-up">
      <div>
        <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-electric-400">
          {eyebrow}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-ink-100 sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-300">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  className?: string;
}) {
  const variants: Record<string, string> = {
    primary: "bg-electric-500 hover:bg-electric-400 text-white shadow-electric-500/30",
    secondary: "bg-ink-800 hover:bg-ink-700 text-ink-100 border border-ink-600",
    danger: "bg-signal-500 hover:bg-signal-400 text-white shadow-signal-500/30",
    ghost: "bg-transparent hover:bg-ink-800 text-ink-300 border border-ink-700",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-lg transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-300">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-ink-600 bg-ink-900 px-3.5 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 outline-none transition focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20";

import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, KeyRound, Hash, ArrowRight } from "lucide-react";
import { useAppState } from "../state/AppStateContext";
import { Button, Field, inputClass } from "../components/ui";

export function Login() {
  const { login } = useAppState();
  const navigate = useNavigate();
  const [rollNumber, setRollNumber] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = login(rollNumber.trim(), pin.trim());
    if (result.ok) {
      navigate("/");
    } else {
      setError(result.error ?? "Login failed.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-signal-500/15 border border-signal-500/30">
            <Shield className="h-7 w-7 text-signal-400" />
          </div>
          <h1 className="font-display text-2xl font-bold text-ink-100">Anti-Kuddus Protocol</h1>
          <p className="mt-2 text-sm text-ink-300">
            Class 7-B Resistance HQ &middot; Secure roll-number authentication
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-ink-700 bg-ink-850/80 p-6 shadow-xl shadow-black/30"
        >
          <Field label="Roll Number">
            <div className="relative">
              <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                className={`${inputClass} pl-10`}
                placeholder="e.g. 07"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                autoFocus
              />
            </div>
          </Field>

          <Field label="Secret PIN" hint="Distributed privately by Biltu &amp; Miltu, never shared in class.">
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                type="password"
                className={`${inputClass} pl-10`}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
            </div>
          </Field>

          {error && (
            <p className="rounded-lg border border-signal-500/30 bg-signal-500/10 px-3 py-2 text-xs font-medium text-signal-400">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full">
            Enter the Resistance <ArrowRight className="h-4 w-4" />
          </Button>

          <p className="text-center text-[11px] leading-relaxed text-ink-500">
            Your roll number never leaves this device in plain form — complaints you file are
            submitted under a one-way cryptographic hash. Kuddus (roll 01) has been permanently
            locked out.
            <br />
            <span className="mt-1 inline-block">
              <span className="font-semibold text-ink-400">Admins:</span> Rashid Sir (00 / 0000),
              Biltu (02 / 2222), Miltu (03 / 3333). <span className="font-semibold text-ink-400">Students:</span>{" "}
              04–18 use PIN 1004–1018.
            </span>
          </p>
        </form>
      </div>
    </div>
  );
}

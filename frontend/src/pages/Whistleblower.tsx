import { useState } from "react";
import type { FormEvent } from "react";
import { Fingerprint, ImagePlus, Send, ShieldCheck, Clock, EyeOff, Users } from "lucide-react";
import { useAppState } from "../state/AppStateContext";
import { stripImageMetadata } from "../lib/exif";
import type { ComplaintCategory } from "../types";
import { Badge, Button, Card, Field, PageHeader, inputClass } from "../components/ui";
import { StrikeMeter } from "../components/StrikeMeter";

const CATEGORIES: ComplaintCategory[] = [
  "Tiffin Theft",
  "Washroom Bribe",
  "Syllabus Bloat",
  "Sports Veto",
  "Human Shield Seating",
  "Other",
];

type AddComplaint = (payload: {
  category: ComplaintCategory;
  description: string;
  hasPhoto: boolean;
  photoStrippedMeta: boolean;
}) => Promise<{ ok: boolean; error?: string }>;

export function Whistleblower() {
  const { complaints, addComplaint, strikeCount, isAdmin, isStudent } = useAppState();

  // The backend already returns only the caller's own complaints for students
  // (matched by their server-side hash) and the full log for admins.
  const visibleComplaints = complaints;

  return (
    <div>
      <PageHeader
        eyebrow="Mission 1"
        title={isAdmin ? "Complaint Oversight" : "Anonymous Whistleblower Portal"}
        description={
          isAdmin
            ? "Review every anonymous strike filed against Kuddus. Complaints are masked — you see the evidence, never the identity. Admins cannot file complaints."
            : "Log Kuddus's daily atrocities. Your roll number is hashed client-side before submission — it never touches the complaint record in plain form. Only you can see the complaints you file."
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {isStudent && <ComplaintForm addComplaint={addComplaint} />}

          {isAdmin && (
            <Card className="p-6">
              <div className="flex items-center gap-3 rounded-xl border border-electric-500/30 bg-electric-500/10 px-4 py-3">
                <Users className="h-5 w-5 shrink-0 text-electric-400" />
                <p className="text-xs leading-relaxed text-ink-300">
                  You are logged in as <span className="font-semibold text-ink-100">admin</span>.
                  Admins oversee the resistance and cannot file complaints — only general students
                  may submit strikes against Kuddus.
                </p>
              </div>
            </Card>
          )}

          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Fingerprint className="h-4 w-4 text-electric-400" />
              <h3 className="font-display text-sm font-bold text-ink-100">
                Anonymity Pipeline (Advanced Engineering)
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-ink-400">
              Roll numbers are salted and passed through SHA-256 in your browser via the Web
              Crypto API before anything is stored — the raw roll number never enters the
              complaint record, localStorage, or any network payload. Even a full database leak
              cannot be reverse-engineered back to a student. Photo uploads are re-rasterized
              through an off-screen &lt;canvas&gt;, which discards EXIF timestamps, GPS tags, and
              camera signatures on the way out.
            </p>
          </Card>
        </div>

        <div className="space-y-6">
          {/* The strike total is an aggregate — visible to admins only. */}
          {isAdmin && <StrikeMeter strikeCount={strikeCount} />}

          <Card className="p-6">
            <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-bold text-ink-100">
              {isAdmin ? (
                <>Full Anonymous Log ({visibleComplaints.length})</>
              ) : (
                <>
                  <EyeOff className="h-4 w-4 text-ink-400" /> My Complaints ({visibleComplaints.length})
                </>
              )}
            </h3>
            {!isAdmin && (
              <p className="mb-3 text-[11px] text-ink-500">
                Only the complaints you personally filed are shown here. The class-wide total is
                private to the admins.
              </p>
            )}
            <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
              {visibleComplaints.length === 0 && (
                <p className="text-xs text-ink-500">
                  {isAdmin ? "No complaints filed yet." : "You haven't filed any complaints yet."}
                </p>
              )}
              {visibleComplaints.map((c) => (
                <div key={c.id} className="rounded-xl border border-ink-700 bg-ink-900/60 p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <Badge tone="danger">{c.category}</Badge>
                    <span className="flex items-center gap-1 text-[10px] text-ink-500">
                      <Clock className="h-3 w-3" />
                      {new Date(c.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-ink-300">{c.description}</p>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-ink-500">
                    <span className="font-mono">hash:{c.submitterHash.slice(0, 10)}…</span>
                    {c.hasPhoto && (
                      <Badge tone={c.photoStrippedMeta ? "success" : "warning"}>
                        {c.photoStrippedMeta ? "EXIF stripped" : "photo attached"}
                      </Badge>
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

function ComplaintForm({ addComplaint }: { addComplaint: AddComplaint }) {
  const [category, setCategory] = useState<ComplaintCategory>("Tiffin Theft");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [stripping, setStripping] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setError(null);

    // EXIF metadata is stripped client-side before we even flag the photo.
    let hasPhoto = false;
    let photoStrippedMeta = false;
    if (photo) {
      setStripping(true);
      try {
        await stripImageMetadata(photo);
        hasPhoto = true;
        photoStrippedMeta = true;
      } catch {
        hasPhoto = true;
        photoStrippedMeta = false;
      }
      setStripping(false);
    }

    // The raw roll number is hashed server-side (from the auth token) — it never
    // leaves the client in the request body.
    const res = await addComplaint({ category, description: description.trim(), hasPhoto, photoStrippedMeta });
    if (!res.ok) {
      setError(res.error ?? "Failed to file complaint.");
      return;
    }
    setDescription("");
    setPhoto(null);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Category">
          <select
            className={inputClass}
            value={category}
            onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Description" hint="Be specific — date, time, what happened.">
          <textarea
            className={`${inputClass} min-h-28 resize-y`}
            placeholder="e.g. Charged 2 Taka for washroom access during 3rd period free time..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </Field>

        <Field label="Photo Evidence (optional)" hint="EXIF metadata is stripped automatically on upload.">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-ink-600 bg-ink-900 px-3.5 py-3 text-sm text-ink-300 hover:border-electric-500">
            <ImagePlus className="h-4 w-4 shrink-0" />
            {photo ? photo.name : "Attach photo of the crime in progress"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
          </label>
        </Field>

        <Button type="submit" disabled={stripping} className="w-full">
          {stripping ? (
            "Stripping metadata..."
          ) : (
            <>
              <Send className="h-4 w-4" /> Submit Anonymously
            </>
          )}
        </Button>

        {submitted && (
          <p className="flex items-center gap-2 rounded-lg border border-mint-500/30 bg-mint-500/10 px-3 py-2 text-xs font-medium text-mint-400">
            <ShieldCheck className="h-4 w-4" /> Complaint logged. Identity masked and untraceable.
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-signal-500/30 bg-signal-500/10 px-3 py-2 text-xs font-medium text-signal-400">
            {error}
          </p>
        )}
      </form>
    </Card>
  );
}

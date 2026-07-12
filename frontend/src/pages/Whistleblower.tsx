import { useState } from "react";
import type { FormEvent } from "react";
import { Fingerprint, ImagePlus, Send, ShieldCheck, Clock } from "lucide-react";
import { useAppState } from "../state/AppStateContext";
import { hashRollNumber } from "../lib/crypto";
import { stripImageMetadata } from "../lib/exif";
import type { Complaint, ComplaintCategory } from "../types";
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

export function Whistleblower() {
  const { currentStudent, complaints, addComplaint, strikeCount } = useAppState();
  const [category, setCategory] = useState<ComplaintCategory>("Tiffin Theft");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [stripping, setStripping] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentStudent || !description.trim()) return;

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

    const submitterHash = await hashRollNumber(currentStudent.rollNumber);

    const complaint: Complaint = {
      id: crypto.randomUUID(),
      category,
      description: description.trim(),
      submitterHash,
      hasPhoto,
      photoStrippedMeta,
      timestamp: Date.now(),
    };
    addComplaint(complaint);
    setDescription("");
    setPhoto(null);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Mission 1"
        title="Anonymous Whistleblower Portal"
        description="Log Kuddus's daily atrocities. Your roll number is hashed client-side before submission — it never touches the complaint record in plain form."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
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
            </form>
          </Card>

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
          <StrikeMeter strikeCount={strikeCount} />
          <Card className="p-6">
            <h3 className="mb-4 font-display text-sm font-bold text-ink-100">
              Recent Anonymous Log ({complaints.length})
            </h3>
            <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
              {complaints.length === 0 && (
                <p className="text-xs text-ink-500">No complaints filed yet.</p>
              )}
              {complaints.map((c) => (
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

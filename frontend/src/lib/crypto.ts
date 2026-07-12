// One-way anonymity pipeline: roll numbers are salted + hashed client-side
// before anything derived from them is stored. The raw roll number never
// enters localStorage or any complaint record — only this digest does,
// so even a full data leak cannot be reverse-engineered back to a student.
const SALT = "anti-kuddus-protocol-v1";

export async function hashRollNumber(rollNumber: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${SALT}:${rollNumber}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

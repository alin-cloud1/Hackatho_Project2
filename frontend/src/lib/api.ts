// Typed client for the Anti-Kuddus backend API.
// Base URL comes from VITE_API_URL (see frontend/.env.example). When it is not
// set, the app runs in local/offline mode against localStorage instead.
import type {
  Complaint,
  ComplaintCategory,
  LedgerEntry,
  SeatPlan,
  SeatProfile,
  SosAlert,
  Student,
  SyllabusResult,
} from "../types";

export const API_URL: string = import.meta.env.VITE_API_URL ?? "";
export const apiEnabled = Boolean(API_URL);

const TOKEN_KEY = "akp_token_v1";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data as { error?: string })?.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

// ---- Auth ----
export const api = {
  login: (rollNumber: string, pin: string) =>
    request<{ token: string; student: Student }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ rollNumber, pin }),
    }),
  me: () => request<{ student: Student }>("/api/auth/me"),

  // ---- Complaints (M1) ----
  getComplaints: () =>
    request<{ complaints: Complaint[]; strikeCount?: number; totalComplaints?: number }>("/api/complaints"),
  addComplaint: (body: {
    category: ComplaintCategory;
    description: string;
    hasPhoto: boolean;
    photoStrippedMeta: boolean;
  }) => request<{ complaint: Complaint }>("/api/complaints", { method: "POST", body: JSON.stringify(body) }),

  // ---- Seating (M2) ----
  getSeatPlan: (rows: number, cols: number, aisle: number) =>
    request<SeatPlan>(`/api/seating/plan?rows=${rows}&cols=${cols}&aisle=${aisle}`),
  getSeatProfile: () => request<{ profile: SeatProfile | null }>("/api/seating/profile"),
  setSeatProfile: (profile: SeatProfile) =>
    request<{ ok: boolean }>("/api/seating/profile", { method: "PUT", body: JSON.stringify(profile) }),

  // ---- Ledger (M4) ----
  getLedger: () => request<{ entries: LedgerEntry[]; totals: LedgerTotals }>("/api/ledger"),
  addLedgerEntry: (body: { kind: "toll"; amountTaka: number } | { kind: "food"; foodItem: string }) =>
    request<{ entry: LedgerEntry; totals: LedgerTotals }>("/api/ledger", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // ---- Syllabus (M3) ----
  summarizeSyllabus: (text: string, testDate: string) =>
    request<SyllabusResult & { mode: string; retrievedContext?: string[] }>("/api/syllabus/summarize", {
      method: "POST",
      body: JSON.stringify({ text, testDate }),
    }),

  // ---- SOS (M5) ----
  getSos: () => request<{ alerts: SosAlert[] }>("/api/sos"),
  addSos: (location: string, status: "queued" | "sent") =>
    request<{ alert: SosAlert }>("/api/sos", { method: "POST", body: JSON.stringify({ location, status }) }),
  ackSos: (id: string) => request<{ alert: SosAlert }>(`/api/sos/${id}/ack`, { method: "POST" }),

  // ---- Fact-check (M6) ----
  factCheck: (claim: string) =>
    request<FactCheckResult>("/api/factcheck", { method: "POST", body: JSON.stringify({ claim }) }),
};

export interface LedgerTotals {
  totalCash: number;
  totalCalories: number;
  foodCount: number;
  entryCount: number;
  cricketBats: number;
  jhalmuriPackets: number;
}

export interface FactCheckResult {
  status: "TRUE" | "FALSE" | "UNVERIFIED";
  confidence: number;
  quote: string | null;
  section: string | null;
  mode: string;
  reason?: string;
}

/** Open the SOS WebSocket feed. Returns the socket (caller handles messages). */
export function openSosSocket(): WebSocket | null {
  if (!apiEnabled) return null;
  const token = getToken();
  const wsUrl = API_URL.replace(/^http/, "ws") + `/ws${token ? `?token=${token}` : ""}`;
  return new WebSocket(wsUrl);
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Complaint, LedgerEntry, SeatProfile, SosAlert, Student } from "../types";
import { ROSTER } from "../data/mockData";

const STORAGE_KEY = "akp_state_v2";
const SESSION_KEY = "akp_session_v2";

interface PersistedState {
  complaints: Complaint[];
  ledger: LedgerEntry[];
  sosAlerts: SosAlert[];
  seatProfiles: Record<string, SeatProfile>; // keyed by roll number
}

interface AppState extends PersistedState {
  currentStudent: Student | null;
  isAdmin: boolean;
  isStudent: boolean;
  isOnline: boolean;
  login: (rollNumber: string, pin: string) => { ok: boolean; error?: string };
  logout: () => void;
  addComplaint: (c: Complaint) => void;
  addLedgerEntry: (e: LedgerEntry) => void;
  addSosAlert: (a: SosAlert) => void;
  updateSosAlert: (id: string, status: SosAlert["status"]) => void;
  setSeatProfile: (rollNumber: string, profile: SeatProfile) => void;
  strikeCount: number;
}

const AppStateContext = createContext<AppState | null>(null);

function loadPersisted(): PersistedState {
  const fallback: PersistedState = { complaints: [], ledger: [], sosAlerts: [], seatProfiles: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...fallback, ...JSON.parse(raw) };
  } catch {
    // ignore corrupt storage
  }
  return fallback;
}

function loadSession(): Student | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [persisted, setPersisted] = useState<PersistedState>(loadPersisted);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(loadSession);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  }, [persisted]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const login = useCallback((rollNumber: string, pin: string) => {
    const student = ROSTER.find((s) => s.rollNumber === rollNumber);
    if (!student) return { ok: false, error: "Roll number not recognized." };
    // Kuddus's access has been revoked by class decree — he can never log in.
    if (student.isKuddus || !student.pin || !student.role) {
      return { ok: false, error: "This account has been revoked. Access denied by class decree." };
    }
    if (student.pin !== pin) return { ok: false, error: "Incorrect secret PIN." };
    setCurrentStudent(student);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(student));
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    setCurrentStudent(null);
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const addComplaint = useCallback((c: Complaint) => {
    setPersisted((prev) => ({ ...prev, complaints: [c, ...prev.complaints] }));
  }, []);

  const addLedgerEntry = useCallback((e: LedgerEntry) => {
    setPersisted((prev) => ({ ...prev, ledger: [e, ...prev.ledger] }));
  }, []);

  const addSosAlert = useCallback((a: SosAlert) => {
    setPersisted((prev) => ({ ...prev, sosAlerts: [a, ...prev.sosAlerts] }));
  }, []);

  const updateSosAlert = useCallback((id: string, status: SosAlert["status"]) => {
    setPersisted((prev) => ({
      ...prev,
      sosAlerts: prev.sosAlerts.map((a) => (a.id === id ? { ...a, status } : a)),
    }));
  }, []);

  const setSeatProfile = useCallback((rollNumber: string, profile: SeatProfile) => {
    setPersisted((prev) => ({
      ...prev,
      seatProfiles: { ...prev.seatProfiles, [rollNumber]: profile },
    }));
  }, []);

  const strikeCount = Math.min(3, persisted.complaints.length);
  const isAdmin = currentStudent?.role === "admin";
  const isStudent = currentStudent?.role === "student";

  const value = useMemo<AppState>(
    () => ({
      ...persisted,
      currentStudent,
      isAdmin,
      isStudent,
      isOnline,
      login,
      logout,
      addComplaint,
      addLedgerEntry,
      addSosAlert,
      updateSosAlert,
      setSeatProfile,
      strikeCount,
    }),
    [persisted, currentStudent, isAdmin, isStudent, isOnline, login, logout, addComplaint, addLedgerEntry, addSosAlert, updateSosAlert, setSeatProfile, strikeCount]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}

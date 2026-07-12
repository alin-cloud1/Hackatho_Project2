import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Complaint, LedgerEntry, SosAlert, Student } from "../types";
import { ROSTER } from "../data/mockData";

const STORAGE_KEY = "akp_state_v1";
const SESSION_KEY = "akp_session_v1";

interface PersistedState {
  complaints: Complaint[];
  ledger: LedgerEntry[];
  sosAlerts: SosAlert[];
}

interface AppState extends PersistedState {
  currentStudent: Student | null;
  isOnline: boolean;
  login: (rollNumber: string, pin: string) => { ok: boolean; error?: string };
  logout: () => void;
  addComplaint: (c: Complaint) => void;
  addLedgerEntry: (e: LedgerEntry) => void;
  addSosAlert: (a: SosAlert) => void;
  updateSosAlert: (id: string, status: SosAlert["status"]) => void;
  strikeCount: number;
}

const AppStateContext = createContext<AppState | null>(null);

function loadPersisted(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore corrupt storage
  }
  return { complaints: [], ledger: [], sosAlerts: [] };
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

  const strikeCount = Math.min(3, persisted.complaints.length);

  const value = useMemo<AppState>(
    () => ({
      ...persisted,
      currentStudent,
      isOnline,
      login,
      logout,
      addComplaint,
      addLedgerEntry,
      addSosAlert,
      updateSosAlert,
      strikeCount,
    }),
    [persisted, currentStudent, isOnline, login, logout, addComplaint, addLedgerEntry, addSosAlert, updateSosAlert, strikeCount]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}

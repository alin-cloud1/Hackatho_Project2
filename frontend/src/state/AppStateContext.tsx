import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Complaint, ComplaintCategory, LedgerEntry, SeatProfile, SosAlert, Student } from "../types";
import { api, getToken, setToken, openSosSocket, type LedgerTotals } from "../lib/api";

const EMPTY_TOTALS: LedgerTotals = {
  totalCash: 0,
  totalCalories: 0,
  foodCount: 0,
  entryCount: 0,
  cricketBats: 0,
  jhalmuriPackets: 0,
};

interface AppState {
  currentStudent: Student | null;
  isAdmin: boolean;
  isStudent: boolean;
  isOnline: boolean;
  loading: boolean;
  complaints: Complaint[];
  strikeCount: number;
  ledger: LedgerEntry[];
  ledgerTotals: LedgerTotals;
  sosAlerts: SosAlert[];
  login: (rollNumber: string, pin: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  addComplaint: (payload: {
    category: ComplaintCategory;
    description: string;
    hasPhoto: boolean;
    photoStrippedMeta: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  addLedgerEntry: (
    payload: { kind: "toll"; amountTaka: number } | { kind: "food"; foodItem: string }
  ) => Promise<{ ok: boolean; error?: string }>;
  addSosAlert: (location: string, status: "queued" | "sent") => Promise<{ ok: boolean; error?: string }>;
  updateSosAlert: (id: string) => Promise<void>;
  setSeatProfile: (rollNumber: string, profile: SeatProfile) => Promise<{ ok: boolean; error?: string }>;
}

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [strikeCount, setStrikeCount] = useState(0);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [ledgerTotals, setLedgerTotals] = useState<LedgerTotals>(EMPTY_TOTALS);
  const [sosAlerts, setSosAlerts] = useState<SosAlert[]>([]);

  const socketRef = useRef<WebSocket | null>(null);

  const role = currentStudent?.role;

  // ---- data loading ----
  const loadComplaints = useCallback(async () => {
    const res = await api.getComplaints();
    setComplaints(res.complaints);
    setStrikeCount(res.strikeCount ?? 0);
  }, []);

  const loadLedger = useCallback(async () => {
    const res = await api.getLedger();
    setLedger(res.entries);
    setLedgerTotals(res.totals);
  }, []);

  const loadSos = useCallback(async () => {
    const res = await api.getSos();
    setSosAlerts(res.alerts);
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([loadComplaints(), loadLedger(), loadSos()]);
  }, [loadComplaints, loadLedger, loadSos]);

  // ---- realtime SOS feed ----
  const connectSocket = useCallback(() => {
    socketRef.current?.close();
    const ws = openSosSocket();
    if (!ws) return;
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === "sos:new") {
          setSosAlerts((prev) => [msg.alert, ...prev.filter((a) => a.id !== msg.alert.id)]);
        } else if (msg.type === "sos:update") {
          setSosAlerts((prev) => prev.map((a) => (a.id === msg.alert.id ? msg.alert : a)));
        }
      } catch {
        // ignore malformed frames
      }
    };
    socketRef.current = ws;
  }, []);

  // ---- session restore on mount ----
  useEffect(() => {
    let active = true;
    (async () => {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const { student } = await api.me();
        if (!active) return;
        setCurrentStudent(student);
        await loadAll();
        connectSocket();
      } catch {
        setToken(null); // stale/invalid token
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      socketRef.current?.close();
    };
  }, [loadAll, connectSocket]);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // ---- actions ----
  const login = useCallback(
    async (rollNumber: string, pin: string) => {
      try {
        const { token, student } = await api.login(rollNumber, pin);
        setToken(token);
        setCurrentStudent(student);
        await loadAll();
        connectSocket();
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Login failed." };
      }
    },
    [loadAll, connectSocket]
  );

  const logout = useCallback(() => {
    setToken(null);
    setCurrentStudent(null);
    setComplaints([]);
    setLedger([]);
    setLedgerTotals(EMPTY_TOTALS);
    setSosAlerts([]);
    setStrikeCount(0);
    socketRef.current?.close();
    socketRef.current = null;
  }, []);

  const addComplaint = useCallback(
    async (payload: { category: ComplaintCategory; description: string; hasPhoto: boolean; photoStrippedMeta: boolean }) => {
      try {
        await api.addComplaint(payload);
        await loadComplaints();
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Failed to file complaint." };
      }
    },
    [loadComplaints]
  );

  const addLedgerEntry = useCallback(
    async (payload: { kind: "toll"; amountTaka: number } | { kind: "food"; foodItem: string }) => {
      try {
        const res = await api.addLedgerEntry(payload);
        setLedger((prev) => [res.entry, ...prev]);
        setLedgerTotals(res.totals);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Failed to log entry." };
      }
    },
    []
  );

  const addSosAlert = useCallback(async (location: string, status: "queued" | "sent") => {
    try {
      const res = await api.addSos(location, status);
      setSosAlerts((prev) => [res.alert, ...prev.filter((a) => a.id !== res.alert.id)]);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Failed to send SOS." };
    }
  }, []);

  const updateSosAlert = useCallback(async (id: string) => {
    try {
      const res = await api.ackSos(id);
      setSosAlerts((prev) => prev.map((a) => (a.id === id ? res.alert : a)));
    } catch {
      // ignore
    }
  }, []);

  const setSeatProfile = useCallback(async (_rollNumber: string, profile: SeatProfile) => {
    try {
      await api.setSeatProfile(profile);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Failed to save seat details." };
    }
  }, []);

  const value = useMemo<AppState>(
    () => ({
      currentStudent,
      isAdmin: role === "admin",
      isStudent: role === "student",
      isOnline,
      loading,
      complaints,
      strikeCount,
      ledger,
      ledgerTotals,
      sosAlerts,
      login,
      logout,
      addComplaint,
      addLedgerEntry,
      addSosAlert,
      updateSosAlert,
      setSeatProfile,
    }),
    [currentStudent, role, isOnline, loading, complaints, strikeCount, ledger, ledgerTotals, sosAlerts, login, logout, addComplaint, addLedgerEntry, addSosAlert, updateSosAlert, setSeatProfile]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}

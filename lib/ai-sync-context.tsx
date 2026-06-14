"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from "react";

export interface AIPrioritized {
  taskId: number;
  aiScore: number;
  aiReason: string;
  suggestedOrder: number;
}

export interface ScheduleBlock {
  startHour: number;
  endHour: number;
  taskTitle: string;
  blockType: "focus" | "break" | "buffer";
  durationMin: number;
}

export interface AiState {
  prioritized: AIPrioritized[];
  scheduleBlocks: ScheduleBlock[];
  analysedAt: Date | null;
  // True while a background generate-and-save is in progress
  refreshing: boolean;
}

interface AiSyncContextValue extends AiState {
  // WRITE: generates a new AI schedule + prioritization from scratch, saves to DB, then syncs all pages.
  // Call this only on: new task, deleted task, new event, deleted event, schedule expired.
  notifyChange: (source?: "tasks" | "events") => void;

  // READ-ONLY: fetches whatever is currently saved in the DB and updates client state without writing anything new.
  // Use for the dashboard "Run AI Analysis" button and the AI assistant display.
  refreshFromDB: () => void;

  // True while a study timer session is running or paused
  timerRunning: boolean;
  setTimerRunning: (running: boolean) => void;

  // True when every focus block's endHour has already passed
  scheduleExpired: boolean;
}

const AiSyncContext = createContext<AiSyncContextValue | null>(null);

const SESSION_KEY = "ai_sync_state";

function loadFromSession(): Partial<AiState> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      prioritized: parsed.prioritized ?? [],
      scheduleBlocks: parsed.scheduleBlocks ?? [],
      analysedAt: parsed.analysedAt ? new Date(parsed.analysedAt) : null,
    };
  } catch { return {}; }
}

function saveToSession(state: AiState) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      prioritized: state.prioritized,
      scheduleBlocks: state.scheduleBlocks,
      analysedAt: state.analysedAt?.toISOString() ?? null,
    }));
  } catch { return; }
}

// Returns true when all focus blocks have an endHour that is already in the past
function computeScheduleExpired(blocks: ScheduleBlock[]): boolean {
  if (blocks.length === 0) return true;
  const nowHour = new Date().getHours() + new Date().getMinutes() / 60;
  const focusBlocks = blocks.filter((b) => b.blockType === "focus");
  if (focusBlocks.length === 0) return true;
  return focusBlocks.every((b) => b.endHour <= nowHour);
}

export function AiSyncProvider({ children }: { children: ReactNode }) {
  const saved = typeof window !== "undefined" ? loadFromSession() : {};
  const [state, setState] = useState<AiState>({
    prioritized: saved.prioritized ?? [],
    scheduleBlocks: saved.scheduleBlocks ?? [],
    analysedAt: saved.analysedAt ?? null,
    refreshing: false,
  });

  const [timerRunning, setTimerRunning] = useState(false);
  const generatingRef = useRef(false);
  const autoExpireRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Fetch current state from DB without writing anything
  const refreshFromDB = useCallback(async () => {
    try {
      const [schRes, priRes] = await Promise.allSettled([
        fetch("/api/ai/schedule", { method: "GET" }),
        fetch("/api/ai/prioritize", { method: "GET" }),
      ]);

      const newScheduleBlocks: ScheduleBlock[] =
        schRes.status === "fulfilled" && schRes.value.ok
          ? (await schRes.value.json()).blocks ?? []
          : stateRef.current.scheduleBlocks;

      const newPrioritized: AIPrioritized[] =
        priRes.status === "fulfilled" && priRes.value.ok
          ? (await priRes.value.json()).prioritized ?? []
          : stateRef.current.prioritized;

      const next: AiState = {
        prioritized: newPrioritized,
        scheduleBlocks: newScheduleBlocks,
        analysedAt: new Date(),
        refreshing: false,
      };
      setState(next);
      saveToSession(next);
    } catch { return; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Generate a new AI schedule and save it to DB
  const generateAndSave = useCallback(async (source: "tasks" | "events") => {
    if (generatingRef.current) return;
    generatingRef.current = true;
    setState((s) => ({ ...s, refreshing: true }));

    try {
      const fetches: Promise<Response>[] = [
        fetch("/api/ai/schedule", { method: "POST" }),
      ];
      if (source === "tasks") {
        fetches.push(fetch("/api/ai/prioritize", { method: "POST" }));
      }

      const results = await Promise.allSettled(fetches);
      const [schResult, priResult] = results;

      const newScheduleBlocks: ScheduleBlock[] =
        schResult.status === "fulfilled" && schResult.value.ok
          ? (await schResult.value.json()).blocks ?? []
          : stateRef.current.scheduleBlocks;

      const newPrioritized: AIPrioritized[] =
        source === "tasks" && priResult?.status === "fulfilled" && priResult.value.ok
          ? (await priResult.value.json()).prioritized ?? []
          : stateRef.current.prioritized;

      const next: AiState = {
        prioritized: newPrioritized,
        scheduleBlocks: newScheduleBlocks,
        analysedAt: new Date(),
        refreshing: false,
      };
      setState(next);
      saveToSession(next);
      autoExpireRef.current = false;
    } catch {
      setState((s) => ({ ...s, refreshing: false }));
    } finally {
      generatingRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Public: notify that a task or event changed, triggers a new schedule generation
  const notifyChange = useCallback((source: "tasks" | "events" = "tasks") => {
    // Skip if a session is running to avoid invalidating the active study block
    if (timerRunning) return;
    generateAndSave(source);
  }, [generateAndSave, timerRunning]);

  // On mount: load current DB state into the context without generating anything new
  useEffect(() => {
    refreshFromDB();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduleExpired = computeScheduleExpired(state.scheduleBlocks);

  // When the last focus block ends, auto-generate a new schedule
  useEffect(() => {
    if (!scheduleExpired || timerRunning || autoExpireRef.current) return;
    // Only trigger if blocks actually existed before expiry
    if (state.scheduleBlocks.length === 0) return;
    autoExpireRef.current = true;
    generateAndSave("tasks");
  }, [scheduleExpired, timerRunning, state.scheduleBlocks.length, generateAndSave]);

  // Poll every 60s to detect expiry while the tab stays open
  useEffect(() => {
    const id = setInterval(() => {
      if (timerRunning || generatingRef.current || autoExpireRef.current) return;
      const expired = computeScheduleExpired(state.scheduleBlocks);
      if (expired && state.scheduleBlocks.length > 0) {
        autoExpireRef.current = true;
        generateAndSave("tasks");
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [timerRunning, state.scheduleBlocks, generateAndSave]);

  return (
    <AiSyncContext.Provider value={{
      ...state,
      notifyChange,
      refreshFromDB,
      timerRunning,
      setTimerRunning,
      scheduleExpired,
    }}>
      {children}
    </AiSyncContext.Provider>
  );
}

export function useAiSync() {
  const ctx = useContext(AiSyncContext);
  if (!ctx) throw new Error("useAiSync must be used inside AiSyncProvider");
  return ctx;
}

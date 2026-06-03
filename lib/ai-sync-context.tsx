"use client";

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";

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
  refreshing: boolean;
}

interface AiSyncContextValue extends AiState {
  // Call after any task or calendar event mutation to trigger a background AI refresh
  notifyChange: (source?: "tasks" | "events") => void;
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
  } catch { /* ignore */ }
}

export function AiSyncProvider({ children }: { children: ReactNode }) {
  const saved = typeof window !== "undefined" ? loadFromSession() : {};
  const [state, setState] = useState<AiState>({
    prioritized: saved.prioritized ?? [],
    scheduleBlocks: saved.scheduleBlocks ?? [],
    analysedAt: saved.analysedAt ?? null,
    refreshing: false,
  });

  const refreshingRef = useRef(false);

  const runRefresh = useCallback(async (source: "tasks" | "events") => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setState((s) => ({ ...s, refreshing: true }));

    try {
      // Always re-run schedule; only re-prioritize when tasks change
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
          : state.scheduleBlocks;

      const newPrioritized: AIPrioritized[] =
        source === "tasks" && priResult?.status === "fulfilled" && priResult.value.ok
          ? (await priResult.value.json()).prioritized ?? []
          : state.prioritized;

      const now = new Date();
      const next: AiState = {
        prioritized: newPrioritized,
        scheduleBlocks: newScheduleBlocks,
        analysedAt: now,
        refreshing: false,
      };
      setState(next);
      saveToSession(next);
    } catch {
      setState((s) => ({ ...s, refreshing: false }));
    } finally {
      refreshingRef.current = false;
    }
  }, [state.prioritized, state.scheduleBlocks]);

  const notifyChange = useCallback((source: "tasks" | "events" = "tasks") => {
    runRefresh(source);
  }, [runRefresh]);

  return (
    <AiSyncContext.Provider value={{ ...state, notifyChange }}>
      {children}
    </AiSyncContext.Provider>
  );
}

export function useAiSync() {
  const ctx = useContext(AiSyncContext);
  if (!ctx) throw new Error("useAiSync must be used inside AiSyncProvider");
  return ctx;
}

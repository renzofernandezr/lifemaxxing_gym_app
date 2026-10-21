// Sincroniza la cola de series/calibraciones con la API. Reintenta con backoff si no hay red.
import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { useWorkout, type PendingOp } from "../store/workout";
import { api, ApiError } from "./api";

type Listener = (msg: string) => void;
let onDrop: Listener | null = null;
export const setSyncErrorListener = (fn: Listener | null) => {
  onDrop = fn;
};

let running: Promise<boolean> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let backoff = 2000;

async function send(op: PendingOp) {
  if (op.type === "sets") {
    await api(`/api/sessions/${op.sessionId}/sets`, { method: "POST", body: { sets: op.sets } });
  } else {
    await api(`/api/sessions/${op.sessionId}/calibrations`, { method: "POST", body: op.body });
  }
}

/** Envía la cola en orden. Devuelve true si quedó vacía. */
export function flushQueue(): Promise<boolean> {
  if (running) return running;
  running = (async () => {
    try {
      for (;;) {
        const op = useWorkout.getState().queue[0];
        if (!op) {
          backoff = 2000;
          return true;
        }
        try {
          await send(op);
          useWorkout.getState().dropOps([op.id]);
        } catch (err) {
          const e = err instanceof ApiError ? err : new ApiError(0, "network", "Sin conexión");
          if (e.isNetwork || e.status >= 500 || e.status === 429) {
            scheduleRetry();
            return false;
          }
          if (e.status === 401) return false; // el AuthProvider manda a login; la cola se conserva
          // Error definitivo (sesión cerrada, datos inválidos…): se descarta para no bloquear la cola.
          useWorkout.getState().dropOps([op.id]);
          onDrop?.(e.message);
        }
      }
    } finally {
      running = null;
    }
  })();
  return running;
}

function scheduleRetry() {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    flushQueue();
  }, backoff);
  backoff = Math.min(backoff * 2, 30_000);
}

/** Reintenta al volver a primer plano o al recuperar la red. */
export function useSyncTriggers() {
  useEffect(() => {
    flushQueue();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") flushQueue();
    });
    let off: (() => void) | undefined;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const h = () => {
        backoff = 2000;
        flushQueue();
      };
      window.addEventListener("online", h);
      off = () => window.removeEventListener("online", h);
    }
    return () => {
      sub.remove();
      off?.();
    };
  }, []);
}

// Sincroniza la cola de series/calibraciones con la API. Reintenta con backoff si no hay red.
import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { useWorkout, type PendingOp } from "../store/workout";
import { api, ApiError } from "./api";
import { skipRest } from "./rest";

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
  // Si ya hay una corrida, al terminar se encadena otra por si entraron series nuevas mientras tanto.
  if (running) return running.then(() => (useWorkout.getState().queue.length ? flushQueue() : true));
  // Ojo: si la cola está vacía la función async termina de inmediato; por eso `running` se limpia
  // con .finally() después de asignarlo (un finally interno correría antes de la asignación).
  const p = (async (): Promise<boolean> => {
    for (;;) {
      const op = useWorkout.getState().queue[0];
      if (!op) {
        backoff = 2000;
        return true;
      }
      try {
        await send(op);
        // Por identidad: si mientras se enviaba se fusionaron series nuevas, la entrada es otro objeto y se reenvía.
        useWorkout.getState().removeOp(op);
      } catch (err) {
        const e = err instanceof ApiError ? err : new ApiError(0, "network", "Sin conexión");
        if (e.isNetwork || e.status >= 500 || e.status === 429) {
          scheduleRetry();
          return false;
        }
        if (e.status === 401) return false; // el AuthProvider manda a login; la cola se conserva
        if (e.status === 404) {
          // La sesión ya no existe en el servidor: se descartan sus operaciones y la copia local.
          const s = useWorkout.getState();
          s.dropOps(s.queue.filter((q) => q.sessionId === op.sessionId).map((q) => q.id));
          if (s.active?.sessionId === op.sessionId) {
            await skipRest();
            s.setActive(null);
            onDrop?.("Esta sesión ya no existe en el servidor. Puedes empezar otra.");
          }
          continue;
        }
        // Error definitivo (sesión cerrada, datos inválidos…): se descarta para no bloquear la cola.
        useWorkout.getState().removeOp(op);
        onDrop?.(`No se guardó una serie: ${e.message}`);
      }
    }
  })();
  running = p;
  p.finally(() => {
    if (running === p) running = null;
  }).catch(() => {});
  return p;
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

// Sesión de entreno en curso: vive en el store local (persistido en AsyncStorage) para sobrevivir a cierres,
// y cada serie se encola con su client_id para sincronizarse en lote con la API.
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CalibrationInput, LoadSuggestion, RoutineDTO, SessionSummary, SetInput } from "@lifemaxxing/core";
import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { PlannedItem } from "../features/workout/logic";

export interface ActiveWorkout {
  sessionId: string;
  routine: RoutineDTO;
  useAlt: Record<string, boolean>;
  items: PlannedItem[];
  /** Item actual. */
  i: number;
  startedAt: string;
  /** Reps en reserva elegidas para la serie de prueba. */
  rir: number;
  /** Sugerencias de carga con las que se armó la sesión (para cambiar a la alternativa). */
  suggestions: Record<string, LoadSuggestion>;
  calibrate: boolean;
}

export interface RestCalibration {
  e1rmKg: number;
  loads: number[];
  perHand: boolean;
}

/** Lo que se muestra en grande durante el descanso para motivar: cuántas series faltan del ejercicio. */
export interface RestMotivation {
  /** "Quedan 2 series", "¡Última serie!", "¡Ejercicio listo!"… */
  headline: string;
  /** "de press inclinado con barra", "Sigue: sentadilla con barra"… */
  sub: string;
  /** Series del ejercicio: hechas, la siguiente y las que faltan (sin calentamientos). */
  dots: ("done" | "next" | "left")[];
  /** Series hechas y totales del día. */
  dayDone: number;
  dayTotal: number;
}

export interface RestState {
  endAt: number;
  total: number;
  title: string;
  next: string | null;
  /** Texto extra (p. ej. 1RM estimado tras la serie de prueba). */
  info: string | null;
  /** 1RM y cargas tras la serie de prueba, para mostrarlos en grande. */
  cal?: RestCalibration | null;
  motivation?: RestMotivation | null;
  notificationId: string | null;
}

export type PendingOp =
  | { id: string; type: "sets"; sessionId: string; sets: SetInput[] }
  | { id: string; type: "calibration"; sessionId: string; body: CalibrationInput };

interface WorkoutState {
  active: ActiveWorkout | null;
  rest: RestState | null;
  queue: PendingOp[];
  lastSummary: SessionSummary | null;
  setActive: (a: ActiveWorkout | null) => void;
  patchActive: (p: Partial<ActiveWorkout>) => void;
  setRest: (r: RestState | null) => void;
  enqueue: (op: PendingOp) => void;
  dropOps: (ids: string[]) => void;
  /** Quita exactamente esta operación (por identidad): si se fusionaron series nuevas en ella, es otro objeto y se conserva. */
  removeOp: (op: PendingOp) => void;
  setSummary: (s: SessionSummary | null) => void;
  reset: () => void;
}

export const useWorkout = create<WorkoutState>()(
  persist(
    (set) => ({
      active: null,
      rest: null,
      queue: [],
      lastSummary: null,
      setActive: (active) => set({ active }),
      patchActive: (p) => set((s) => (s.active ? { active: { ...s.active, ...p } } : {})),
      setRest: (rest) => set({ rest }),
      enqueue: (op) =>
        set((s) => {
          // Fusiona lotes de series consecutivos de la misma sesión (último valor por client_id).
          const last = s.queue[s.queue.length - 1];
          if (op.type === "sets" && last?.type === "sets" && last.sessionId === op.sessionId) {
            const byId = new Map(last.sets.map((x) => [x.clientId, x]));
            for (const x of op.sets) byId.set(x.clientId, x);
            return { queue: [...s.queue.slice(0, -1), { ...last, sets: [...byId.values()] }] };
          }
          return { queue: [...s.queue, op] };
        }),
      dropOps: (ids) => set((s) => ({ queue: s.queue.filter((x) => !ids.includes(x.id)) })),
      removeOp: (op) => set((s) => ({ queue: s.queue.filter((x) => x !== op) })),
      setSummary: (lastSummary) => set({ lastSummary }),
      reset: () => set({ active: null, rest: null, queue: [] }),
    }),
    {
      name: "lmx-workout",
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ active: s.active, rest: s.rest, queue: s.queue, lastSummary: s.lastSummary }),
    },
  ),
);

/** Espacio extra al final de las pantallas cuando la barra de descanso minimizada flota sobre el contenido. */
export function useRestBarSpace(): number {
  return useWorkout((s) => (s.rest ? 104 : 0));
}

/** ¿Ya se cargó el estado persistido? (para no mostrar "Entrenar" un instante antes de "Reanudar"). */
export function useWorkoutHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useWorkout.persist.hasHydrated());
  useEffect(() => useWorkout.persist.onFinishHydration(() => setHydrated(true)), []);
  return hydrated;
}

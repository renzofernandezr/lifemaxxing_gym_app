// Acciones del modo Entrenar: empezar, registrar series, cambiar de ejercicio, terminar y descartar.
import {
  calibrate,
  fk,
  localDate,
  SCHEME_NAME,
  unitLabel,
  weightText,
  type LoadSuggestion,
  type RoutineDTO,
  type SessionSummary,
  type TodayResponse,
  type WorkoutSessionDTO,
} from "@lifemaxxing/core";
import * as Crypto from "expo-crypto";
import { router } from "expo-router";
import { api, ApiError, SLOW_TIMEOUT_MS } from "../../lib/api";
import { invalidateTraining } from "../../lib/queries";
import { primeRestFeedback, skipRest, startRest } from "../../lib/rest";
import { flushQueue } from "../../lib/sync";
import { useWorkout, type ActiveWorkout, type RestMotivation } from "../../store/workout";
import {
  applyServerSets,
  buildItems,
  logItem,
  nextPending,
  replanWeight,
  resolveRe,
  restAfter,
  setsLeft,
  skipExercise,
  skipItem,
  toSetInput,
  unskipItem,
  type PlannedItem,
} from "./logic";

const uid = () => Crypto.randomUUID();
const st = () => useWorkout.getState();

export class StartConflict extends Error {
  constructor(public activeSessionId: string) {
    super("Ya tienes un entrenamiento en curso");
  }
}

/** Crea la sesión en la API y arma las series. Necesita conexión. */
export async function startWorkout(routine: RoutineDTO, suggestions: Record<string, LoadSuggestion>, calibrate: boolean, timezone: string) {
  await primeRestFeedback();
  let session: WorkoutSessionDTO;
  try {
    session = await api<WorkoutSessionDTO>("/api/sessions", {
      method: "POST",
      body: { routineId: routine.id, date: localDate(new Date(), timezone) },
      timeoutMs: SLOW_TIMEOUT_MS,
    });
  } catch (err) {
    if (err instanceof ApiError && err.code === "session_active") {
      throw new StartConflict((err.details as { activeSessionId?: string } | undefined)?.activeSessionId ?? "");
    }
    throw err;
  }
  const items = buildItems(routine, suggestions, { calibrate, useAlt: {} });
  const active: ActiveWorkout = {
    sessionId: session.id,
    routine,
    useAlt: {},
    items,
    i: Math.max(0, nextPending(items)),
    startedAt: session.startedAt,
    rir: 2,
    suggestions,
    calibrate,
  };
  st().setActive(active);
  st().setRest(null);
  router.push("/entrenar/sesion");
}

/** Reanuda en este dispositivo una sesión en curso que está en el servidor. */
export async function resumeFromServer(sessionId: string) {
  await primeRestFeedback();
  const [{ session }, today] = await Promise.all([
    api<{ session: WorkoutSessionDTO }>(`/api/sessions/${sessionId}`),
    api<TodayResponse>("/api/program/today"),
  ]);
  let routine = today.routines.find((r) => r.id === session.routineId);
  if (!routine) {
    const all = await api<{ routines: RoutineDTO[] }>(`/api/program/routines?phase=${session.phaseId}`);
    routine = all.routines.find((r) => r.id === session.routineId);
  }
  if (!routine) throw new Error("No encuentro la rutina de esta sesión");
  // Si se usó la alternativa de algún ejercicio, reflejarlo.
  const useAlt: Record<string, boolean> = {};
  for (const re of routine.exercises) if (re.altExerciseId && session.sets.some((s) => s.exerciseId === re.altExerciseId)) useAlt[re.id] = true;
  const items = applyServerSets(buildItems(routine, today.suggestions, { calibrate: false, useAlt }), session);
  st().setActive({
    sessionId: session.id,
    routine,
    useAlt,
    items,
    i: Math.max(0, nextPending(items)),
    startedAt: session.startedAt,
    rir: 2,
    suggestions: today.suggestions,
    calibrate: false,
  });
  router.push("/entrenar/sesion");
}

function itemTitle(a: ActiveWorkout, it: PlannedItem): string {
  const re = a.routine.exercises[it.ei];
  const ex = resolveRe(re, !!a.useAlt[re.id]);
  if (it.kind === "warmup") return `Calentamiento ${it.k + 1}`;
  if (it.kind === "test") return "Serie de prueba";
  if (ex.scheme === "rest_pause") return it.k === 0 ? "Activación" : `Mini-serie ${it.k}`;
  return `Serie ${it.k + 1} de ${it.n}`;
}

/** Texto de la siguiente serie para el descanso: "Press militar · Serie 1 de 3 · 40 kg × 6–8 reps". */
export function nextText(a: ActiveWorkout, it: PlannedItem): string {
  const re = a.routine.exercises[it.ei];
  const ex = resolveRe(re, !!a.useAlt[re.id]);
  const target = it.lo === it.hi ? String(it.lo) : `${it.lo}–${it.hi}`;
  const w = ex.scheme === "cardio" || it.pending ? "" : `${weightText(ex, it.w)} × `;
  return `${ex.exercise.name} · ${itemTitle(a, it)} · ${w}${target} ${unitLabel(it.unit)}`;
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Lo que el descanso muestra en grande: cuántas series faltan del ejercicio, o que se terminó y cuál sigue. */
export function motivationFor(a: ActiveWorkout, items: PlannedItem[], logged: PlannedItem, nx: PlannedItem): RestMotivation {
  const nameOf = (ei: number) => {
    const re = a.routine.exercises[ei];
    return lowerFirst(resolveRe(re, !!a.useAlt[re.id]).exercise.name);
  };
  const name = nameOf(logged.ei);
  const series = items.filter((x) => x.ei === logged.ei && x.kind !== "warmup" && (x.done || !x.skip));
  const dots = series.map((x) => (x.done ? "done" : x === nx ? "next" : "left") as RestMotivation["dots"][number]);
  const left = setsLeft(items, logged.ei);
  const re = a.routine.exercises[logged.ei];
  const mini = resolveRe(re, !!a.useAlt[re.id]).scheme === "rest_pause" && logged.kind === "work";
  const day = items.filter((x) => x.kind !== "warmup" && (x.done || !x.skip));
  let headline: string;
  let sub: string;
  if (nx.ei !== logged.ei) {
    headline = "¡Ejercicio listo!";
    sub = `Sigue: ${nameOf(nx.ei)}`;
  } else if (logged.kind === "warmup") {
    headline = nx.kind === "warmup" ? "Calentando" : "¡A las series!";
    sub = `${left} ${left === 1 ? "serie" : "series"} de ${name}`;
  } else if (left === 1) {
    headline = mini ? "¡Última mini-serie!" : "¡Última serie!";
    sub = `de ${name}. ¡Dale con todo!`;
  } else {
    headline = `Quedan ${left} ${mini ? "mini-series" : "series"}`;
    sub = `de ${name}`;
  }
  return { headline, sub, dots, dayDone: day.filter((x) => x.done).length, dayTotal: day.length };
}

/** Registra el item actual (o `idx`) y arranca el descanso. Devuelve el récord/calibración para avisar en la UI. */
export async function logSet(idx: number, w: number, r: number) {
  const a = st().active;
  if (!a) return null;
  const it = a.items[idx];
  if (!it || it.done) return null;
  const clientId = uid();
  const res = logItem(a.routine, a.useAlt, a.items, idx, { w, r, clientId, rir: it.kind === "test" ? a.rir : undefined });
  const logged = res.items[idx];
  const next = nextPending(res.items, idx + 1);
  st().patchActive({ items: res.items, i: next === -1 ? idx : next });
  st().enqueue({ id: uid(), type: "sets", sessionId: a.sessionId, sets: [toSetInput(logged)] });
  if (res.calibration) {
    const cal = res.calibration;
    st().enqueue({ id: uid(), type: "calibration", sessionId: a.sessionId, body: { exerciseId: cal.exerciseId, weightKg: cal.weightKg, reps: cal.reps, rir: cal.rir } });
  }
  flushQueue();

  if (next === -1) {
    await skipRest();
    return { finished: true, calibration: res.calibration };
  }
  const nx = res.items[next];
  const re = a.routine.exercises[it.ei];
  const ex = resolveRe(re, !!a.useAlt[re.id]);
  const secs = restAfter(logged, nx);
  if (secs > 0) {
    const kind = it.kind === "warmup" ? "calentamiento" : it.kind === "test" ? "serie de prueba" : SCHEME_NAME[ex.scheme].toLowerCase();
    const title = `Descanso · ${kind}${nx.ei !== it.ei ? " · cambio de ejercicio" : ""}`;
    const info = res.calibration
      ? `Tu 1RM estimado en ${ex.exercise.name.toLowerCase()}: ${fk(Math.round(res.calibration.e1rmKg * 2) / 2)} kg. Series de hoy: ${res.calibration.loads.map(fk).join(" / ")} kg${ex.exercise.equipment === "mancuernas" ? " por mano" : ""}.`
      : null;
    const cal = res.calibration
      ? { e1rmKg: res.calibration.e1rmKg, loads: res.calibration.loads, perHand: ex.exercise.equipment === "mancuernas" }
      : null;
    const motivation = motivationFor(a, res.items, logged, nx);
    await startRest(secs, title, nextText({ ...a, items: res.items }, nx), { info, cal, motivation });
  }
  return { finished: false, calibration: res.calibration };
}

/** Corrige una serie ya registrada (se reenvía con el mismo client_id: upsert idempotente). */
export function editDoneSet(idx: number, w: number, r: number) {
  const a = st().active;
  const it = a?.items[idx];
  if (!a || !it?.done) return;
  let items = a.items.map((x, i) => (i === idx ? { ...x, done: { ...x.done!, w, r } } : x));
  st().enqueue({ id: uid(), type: "sets", sessionId: a.sessionId, sets: [toSetInput(items[idx])] });
  if (it.kind === "test") {
    // Corregir la serie de prueba recalcula el 1RM y las cargas de las series que faltan.
    const re = a.routine.exercises[it.ei];
    const ex = resolveRe(re, !!a.useAlt[re.id]);
    const rir = it.done.rir ?? a.rir;
    const cal = calibrate(ex, { weightKg: w, reps: r, rir });
    items = items.map((x) =>
      x.ei === it.ei && x.kind === "work" && !x.done ? { ...x, w: cal.loads[x.k] ?? x.w, r: x.lo, cal: cal.e1rmKg, pending: false } : x,
    );
    st().enqueue({ id: uid(), type: "calibration", sessionId: a.sessionId, body: { exerciseId: ex.exerciseId, weightKg: w, reps: r, rir } });
  }
  st().patchActive({ items });
  flushQueue();
}

/** Cambia el peso/reps planificados de una serie futura. */
export function planSet(idx: number, w: number | null, r: number | null) {
  const a = st().active;
  if (!a) return;
  let items = a.items;
  if (w !== null) items = replanWeight(a.routine, a.useAlt, items, idx, w);
  if (r !== null) items = items.map((x, i) => (i === idx ? { ...x, r } : x));
  st().patchActive({ items });
}

export function setCurrent(idx: number) {
  const a = st().active;
  if (!a || !a.items[idx] || a.items[idx].done) return;
  st().patchActive({ i: idx });
}

/** Salta al primer pendiente de un ejercicio (para cambiar el orden si la máquina está ocupada). */
export function goToExercise(ei: number) {
  const a = st().active;
  if (!a) return;
  const idx = a.items.findIndex((x) => x.ei === ei && !x.done && !x.skip);
  if (idx >= 0) st().patchActive({ i: idx });
}

export function setRir(rir: number) {
  st().patchActive({ rir });
}

/** Vuelve a poner como pendientes las series saltadas (para retomar ejercicios). */
export function unskipAll() {
  const a = st().active;
  if (!a) return;
  const items = a.items.map((x) => (x.skip && !x.done ? { ...x, skip: false } : x));
  const next = nextPending(items, 0);
  st().patchActive({ items, i: next === -1 ? a.i : next });
}

/** La sesión ya no existe en el servidor (borrada, o se reinició el modo demo): se limpia la copia local. */
export class SessionGone extends Error {
  constructor() {
    super("Esta sesión ya no existe en el servidor. Puedes empezar otra.");
  }
}

/** Índice de la serie actual (la elegida o la siguiente pendiente). -1 si no queda nada. */
function currentIdx(a: ActiveWorkout): number {
  const cur = a.items[a.i];
  return cur && !cur.done && !cur.skip ? a.i : nextPending(a.items, a.i);
}

/** Salta solo la serie actual: queda marcada y se puede retomar tocando su punto. */
export function skipCurrentSet() {
  const a = st().active;
  if (!a) return;
  const idx = currentIdx(a);
  if (idx < 0) return;
  const items = skipItem(a.items, idx);
  const next = nextPending(items, idx + 1);
  st().patchActive({ items, i: next === -1 ? idx : next });
}

/** Retoma una serie saltada y la deja como actual. */
export function unskipSet(idx: number) {
  const a = st().active;
  if (!a || !a.items[idx]?.skip) return;
  st().patchActive({ items: unskipItem(a.items, idx), i: idx });
}

export function skipCurrentExercise(): boolean {
  const a = st().active;
  if (!a) return false;
  const idx = currentIdx(a);
  const ei = a.items[idx]?.ei;
  if (ei === undefined) return false;
  const items = skipExercise(a.items, ei);
  const next = nextPending(items, a.i);
  st().patchActive({ items, i: next === -1 ? a.i : next });
  return next === -1;
}

/** Cambia a la alternativa (o vuelve al principal) si aún no hay series hechas de ese ejercicio. */
export function switchAlternative(ei: number, alt: boolean) {
  const a = st().active;
  if (!a) return;
  const re = a.routine.exercises[ei];
  if (!re.alt || a.items.some((x) => x.ei === ei && x.done)) return;
  const useAlt = { ...a.useAlt, [re.id]: alt };
  const rebuilt = buildItems(a.routine, a.suggestions, { calibrate: a.calibrate, useAlt }).filter((x) => x.ei === ei);
  const before = a.items.filter((x) => x.ei < ei);
  const after = a.items.filter((x) => x.ei > ei);
  const items = [...before, ...rebuilt, ...after];
  st().patchActive({ useAlt, items, i: before.length });
}

export class SyncPending extends Error {}

/** Sincroniza todo y cierra la sesión en la API. */
/** Si la sesión ya terminó en el servidor (respuesta perdida u otro dispositivo), trae su resumen guardado. */
async function serverOutcome(sessionId: string): Promise<{ status: WorkoutSessionDTO["status"]; summary: SessionSummary | null }> {
  const r = await api<{ session: WorkoutSessionDTO; summary: SessionSummary | null }>(`/api/sessions/${sessionId}`);
  return { status: r.session.status, summary: r.summary };
}

async function clearLocal(sessionId: string) {
  const s = st();
  if (s.active?.sessionId === sessionId) {
    await skipRest();
    s.setActive(null);
    s.dropOps(s.queue.filter((q) => q.sessionId === sessionId).map((q) => q.id));
  }
}

function showSummary(summary: SessionSummary) {
  st().setSummary(summary);
  invalidateTraining();
  router.replace("/entrenar/resumen");
}

/** Sincroniza todo y cierra la sesión en la API. */
export async function finishWorkout(): Promise<SessionSummary> {
  const a = st().active;
  if (!a) throw new Error("No hay sesión en curso");
  const ok = await flushQueue();
  if (!ok) throw new SyncPending("Hay series sin sincronizar. Revisa tu conexión e inténtalo de nuevo");
  let summary: SessionSummary;
  try {
    summary = await api<SessionSummary>(`/api/sessions/${a.sessionId}/finish`, { method: "POST", timeoutMs: SLOW_TIMEOUT_MS });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      await clearLocal(a.sessionId);
      invalidateTraining();
      router.dismissTo("/entrenar");
      throw new SessionGone();
    }
    if (!(err instanceof ApiError && err.code === "session_closed")) throw err;
    const out = await serverOutcome(a.sessionId);
    await clearLocal(a.sessionId);
    if (out.status !== "finished" || !out.summary) {
      invalidateTraining();
      router.dismissTo("/entrenar");
      throw new Error("Esta sesión se descartó en otro dispositivo");
    }
    summary = out.summary;
  }
  await clearLocal(a.sessionId);
  showSummary(summary);
  return summary;
}

/**
 * Descarta la sesión. Desde una sesión en curso (`onlyInProgress`) el servidor no borra un entreno que ya terminó:
 * en ese caso se muestra su resumen y devuelve "finished".
 */
export async function discardWorkout(sessionId: string, opts: { onlyInProgress?: boolean } = {}): Promise<"discarded" | "finished"> {
  try {
    await api(`/api/sessions/${sessionId}/discard`, { method: "POST", body: { onlyInProgress: !!opts.onlyInProgress } });
  } catch (err) {
    // Si ya no existe en el servidor, descartarla es solo limpiar la copia local.
    if (err instanceof ApiError && err.status === 404) {
      await clearLocal(sessionId);
      invalidateTraining();
      return "discarded";
    }
    if (opts.onlyInProgress && err instanceof ApiError && err.code === "session_closed") {
      const out = await serverOutcome(sessionId);
      await clearLocal(sessionId);
      if (out.summary) showSummary(out.summary);
      else invalidateTraining();
      return "finished";
    }
    throw err;
  }
  await clearLocal(sessionId);
  const s = st();
  if (s.lastSummary?.sessionId === sessionId) s.setSummary(null);
  invalidateTraining();
  return "discarded";
}

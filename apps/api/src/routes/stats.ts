import {
  addDays,
  bodyComp,
  clean,
  dayNumber,
  KEY_LIFTS,
  e1rm,
  localDate,
  mondayOf,
  plannedSessionsUntil,
  programPosition,
  STRENGTH_IDS,
  type ActivityResponse,
  type LiftSeries,
  type LiftsResponse,
  type OverviewResponse,
} from "@lifemaxxing/core";
import { Hono } from "hono";
import { requireAuth } from "../auth/middleware";
import type { AppEnv } from "../context";
import { exerciseCatalog, routineById } from "../services/program";
import { getProfile } from "../services/user";
import { toCheckin } from "./body";

const LIFT_WEEKLY_GOAL = 3;

export const statsRoutes = new Hono<AppEnv>()
  .use(requireAuth)
  .get("/overview", async (c) => {
    const { db } = c.get("deps");
    const userId = c.get("user").id;
    const profile = await getProfile(db, userId);
    const today = localDate(new Date(), profile.timezone);
    const [ck, sess] = await Promise.all([
      db.query("select * from body_checkins where user_id = $1 order by measured_on", [userId]),
      db.query<{ date: string; routine_id: string }>(
        `select (started_at at time zone $2)::date::text as date, routine_id
           from workout_sessions where user_id = $1 and status = 'finished' order by started_at`,
        [userId, profile.timezone],
      ),
    ]);
    const checkins = ck.rows.map(toCheckin);
    const first = checkins[0];
    const last = checkins[checkins.length - 1];

    let weight: OverviewResponse["weight"] = null;
    if (last) {
      const startKg = profile.startWeightKg ?? first.weightKg;
      const baseDate = profile.startWeightKg != null ? profile.programStartDate : first.measuredOn;
      const weeks = (dayNumber(last.measuredOn) - dayNumber(baseDate)) / 7;
      const deltaKg = clean(last.weightKg - startKg);
      weight = {
        currentKg: last.weightKg,
        startKg,
        deltaKg,
        ratePerWeekKg: weeks >= 1 ? Math.round((deltaKg / weeks) * 100) / 100 : null,
        goalKg: profile.goalWeightKg,
      };
    }
    const withFat = checkins.filter((x) => x.bodyFatPct != null);
    let bodyFat: OverviewResponse["bodyFat"] = null;
    let lean: OverviewResponse["lean"] = null;
    if (withFat.length) {
      const f0 = withFat[0];
      const f1 = withFat[withFat.length - 1];
      const c0 = bodyComp(f0.weightKg, f0.bodyFatPct!);
      const c1 = bodyComp(f1.weightKg, f1.bodyFatPct!);
      const many = withFat.length > 1;
      bodyFat = {
        currentPct: f1.bodyFatPct!,
        startPct: f0.bodyFatPct,
        deltaPts: many ? Math.round((f1.bodyFatPct! - f0.bodyFatPct!) * 10) / 10 : null,
        fatKg: Math.round(c1.fatKg * 10) / 10,
      };
      const dw = f1.weightKg - f0.weightKg;
      const dl = c1.leanKg - c0.leanKg;
      lean = {
        currentKg: Math.round(c1.leanKg * 10) / 10,
        deltaKg: many ? Math.round(dl * 10) / 10 : null,
        shareOfLossPct: many && dw < 0 ? Math.round((Math.max(0, -dl) / -dw) * 100) : null,
      };
    }

    const sinceStart = sess.rows.filter((r) => r.date >= profile.programStartDate);
    const planned = plannedSessionsUntil(today, profile.programStartDate);
    const perWeek = new Map<string, number>();
    for (const r of sess.rows) {
      const key = (await routineById(db, r.routine_id)).key;
      if (key === "C") continue;
      const w = mondayOf(r.date);
      perWeek.set(w, (perWeek.get(w) ?? 0) + 1);
    }
    const thisMonday = mondayOf(today);
    const thisWeekDone = perWeek.get(thisMonday) ?? 0;
    let streak = thisWeekDone >= LIFT_WEEKLY_GOAL ? 1 : 0;
    for (let w = addDays(thisMonday, -7); (perWeek.get(w) ?? 0) >= LIFT_WEEKLY_GOAL; w = addDays(w, -7)) streak++;

    const res: OverviewResponse = {
      position: programPosition(today, profile.programStartDate, profile.timezone),
      weight,
      bodyFat,
      lean,
      sessions: { done: sinceStart.length, planned, pct: planned ? Math.round((sinceStart.length / planned) * 100) : 0 },
      streak: { weeks: streak, thisWeekDone, thisWeekPlanned: LIFT_WEEKLY_GOAL },
      lastCheckin: last ?? null,
      checkinsCount: checkins.length,
    };
    return c.json(res);
  })
  .get("/lifts", async (c) => {
    const { db } = c.get("deps");
    const userId = c.get("user").id;
    const profile = await getProfile(db, userId);
    // Todos los ejercicios con carga o reps (Fuerza muestra la evolución de cada uno).
    const ids = STRENGTH_IDS;
    const [sets, bw, catalog] = await Promise.all([
      db.query<{ exercise_id: string; session_id: string; date: string; weight_kg: number; reps: number }>(
        `select ws.exercise_id, ws.session_id, (s.started_at at time zone $3)::date::text as date, ws.weight_kg, ws.reps
           from workout_sets ws join workout_sessions s on s.id = ws.session_id
          where s.user_id = $1 and s.status = 'finished' and ws.kind = 'work' and ws.reps > 0
            and ws.exercise_id = any($2)
          order by s.started_at, ws.set_index`,
        [userId, ids, profile.timezone],
      ),
      db.query<{ weight_kg: number }>("select weight_kg from body_checkins where user_id = $1 order by measured_on desc limit 1", [userId]),
      exerciseCatalog(db),
    ]);
    const series = new Map<string, LiftSeries>();
    for (const id of ids) series.set(id, { exerciseId: id, name: catalog.get(id)?.name ?? id, points: [] });
    let pullups: number | null = null;
    for (const r of sets.rows) {
      if ((r.exercise_id === "chin_w" || r.exercise_id === "pull_w") && r.weight_kg === 0) pullups = Math.max(pullups ?? 0, r.reps);
      const s = series.get(r.exercise_id)!;
      let p = s.points.find((x) => x.sessionId === r.session_id);
      const est = clean(e1rm(r.weight_kg, r.reps));
      if (!p) {
        p = { date: r.date, sessionId: r.session_id, weightKg: r.weight_kg, reps: r.reps, e1rmKg: est };
        s.points.push(p);
        continue;
      }
      if (r.weight_kg > p.weightKg || (r.weight_kg === p.weightKg && r.reps > p.reps)) {
        p.weightKg = r.weight_kg;
        p.reps = r.reps;
      }
      p.e1rmKg = Math.max(p.e1rmKg, est);
    }
    const res: LiftsResponse = {
      lifts: [...series.values()].filter((s) => KEY_LIFTS.includes(s.exerciseId) || s.points.length),
      bodyWeightKg: bw.rows[0]?.weight_kg ?? profile.startWeightKg,
      pullups,
    };
    return c.json(res);
  })
  .get("/activity", async (c) => {
    const { db } = c.get("deps");
    const userId = c.get("user").id;
    const profile = await getProfile(db, userId);
    const weeks = Math.max(1, Math.min(104, Number(c.req.query("weeks") ?? 26) || 26));
    const to = localDate(new Date(), profile.timezone);
    const from = addDays(mondayOf(to), -(weeks - 1) * 7);
    const { rows } = await db.query<{ date: string; routine_id: string; sessions: number; volume: number }>(
      `select (started_at at time zone $2)::date::text as date, routine_id, count(*) as sessions,
              coalesce(sum((summary->>'volumeKg')::numeric), 0) as volume
         from workout_sessions
        where user_id = $1 and status = 'finished'
          and (started_at at time zone $2)::date between $3::date and $4::date
        group by 1, 2 order by 1`,
      [userId, profile.timezone, from, to],
    );
    const res: ActivityResponse = {
      from,
      to,
      programStartDate: profile.programStartDate,
      days: await Promise.all(
        rows.map(async (r) => ({ date: r.date, routineKey: (await routineById(db, r.routine_id)).key, volumeKg: r.volume, sessions: r.sessions })),
      ),
    };
    return c.json(res);
  });

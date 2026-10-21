import {
  calibrate,
  calibrationSchema,
  programPosition,
  setsBatchSchema,
  startSessionSchema,
  type CalibrationResponse,
  type HistoryResponse,
} from "@lifemaxxing/core";
import { Hono } from "hono";
import { requireAuth } from "../auth/middleware";
import { body, type AppEnv } from "../context";
import { tx } from "../db/pool";
import { ApiError } from "../errors";
import { resolveFor, routineById } from "../services/program";
import { getProfile } from "../services/user";
import {
  assertInProgress,
  buildSummary,
  getSessionRow,
  historyItem,
  sessionDTO,
  toCalDTO,
  toSetDTO,
  type SessionRow,
  type SetRow,
} from "../services/workouts";

const pgCode = (err: unknown) => (err as { code?: string })?.code;

export const sessionRoutes = new Hono<AppEnv>()
  .use(requireAuth)
  .post("/", async (c) => {
    const { db } = c.get("deps");
    const user = c.get("user");
    const input = await body(c, startSessionSchema);
    const routine = await routineById(db, input.routineId);
    const profile = await getProfile(db, user.id);
    const pos = programPosition(input.date ?? new Date(), profile.programStartDate, profile.timezone);
    const week = Math.max(1, Math.min(24, pos.week));
    try {
      const { rows } = await db.query<SessionRow>(
        `insert into workout_sessions (user_id, routine_id, program_week, phase_id) values ($1, $2, $3, $4) returning *`,
        [user.id, routine.id, week, pos.phase.id],
      );
      return c.json(await sessionDTO(db, rows[0]), 201);
    } catch (err) {
      if (pgCode(err) === "23505") {
        const { rows } = await db.query<{ id: string }>(
          "select id from workout_sessions where user_id = $1 and status = 'in_progress'",
          [user.id],
        );
        throw new ApiError(409, "session_active", "Ya tienes un entrenamiento en curso", { activeSessionId: rows[0]?.id });
      }
      throw err;
    }
  })
  .get("/active", async (c) => {
    const { db } = c.get("deps");
    const { rows } = await db.query<SessionRow>(
      "select * from workout_sessions where user_id = $1 and status = 'in_progress'",
      [c.get("user").id],
    );
    return c.json({ session: rows[0] ? await sessionDTO(db, rows[0]) : null });
  })
  .get("/", async (c) => {
    const { db } = c.get("deps");
    const limit = Math.max(1, Math.min(100, Number(c.req.query("limit") ?? 20) || 20));
    const before = c.req.query("before");
    const beforeDate = before && !Number.isNaN(Date.parse(before)) ? new Date(before) : null;
    const { rows } = await db.query<SessionRow>(
      `select * from workout_sessions
        where user_id = $1 and status = 'finished' and ($2::timestamptz is null or started_at < $2)
        order by started_at desc limit $3`,
      [c.get("user").id, beforeDate, limit + 1],
    );
    const page = rows.slice(0, limit);
    const items = await Promise.all(page.map(async (s) => historyItem(s, await routineById(db, s.routine_id))));
    const res: HistoryResponse = {
      items,
      nextBefore: rows.length > limit ? page[page.length - 1].started_at.toISOString() : null,
    };
    return c.json(res);
  })
  .get("/:id", async (c) => {
    const { db } = c.get("deps");
    const s = await getSessionRow(db, c.get("user").id, c.req.param("id"));
    return c.json({ session: await sessionDTO(db, s), summary: s.summary });
  })
  .post("/:id/sets", async (c) => {
    const { db } = c.get("deps");
    const s = await getSessionRow(db, c.get("user").id, c.req.param("id"));
    assertInProgress(s);
    const { sets } = await body(c, setsBatchSchema);
    try {
      const saved = await tx(db, async (t) => {
        const out: SetRow[] = [];
        for (const x of sets) {
          const { rows } = await t.query<SetRow>(
            `insert into workout_sets (client_id, session_id, exercise_id, kind, set_index, weight_kg, reps, duration_sec,
                                       rir, target_min, target_max, rest_sec, completed_at)
             values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, coalesce($13::timestamptz, now()))
             on conflict (client_id) do update set
               exercise_id = excluded.exercise_id, kind = excluded.kind, set_index = excluded.set_index,
               weight_kg = excluded.weight_kg, reps = excluded.reps, duration_sec = excluded.duration_sec,
               rir = excluded.rir, target_min = excluded.target_min, target_max = excluded.target_max,
               rest_sec = excluded.rest_sec, completed_at = excluded.completed_at
             where workout_sets.session_id = excluded.session_id
             returning *`,
            [
              x.clientId, s.id, x.exerciseId, x.kind, x.setIndex, x.weightKg, x.reps ?? null, x.durationSec ?? null,
              x.rir ?? null, x.targetMin ?? null, x.targetMax ?? null, x.restSec ?? null, x.completedAt ?? null,
            ],
          );
          if (!rows[0]) throw new ApiError(409, "client_id_conflict", "Esa serie pertenece a otra sesión");
          out.push(rows[0]);
        }
        return out;
      });
      return c.json({ sets: saved.map(toSetDTO) });
    } catch (err) {
      if (pgCode(err) === "23503") throw new ApiError(400, "unknown_exercise", "Ejercicio desconocido");
      throw err;
    }
  })
  .delete("/:id/sets/:clientId", async (c) => {
    const { db } = c.get("deps");
    const s = await getSessionRow(db, c.get("user").id, c.req.param("id"));
    assertInProgress(s);
    await db.query("delete from workout_sets where session_id = $1 and client_id::text = $2", [s.id, c.req.param("clientId")]);
    return c.json({ ok: true });
  })
  .post("/:id/calibrations", async (c) => {
    const { db } = c.get("deps");
    const user = c.get("user");
    const s = await getSessionRow(db, user.id, c.req.param("id"));
    assertInProgress(s);
    const input = await body(c, calibrationSchema);
    const routine = await routineById(db, s.routine_id);
    const ex = routine.exercises.map((re) => resolveFor(re, input.exerciseId)).find(Boolean);
    if (!ex) throw new ApiError(400, "not_in_routine", "Ese ejercicio no está en la rutina de esta sesión");
    if (ex.scheme === "cardio") throw new ApiError(400, "not_calibratable", "Este ejercicio no se calibra");
    const r = calibrate(ex, { weightKg: input.weightKg, reps: input.reps, rir: input.rir });
    const { rows } = await db.query(
      `insert into exercise_calibrations (user_id, exercise_id, session_id, test_weight_kg, test_reps, rir, e1rm_kg)
       values ($1, $2, $3, $4, $5, $6, $7) returning *`,
      [user.id, input.exerciseId, s.id, input.weightKg, input.reps, input.rir, Math.round(r.e1rmKg * 100) / 100],
    );
    const res: CalibrationResponse = { calibration: toCalDTO(rows[0]), e1rmKg: r.e1rmKg, loads: r.loads, reliable: r.reliable };
    return c.json(res, 201);
  })
  .post("/:id/finish", async (c) => {
    const { db } = c.get("deps");
    const s = await getSessionRow(db, c.get("user").id, c.req.param("id"));
    assertInProgress(s);
    const { rows: cnt } = await db.query<{ n: number }>(
      "select count(*) as n from workout_sets where session_id = $1 and kind = 'work'",
      [s.id],
    );
    if (!cnt[0]?.n) throw new ApiError(400, "empty_session", "No registraste ninguna serie. Descarta la sesión si no entrenaste");
    const routine = await routineById(db, s.routine_id);
    const finishedAt = new Date();
    const summary = await buildSummary(db, s, routine, finishedAt);
    const { rowCount } = await db.query(
      `update workout_sessions set status = 'finished', finished_at = $2, summary = $3
        where id = $1 and status = 'in_progress'`,
      [s.id, finishedAt, JSON.stringify(summary)],
    );
    if (!rowCount) throw new ApiError(409, "session_closed", "Esta sesión ya terminó");
    return c.json(summary);
  })
  .post("/:id/discard", async (c) => {
    const { db } = c.get("deps");
    const s = await getSessionRow(db, c.get("user").id, c.req.param("id"));
    if (s.status === "discarded") return c.json({ ok: true });
    await db.query("update workout_sessions set status = 'discarded', finished_at = coalesce(finished_at, now()) where id = $1", [s.id]);
    return c.json({ ok: true });
  });

import { addDays, localDate, mondayOf, nextSession, PHASES, programPosition, type RoutinesResponse, type TodayResponse } from "@lifemaxxing/core";
import { Hono } from "hono";
import { requireAuth } from "../auth/middleware";
import type { AppEnv } from "../context";
import { badRequest } from "../errors";
import { routineById, routinesForTemplate } from "../services/program";
import { suggestionsForRoutines } from "../services/suggestions";
import { getProfile } from "../services/user";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export const programRoutes = new Hono<AppEnv>()
  .use(requireAuth)
  .get("/today", async (c) => {
    const { db } = c.get("deps");
    const userId = c.get("user").id;
    const profile = await getProfile(db, userId);
    const q = c.req.query("date");
    if (q && !ISO.test(q)) throw badRequest("Fecha inválida (AAAA-MM-DD)");
    const date = q ?? localDate(new Date(), profile.timezone);
    const position = programPosition(date, profile.programStartDate, profile.timezone);
    const next = nextSession(date, profile.programStartDate);
    const routines = await routinesForTemplate(db, position.templatePhase);
    const [suggestions, active, week] = await Promise.all([
      suggestionsForRoutines(db, userId, routines),
      db.query<{ id: string; routine_id: string; started_at: Date }>(
        "select id, routine_id, started_at from workout_sessions where user_id = $1 and status = 'in_progress'",
        [userId],
      ),
      db.query<{ date: string; routine_id: string }>(
        `select (started_at at time zone $2)::date::text as date, routine_id from workout_sessions
          where user_id = $1 and status = 'finished'
            and (started_at at time zone $2)::date between $3::date and $4::date
          order by started_at`,
        [userId, profile.timezone, mondayOf(date), addDays(mondayOf(date), 6)],
      ),
    ]);
    const a = active.rows[0];
    const res: TodayResponse = {
      position,
      next,
      suggestedKey: position.routineKey ?? next.routineKey ?? "A",
      routines,
      suggestions,
      activeSession: a
        ? { id: a.id, routineId: a.routine_id, routineKey: (await routineById(db, a.routine_id)).key, startedAt: a.started_at.toISOString() }
        : null,
      weekDone: await Promise.all(week.rows.map(async (r) => ({ date: r.date, routineKey: (await routineById(db, r.routine_id)).key }))),
    };
    return c.json(res);
  })
  .get("/routines", async (c) => {
    const { db } = c.get("deps");
    const profile = await getProfile(db, c.get("user").id);
    const q = c.req.query("phase");
    const phaseId = q ? Number(q) : programPosition(new Date(), profile.programStartDate, profile.timezone).phase.id;
    const phase = PHASES.find((p) => p.id === phaseId);
    if (!phase) throw badRequest("Fase inválida (1, 2 o 3)");
    const res: RoutinesResponse = { phase: phase.id, templatePhase: phase.templatePhase, routines: await routinesForTemplate(db, phase.templatePhase) };
    return c.json(res);
  });

import { checkinFeedback, checkinSchema, measurementSchema, type CheckinDTO, type CheckinPostResponse, type MeasurementDTO } from "@lifemaxxing/core";
import { Hono } from "hono";
import { requireAuth } from "../auth/middleware";
import { body, type AppEnv } from "../context";
import { notFound } from "../errors";

interface CheckinRow {
  id: string;
  measured_on: string;
  weight_kg: number;
  body_fat_pct: number | null;
  note: string | null;
}
interface MeasurementRow {
  id: string;
  measured_on: string;
  chest_cm: number | null;
  arm_cm: number | null;
  waist_cm: number | null;
}

export const toCheckin = (r: CheckinRow): CheckinDTO => ({
  id: r.id,
  measuredOn: r.measured_on,
  weightKg: r.weight_kg,
  bodyFatPct: r.body_fat_pct,
  note: r.note,
});
const toMeasurement = (r: MeasurementRow): MeasurementDTO => ({
  id: r.id,
  measuredOn: r.measured_on,
  chestCm: r.chest_cm,
  armCm: r.arm_cm,
  waistCm: r.waist_cm,
});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const checkinRoutes = new Hono<AppEnv>()
  .use(requireAuth)
  .get("/", async (c) => {
    const { rows } = await c.get("deps").db.query<CheckinRow>(
      "select * from body_checkins where user_id = $1 order by measured_on",
      [c.get("user").id],
    );
    return c.json({ checkins: rows.map(toCheckin) });
  })
  .post("/", async (c) => {
    const { db } = c.get("deps");
    const userId = c.get("user").id;
    const input = await body(c, checkinSchema);
    const { rows } = await db.query<CheckinRow>(
      `insert into body_checkins (user_id, measured_on, weight_kg, body_fat_pct, note) values ($1, $2, $3, $4, $5)
       on conflict (user_id, measured_on) do update
         set weight_kg = excluded.weight_kg, body_fat_pct = excluded.body_fat_pct, note = excluded.note
       returning *`,
      [userId, input.measuredOn, input.weightKg, input.bodyFatPct ?? null, input.note ?? null],
    );
    const prev = await db.query<CheckinRow>(
      "select * from body_checkins where user_id = $1 and measured_on < $2 order by measured_on desc limit 1",
      [userId, input.measuredOn],
    );
    const p = prev.rows[0];
    const res: CheckinPostResponse = {
      checkin: toCheckin(rows[0]),
      feedback: checkinFeedback(p ? { weightKg: p.weight_kg, bodyFatPct: p.body_fat_pct } : null, {
        weightKg: rows[0].weight_kg,
        bodyFatPct: rows[0].body_fat_pct,
      }),
    };
    return c.json(res, 201);
  })
  .delete("/:id", async (c) => {
    const id = c.req.param("id");
    if (!UUID.test(id)) throw notFound("Check-in");
    const { rowCount } = await c.get("deps").db.query("delete from body_checkins where id = $1 and user_id = $2", [id, c.get("user").id]);
    if (!rowCount) throw notFound("Check-in");
    return c.json({ ok: true });
  });

export const measurementRoutes = new Hono<AppEnv>()
  .use(requireAuth)
  .get("/", async (c) => {
    const { rows } = await c.get("deps").db.query<MeasurementRow>(
      "select * from body_measurements where user_id = $1 order by measured_on",
      [c.get("user").id],
    );
    return c.json({ measurements: rows.map(toMeasurement) });
  })
  .post("/", async (c) => {
    const input = await body(c, measurementSchema);
    const { rows } = await c.get("deps").db.query<MeasurementRow>(
      `insert into body_measurements (user_id, measured_on, chest_cm, arm_cm, waist_cm) values ($1, $2, $3, $4, $5)
       on conflict (user_id, measured_on) do update
         set chest_cm = excluded.chest_cm, arm_cm = excluded.arm_cm, waist_cm = excluded.waist_cm
       returning *`,
      [c.get("user").id, input.measuredOn, input.chestCm ?? null, input.armCm ?? null, input.waistCm ?? null],
    );
    return c.json({ measurement: toMeasurement(rows[0]) }, 201);
  })
  .delete("/:id", async (c) => {
    const id = c.req.param("id");
    if (!UUID.test(id)) throw notFound("Medida");
    const { rowCount } = await c.get("deps").db.query("delete from body_measurements where id = $1 and user_id = $2", [id, c.get("user").id]);
    if (!rowCount) throw notFound("Medida");
    return c.json({ ok: true });
  });

import { profilePatchSchema } from "@lifemaxxing/core";
import { Hono } from "hono";
import { requireAuth } from "../auth/middleware";
import { body, type AppEnv } from "../context";
import { tx } from "../db/pool";
import { getMe } from "../services/user";

const COLUMNS = {
  heightCm: "height_cm",
  startWeightKg: "start_weight_kg",
  goalWeightKg: "goal_weight_kg",
  programStartDate: "program_start_date",
  theme: "theme",
} as const;

export const profileRoutes = new Hono<AppEnv>()
  .use(requireAuth)
  .get("/", async (c) => c.json(await getMe(c.get("deps").db, c.get("user").id)))
  .patch("/", async (c) => {
    const { db } = c.get("deps");
    const userId = c.get("user").id;
    const input = await body(c, profilePatchSchema);
    await tx(db, async (t) => {
      const sets: string[] = [];
      const vals: unknown[] = [userId];
      for (const [k, col] of Object.entries(COLUMNS) as [keyof typeof COLUMNS, string][]) {
        if (input[k] !== undefined) {
          vals.push(input[k]);
          sets.push(`${col} = $${vals.length}`);
        }
      }
      if (sets.length) await t.query(`update profiles set ${sets.join(", ")}, updated_at = now() where user_id = $1`, vals);
      if (input.name !== undefined) await t.query("update users set name = $2 where id = $1", [userId, input.name]);
    });
    return c.json(await getMe(db, userId));
  });

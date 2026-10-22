import type { MeResponse, ProfileDTO } from "@lifemaxxing/core";
import type { Db } from "../db/pool";
import { notFound } from "../errors";

interface ProfileRow {
  height_cm: number | null;
  start_weight_kg: number | null;
  goal_weight_kg: number | null;
  program_start_date: string;
  timezone: string;
  theme: ProfileDTO["theme"];
}

export const toProfile = (r: ProfileRow): ProfileDTO => ({
  heightCm: r.height_cm,
  startWeightKg: r.start_weight_kg,
  goalWeightKg: r.goal_weight_kg,
  programStartDate: r.program_start_date,
  timezone: r.timezone,
  theme: r.theme,
});

export async function getProfile(db: Db, userId: string): Promise<ProfileDTO> {
  const { rows } = await db.query<ProfileRow>("select * from profiles where user_id = $1", [userId]);
  if (!rows[0]) throw notFound("Perfil");
  return toProfile(rows[0]);
}

export async function getMe(db: Db, userId: string): Promise<MeResponse> {
  const { rows } = await db.query<ProfileRow & { id: string; email: string; name: string; created_at: Date }>(
    `select u.id, u.email, u.name, u.created_at, p.*
       from users u join profiles p on p.user_id = u.id where u.id = $1`,
    [userId],
  );
  const r = rows[0];
  if (!r) throw notFound("Usuario");
  return {
    user: { id: r.id, email: r.email, name: r.name, createdAt: r.created_at.toISOString() },
    profile: toProfile(r),
  };
}

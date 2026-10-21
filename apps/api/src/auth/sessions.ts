import type { Db } from "../db/pool";
import { hashToken, newToken } from "./crypto";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  sessionId: string;
}

export async function createSession(db: Db, userId: string, ttlDays: number, userAgent: string | null): Promise<string> {
  const token = newToken();
  await db.query(
    `insert into sessions (user_id, token_hash, user_agent, expires_at)
     values ($1, $2, $3, now() + make_interval(days => $4))`,
    [userId, hashToken(token), userAgent?.slice(0, 300) ?? null, ttlDays],
  );
  return token;
}

/** Busca la sesión por hash del token. Expiración deslizante: a lo más una escritura por hora. */
export async function findSession(db: Db, token: string, ttlDays: number): Promise<AuthUser | null> {
  const { rows } = await db.query<{ session_id: string; id: string; email: string; name: string; stale: boolean }>(
    `select s.id as session_id, u.id, u.email, u.name, s.last_seen_at < now() - interval '1 hour' as stale
       from sessions s join users u on u.id = s.user_id
      where s.token_hash = $1 and s.expires_at > now()`,
    [hashToken(token)],
  );
  const r = rows[0];
  if (!r) return null;
  if (r.stale) {
    await db.query(
      "update sessions set last_seen_at = now(), expires_at = now() + make_interval(days => $2) where id = $1",
      [r.session_id, ttlDays],
    );
  }
  return { id: r.id, email: r.email, name: r.name, sessionId: r.session_id };
}

export async function deleteSession(db: Db, sessionId: string): Promise<void> {
  await db.query("delete from sessions where id = $1", [sessionId]);
}

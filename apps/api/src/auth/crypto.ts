import { createHash, randomBytes } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";

// Algorithm.Argon2id = 2 (const enum de @node-rs/argon2, no se puede importar con isolatedModules).
const ARGON2ID = 2 as const;
const OPTS = { algorithm: ARGON2ID as never, memoryCost: 19_456, timeCost: 2, parallelism: 1 };

export const hashPassword = (password: string) => hash(password, OPTS);

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/** Hash fijo para comparar cuando el usuario no existe (mismo costo de tiempo). */
let dummy: Promise<string> | null = null;
export const dummyHash = () => (dummy ??= hashPassword("contraseña-inexistente-para-igualar-tiempos"));

/** Token de sesión: 32 bytes aleatorios en base64url. */
export const newToken = () => randomBytes(32).toString("base64url");

/** sha256 del token: es lo único que se guarda. */
export const hashToken = (token: string) => createHash("sha256").update(token).digest();

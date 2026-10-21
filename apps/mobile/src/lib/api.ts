import type { ApiErrorBody } from "@lifemaxxing/core";
import { API_URL, IS_NATIVE } from "./config";
import { demoRequest, isDemo } from "./demo";
import { getToken } from "./token";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
  get isNetwork() {
    return this.status === 0;
  }
  get isAuth() {
    return this.status === 401;
  }
}

let onUnauthorized: (() => void) | null = null;
/** El AuthProvider registra qué hacer cuando la API responde 401 (sesión expirada). */
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

export async function api<T>(path: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const method = init.method ?? "GET";
  if (isDemo()) return demoRequest<T>(method, path, init.body);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (IS_NATIVE) {
    headers["X-Client"] = "mobile";
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      credentials: "include",
      signal: init.signal,
    });
  } catch {
    throw new ApiError(0, "network", "Sin conexión. Lo intentaremos de nuevo");
  }
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    const err = (data as ApiErrorBody | null)?.error;
    if (res.status === 401 && !path.startsWith("/api/auth/login")) onUnauthorized?.();
    throw new ApiError(res.status, err?.code ?? "http_" + res.status, err?.message ?? "Algo salió mal. Inténtalo de nuevo", err?.details);
  }
  return data as T;
}

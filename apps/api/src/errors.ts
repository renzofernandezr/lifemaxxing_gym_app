import type { ContentfulStatusCode } from "hono/utils/http-status";

/** Error de la API con forma { error: { code, message } } y mensaje en español. */
export class ApiError extends Error {
  constructor(
    public status: ContentfulStatusCode,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (what = "Recurso") => new ApiError(404, "not_found", `${what} no encontrado`);
export const badRequest = (message: string, details?: unknown) => new ApiError(400, "bad_request", message, details);

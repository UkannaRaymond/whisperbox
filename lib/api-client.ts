import type { ApiResult } from "@/types/api";

/**
 * Thin fetch wrapper for the `/api/v1/*` REST API, used by TanStack Query
 * hooks throughout the frontend. Parses the standard success/error
 * envelope (types/api.ts) once, here, instead of every hook re-deriving
 * it.
 *
 * (features/offline/services/sync-engine.ts has its own small internal
 * copy of this same logic — that file is already built and tested from
 * Stage 09; duplicating a few lines here rather than refactoring it to
 * share this client keeps that stage's tested code untouched.)
 */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export async function apiFetch<TData>(path: string, init?: RequestInit): Promise<TData> {
  const response = await fetch(path, { credentials: "include", ...init });
  const body: ApiResult<TData> = await response.json();

  if (!response.ok || !body.success) {
    const error = !body.success ? body.error : { code: "UNKNOWN", message: "Request failed" };
    throw new ApiRequestError(error.message, error.code, response.status);
  }

  return body.data;
}

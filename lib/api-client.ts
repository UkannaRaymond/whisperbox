import type { ApiResult } from "@/types/api";

/** Shared REST client for the `/api/v1/*` API. */
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

  if (response.status === 204) {
    return undefined as TData;
  }

  const body: ApiResult<TData> = await response.json();

  if (!response.ok || !body.success) {
    const error = !body.success ? body.error : { code: "UNKNOWN", message: "Request failed" };
    throw new ApiRequestError(error.message, error.code, response.status);
  }

  return body.data;
}

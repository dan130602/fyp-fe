// Thin fetch wrapper: attaches the bearer token, throws ApiError on non-2xx. Not React-aware.
import { getIdToken } from "../auth/cognito-auth.ts";
import { createLogger } from "./logger.ts";

const log = createLogger("api");
const DEV = import.meta.env.DEV;

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

/** Mirrors the backend's ErrorResponse record; `details` is only populated on validation errors. */
export interface BackendErrorBody {
  timestamp?: string;
  status?: number;
  error?: string;
  message?: string;
  details?: string[];
}

function isBackendErrorBody(value: unknown): value is BackendErrorBody {
  return typeof value === "object" && value !== null;
}

/** Thrown on any non-2xx response. Callers branch on `status` — 401 vs 403 are semantically distinct. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: BackendErrorBody | undefined;

  constructor(status: number, message: string, body?: BackendErrorBody) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }
}

/** Parses the body as JSON, tolerating an empty or non-JSON response. */
async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const idToken = await getIdToken();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (idToken) headers.set("Authorization", `Bearer ${idToken}`);

  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  const body = await parseBody(response);

  if (!response.ok) {
    const errorBody = isBackendErrorBody(body) ? body : undefined;
    const message = errorBody?.message ?? `Request failed with status ${response.status}`;
    DEV && log.debug("Request failed", path, "status", response.status);
    throw new ApiError(response.status, message, errorBody);
  }

  return body as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET" });
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  const headers = new Headers({ "Content-Type": "application/json" });
  return request<T>(path, { method: "POST", headers, body: JSON.stringify(body) });
}

export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const headers = new Headers({ "Content-Type": "application/json" });
  return request<T>(path, { method: "PATCH", headers, body: JSON.stringify(body) });
}

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../auth/cognito-auth.ts", () => ({ getIdToken: vi.fn() }));

const { getIdToken } = await import("../../auth/cognito-auth.ts");
const { apiGet, ApiError } = await import("../api-client.ts");

const mockGetIdToken = vi.mocked(getIdToken);

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  mockGetIdToken.mockReset();
  vi.stubGlobal("fetch", vi.fn());
});

describe("apiGet", () => {
  it("attaches the bearer token from getIdToken", async () => {
    mockGetIdToken.mockResolvedValue("the-id-token");
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { ok: true }));

    await apiGet("/api/users/me");

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer the-id-token");
  });

  it("omits the Authorization header when there is no session", async () => {
    mockGetIdToken.mockResolvedValue(null);
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { ok: true }));

    await apiGet("/api/users/me");

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.has("Authorization")).toBe(false);
  });

  it("resolves with the parsed JSON body on success", async () => {
    mockGetIdToken.mockResolvedValue("token");
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { id: "u1", role: "COMPLIANCE_OFFICER" }));

    const result = await apiGet("/api/users/me");
    expect(result).toEqual({ id: "u1", role: "COMPLIANCE_OFFICER" });
  });

  it("throws an ApiError with status 401 and the backend message when unauthenticated", async () => {
    mockGetIdToken.mockResolvedValue(null);
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(401, {
        status: 401,
        error: "Unauthorized",
        message: "Missing or invalid authentication token",
      }),
    );

    await expect(apiGet("/api/users/me")).rejects.toMatchObject({
      status: 401,
      message: "Missing or invalid authentication token",
    });
  });

  it("throws an ApiError with status 403 when logged in but forbidden", async () => {
    mockGetIdToken.mockResolvedValue("token");
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(403, {
        status: 403,
        error: "Forbidden",
        message: "You do not have permission to perform this action",
      }),
    );

    await expect(apiGet("/api/users/me")).rejects.toMatchObject({
      status: 403,
      message: "You do not have permission to perform this action",
    });
  });

  it("distinguishes 401 from 403 via isUnauthorized/isForbidden", async () => {
    mockGetIdToken.mockResolvedValue(null);
    vi.mocked(fetch).mockResolvedValue(jsonResponse(401, { message: "nope" }));

    try {
      await apiGet("/api/users/me");
      expect.unreachable("apiGet should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as InstanceType<typeof ApiError>;
      expect(apiErr.isUnauthorized).toBe(true);
      expect(apiErr.isForbidden).toBe(false);
    }
  });

  it("carries the parsed body on the ApiError instance", async () => {
    mockGetIdToken.mockResolvedValue("token");
    const body = { status: 403, error: "Forbidden", message: "nope", details: [] };
    vi.mocked(fetch).mockResolvedValue(jsonResponse(403, body));

    try {
      await apiGet("/api/users/me");
      expect.unreachable("apiGet should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as InstanceType<typeof ApiError>;
      expect(apiErr.status).toBe(403);
      expect(apiErr.body).toEqual(body);
    }
  });

  it("falls back to a generic message when the error body is not JSON", async () => {
    mockGetIdToken.mockResolvedValue(null);
    vi.mocked(fetch).mockResolvedValue(new Response("not json", { status: 500 }));

    await expect(apiGet("/api/users/me")).rejects.toMatchObject({
      status: 500,
      message: "Request failed with status 500",
    });
  });
});

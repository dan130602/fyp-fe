import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../auth/cognito-auth.ts", () => ({ getIdToken: vi.fn() }));

const { getIdToken } = await import("../../auth/cognito-auth.ts");
const { listMediaAssets, getPlaybackUrl, getMediaAssetAnalysis, submitReview } = await import(
  "../playback-api.ts"
);
const { ApiError } = await import("../../lib/api-client.ts");

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

describe("listMediaAssets", () => {
  it("attaches the bearer token and parses the array response", async () => {
    mockGetIdToken.mockResolvedValue("the-id-token");
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(200, [
        {
          id: "a1",
          originalFilename: "call.mp3",
          contentType: "audio/mpeg",
          fileSizeBytes: 1024,
          status: "PENDING",
          createdAt: "2026-09-06T10:00:00",
        },
      ]),
    );

    const result = await listMediaAssets();

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("/api/media-assets");
    const headers = new Headers(init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer the-id-token");
    expect(result).toEqual([
      {
        id: "a1",
        originalFilename: "call.mp3",
        contentType: "audio/mpeg",
        fileSizeBytes: 1024,
        status: "PENDING",
        createdAt: "2026-09-06T10:00:00",
      },
    ]);
  });
});

describe("getPlaybackUrl", () => {
  it("attaches the bearer token and requests the id's playback-url path", async () => {
    mockGetIdToken.mockResolvedValue("the-id-token");
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(200, { url: "https://s3.example/x", expiresIn: 3600 }),
    );

    const result = await getPlaybackUrl("a1");

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("/api/media-assets/a1/playback-url");
    const headers = new Headers(init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer the-id-token");
    expect(result).toEqual({ url: "https://s3.example/x", expiresIn: 3600 });
  });

  it("surfaces a 404 (missing or another user's asset) as an ApiError", async () => {
    mockGetIdToken.mockResolvedValue("token");
    vi.mocked(fetch).mockImplementation(async () =>
      jsonResponse(404, { status: 404, error: "Not Found", message: "Media asset not found" }),
    );

    try {
      await getPlaybackUrl("someone-elses");
      expect.unreachable("getPlaybackUrl should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err).toMatchObject({ status: 404, message: "Media asset not found" });
    }
  });
});

describe("getMediaAssetAnalysis", () => {
  it("attaches the bearer token and requests the id's analysis path", async () => {
    mockGetIdToken.mockResolvedValue("the-id-token");
    const body = {
      mediaAssetId: "a1",
      fileName: "call.mp3",
      assetStatus: "COMPLETED",
      analysisStatus: "PENDING",
      failureReason: null,
      result: null,
      review: null,
    };
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, body));

    const result = await getMediaAssetAnalysis("a1");

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("/api/media-assets/a1/analysis");
    const headers = new Headers(init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer the-id-token");
    expect(result).toEqual(body);
  });
});

describe("submitReview", () => {
  it("PUTs the overrides as JSON with the bearer token and returns the saved review", async () => {
    mockGetIdToken.mockResolvedValue("the-id-token");
    const saved = {
      reviewedBy: "u1",
      reviewedAt: "2026-10-24T09:30:00",
      overrides: [{ checklistItemId: "K01", aiVerdict: "PASS", decision: "FAIL", comment: "No" }],
    };
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, saved));

    const overrides = [{ checklistItemId: "K01", decision: "FAIL" as const, comment: "No" }];
    const result = await submitReview("a1", overrides);

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("/api/media-assets/a1/review");
    expect(init?.method).toBe("PUT");
    const headers = new Headers(init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer the-id-token");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(JSON.parse(init?.body as string)).toEqual({ overrides });
    expect(result).toEqual(saved);
  });

  it("surfaces a 409 (analysis not ready) as an ApiError", async () => {
    mockGetIdToken.mockResolvedValue("token");
    vi.mocked(fetch).mockImplementation(async () =>
      jsonResponse(409, { status: 409, error: "Conflict", message: "Analysis is not ready" }),
    );

    await expect(submitReview("a1", [])).rejects.toMatchObject({
      status: 409,
      message: "Analysis is not ready",
    });
  });
});

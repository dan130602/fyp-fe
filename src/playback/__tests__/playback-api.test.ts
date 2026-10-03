import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../auth/cognito-auth.ts", () => ({ getIdToken: vi.fn() }));

const { getIdToken } = await import("../../auth/cognito-auth.ts");
const { listMediaAssets, getPlaybackUrl, getMediaAssetAnalysis } = await import(
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

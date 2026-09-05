import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../auth/cognito-auth.ts", () => ({ getIdToken: vi.fn() }));

const { getIdToken } = await import("../../auth/cognito-auth.ts");
const { requestPresignedUploads, putToS3, S3UploadError } = await import("../upload-api.ts");

const mockGetIdToken = vi.mocked(getIdToken);

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Minimal fake XHR so putToS3 can be tested without a real network or jsdom's stub XHR quirks. */
class FakeXHR {
  static instances: FakeXHR[] = [];
  method = "";
  url = "";
  status = 0;
  requestHeaders: Record<string, string> = {};
  upload = { onprogress: null as ((e: ProgressEvent) => void) | null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sentBody: unknown;

  constructor() {
    FakeXHR.instances.push(this);
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.requestHeaders[name] = value;
  }
  send(body: unknown) {
    this.sentBody = body;
  }
}

beforeEach(() => {
  mockGetIdToken.mockReset();
  vi.stubGlobal("fetch", vi.fn());
  FakeXHR.instances = [];
  vi.stubGlobal("XMLHttpRequest", FakeXHR);
});

describe("requestPresignedUploads", () => {
  it("posts the file metadata and attaches the bearer token", async () => {
    mockGetIdToken.mockResolvedValue("the-id-token");
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(200, {
        uploads: [
          {
            fileName: "call.mp3",
            objectKey: "uploads/u1/x-call.mp3",
            presignedUrl: "https://s3.example/x",
            expiresIn: 900,
          },
        ],
      }),
    );

    const result = await requestPresignedUploads([
      { fileName: "call.mp3", contentType: "audio/mpeg", fileSize: 1024 },
    ]);

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("/api/uploads/presigned-urls");
    const headers = new Headers(init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer the-id-token");
    expect(JSON.parse(init?.body as string)).toEqual({
      files: [{ fileName: "call.mp3", contentType: "audio/mpeg", fileSize: 1024 }],
    });
    expect(result.uploads[0].objectKey).toBe("uploads/u1/x-call.mp3");
  });

  it("surfaces the backend's specific validation message on 400", async () => {
    mockGetIdToken.mockResolvedValue("token");
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(400, {
        status: 400,
        error: "Bad Request",
        message: "File extension is not allowed for file 'call.txt'",
      }),
    );

    await expect(
      requestPresignedUploads([
        { fileName: "call.txt", contentType: "audio/mpeg", fileSize: 1024 },
      ]),
    ).rejects.toMatchObject({
      status: 400,
      message: "File extension is not allowed for file 'call.txt'",
    });
  });
});

describe("putToS3", () => {
  it("PUTs with the given Content-Type and no Authorization header", async () => {
    const file = new File(["abc"], "call.mp3", { type: "audio/mpeg" });
    const promise = putToS3("https://s3.example/presigned", file, "audio/mpeg");

    const xhr = FakeXHR.instances[0];
    expect(xhr.method).toBe("PUT");
    expect(xhr.url).toBe("https://s3.example/presigned");
    expect(xhr.requestHeaders["Content-Type"]).toBe("audio/mpeg");
    expect(xhr.requestHeaders.Authorization).toBeUndefined();
    expect("Authorization" in xhr.requestHeaders).toBe(false);
    expect(xhr.sentBody).toBe(file);

    xhr.status = 200;
    xhr.onload?.();
    await expect(promise).resolves.toBeUndefined();
  });

  it("reports upload progress via onprogress", async () => {
    const file = new File(["abc"], "call.mp3", { type: "audio/mpeg" });
    const onProgress = vi.fn();
    const promise = putToS3("https://s3.example/presigned", file, "audio/mpeg", onProgress);

    const xhr = FakeXHR.instances[0];
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 } as ProgressEvent);
    expect(onProgress).toHaveBeenCalledWith(0.5);

    xhr.status = 200;
    xhr.onload?.();
    await promise;
  });

  it("rejects with S3UploadError when S3 returns a non-2xx status", async () => {
    const file = new File(["abc"], "call.mp3", { type: "audio/mpeg" });
    const promise = putToS3("https://s3.example/presigned", file, "audio/mpeg");

    const xhr = FakeXHR.instances[0];
    xhr.status = 403;
    xhr.onload?.();

    await expect(promise).rejects.toBeInstanceOf(S3UploadError);
    await expect(promise).rejects.toMatchObject({ status: 403 });
  });

  it("rejects with S3UploadError on a network error", async () => {
    const file = new File(["abc"], "call.mp3", { type: "audio/mpeg" });
    const promise = putToS3("https://s3.example/presigned", file, "audio/mpeg");

    const xhr = FakeXHR.instances[0];
    xhr.onerror?.();

    await expect(promise).rejects.toBeInstanceOf(S3UploadError);
  });
});

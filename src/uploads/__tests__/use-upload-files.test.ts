import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../upload-api.ts", async () => {
  const actual = await vi.importActual<typeof import("../upload-api.ts")>("../upload-api.ts");
  return { ...actual, requestPresignedUploads: vi.fn(), putToS3: vi.fn() };
});

const { requestPresignedUploads, putToS3, S3UploadError } = await import("../upload-api.ts");
const { useUploadFiles } = await import("../use-upload-files.ts");

const mockPresign = vi.mocked(requestPresignedUploads);
const mockPut = vi.mocked(putToS3);

let queryClient: QueryClient;
let invalidate: ReturnType<typeof vi.spyOn>;

function wrapper({ children }: { children: React.ReactNode }) {
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

const options = {
  checklist: [{ id: "K01", question: "Q" }],
  advisorId: "a1",
  processingMode: "immediate" as const,
};

function target(name: string, expiresIn = 900) {
  return {
    uploads: [
      {
        id: `id-${name}`,
        fileName: name,
        objectKey: `uploads/${name}`,
        presignedUrl: `https://s3.example/${name}`,
        expiresIn,
      },
    ],
  };
}

const mp3 = (name: string) => new File(["abc"], name, { type: "audio/mpeg" });

beforeEach(() => {
  queryClient = new QueryClient();
  invalidate = vi.spyOn(queryClient, "invalidateQueries");
  mockPresign.mockReset();
  mockPut.mockReset();
  mockPresign.mockImplementation(async (files) => target(files[0].fileName));
});

afterEach(() => vi.restoreAllMocks());

describe("useUploadFiles", () => {
  it("presigns once per file with a one-item array and PUTs each", async () => {
    mockPut.mockResolvedValue(undefined);
    const { result } = renderHook(() => useUploadFiles(), { wrapper });
    const a = mp3("a.mp3");
    const b = mp3("b.mp3");

    let outcome: { succeeded: number; failed: number } | undefined;
    await act(async () => {
      outcome = await result.current.start([a, b], options);
    });

    expect(outcome).toEqual({ succeeded: 2, failed: 0 });
    expect(mockPresign).toHaveBeenCalledTimes(2);
    expect(mockPresign).toHaveBeenCalledWith(
      [
        {
          fileName: "a.mp3",
          contentType: "audio/mpeg",
          fileSize: 3,
          checklist: options.checklist,
          advisorId: "a1",
        },
      ],
      "immediate",
    );
    expect(mockPut).toHaveBeenCalledWith(
      "https://s3.example/a.mp3",
      a,
      "audio/mpeg",
      expect.any(Function),
    );
    expect(mockPut).toHaveBeenCalledWith(
      "https://s3.example/b.mp3",
      b,
      "audio/mpeg",
      expect.any(Function),
    );
    expect(result.current.items.map((item) => item.status)).toEqual(["done", "done"]);
    expect(result.current.items.every((item) => item.progress === 1)).toBe(true);
  });

  it("marks only the failing file as failed", async () => {
    mockPut.mockImplementation(async (url) => {
      if (url.endsWith("b.mp3")) throw new Error("boom");
    });
    const { result } = renderHook(() => useUploadFiles(), { wrapper });

    let outcome: { succeeded: number; failed: number } | undefined;
    await act(async () => {
      outcome = await result.current.start([mp3("a.mp3"), mp3("b.mp3")], options);
    });

    expect(outcome).toEqual({ succeeded: 1, failed: 1 });
    expect(result.current.items.map((item) => [item.status, item.error])).toEqual([
      ["done", undefined],
      ["failed", "boom"],
    ]);
  });

  it("retry reuses the stored presigned URL while it is still valid", async () => {
    mockPut.mockRejectedValueOnce(new S3UploadError(0, "network")).mockResolvedValue(undefined);
    const { result } = renderHook(() => useUploadFiles(), { wrapper });
    await act(async () => {
      await result.current.start([mp3("a.mp3")], options);
    });

    let ok = false;
    await act(async () => {
      ok = await result.current.retry(result.current.items[0].key);
    });

    expect(ok).toBe(true);
    expect(mockPresign).toHaveBeenCalledTimes(1);
    expect(mockPut).toHaveBeenCalledTimes(2);
    expect(mockPut.mock.calls[1][0]).toBe("https://s3.example/a.mp3");
    expect(result.current.items[0].status).toBe("done");
  });

  it("retry re-presigns when the URL is within 60s of expiry", async () => {
    mockPresign.mockImplementation(async (files) => target(files[0].fileName, 30));
    mockPut.mockRejectedValueOnce(new S3UploadError(0, "network")).mockResolvedValue(undefined);
    const { result } = renderHook(() => useUploadFiles(), { wrapper });
    await act(async () => {
      await result.current.start([mp3("a.mp3")], options);
    });

    await act(async () => {
      await result.current.retry(result.current.items[0].key);
    });

    expect(mockPresign).toHaveBeenCalledTimes(2);
  });

  it("retry re-presigns when the URL has aged into the expiry margin", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1_000_000);
    mockPut.mockRejectedValueOnce(new S3UploadError(0, "network")).mockResolvedValue(undefined);
    const { result } = renderHook(() => useUploadFiles(), { wrapper });
    await act(async () => {
      await result.current.start([mp3("a.mp3")], options);
    });
    now.mockReturnValue(1_000_000 + 850_000);

    await act(async () => {
      await result.current.retry(result.current.items[0].key);
    });

    expect(mockPresign).toHaveBeenCalledTimes(2);
  });

  it("retry re-presigns after a 403 from S3", async () => {
    mockPut
      .mockRejectedValueOnce(new S3UploadError(403, "Upload to storage failed with status 403"))
      .mockResolvedValue(undefined);
    const { result } = renderHook(() => useUploadFiles(), { wrapper });
    await act(async () => {
      await result.current.start([mp3("a.mp3")], options);
    });

    await act(async () => {
      await result.current.retry(result.current.items[0].key);
    });

    expect(mockPresign).toHaveBeenCalledTimes(2);
  });

  it("retry presigns when the original presign failed", async () => {
    mockPresign.mockRejectedValueOnce(new Error("presign down"));
    mockPut.mockResolvedValue(undefined);
    const { result } = renderHook(() => useUploadFiles(), { wrapper });
    await act(async () => {
      await result.current.start([mp3("a.mp3")], options);
    });
    expect(result.current.items[0]).toMatchObject({ status: "failed", error: "presign down" });
    expect(mockPut).not.toHaveBeenCalled();

    let ok = false;
    await act(async () => {
      ok = await result.current.retry(result.current.items[0].key);
    });

    expect(ok).toBe(true);
    expect(mockPresign).toHaveBeenCalledTimes(2);
  });

  it("invalidates the media asset list after a success, but not when every file fails", async () => {
    mockPut.mockResolvedValue(undefined);
    const { result } = renderHook(() => useUploadFiles(), { wrapper });
    await act(async () => {
      await result.current.start([mp3("a.mp3")], options);
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["mediaAssets"] });

    invalidate.mockClear();
    mockPut.mockRejectedValue(new Error("boom"));
    await act(async () => {
      await result.current.start([mp3("b.mp3")], options);
    });
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("blocks page unload only while an upload is pending", async () => {
    let finish: () => void = () => {};
    mockPut.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
    const { result } = renderHook(() => useUploadFiles(), { wrapper });

    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = result.current.start([mp3("a.mp3")], options);
    });
    await waitFor(() => expect(result.current.isUploading).toBe(true));

    const during = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(during);
    expect(during.defaultPrevented).toBe(true);

    await act(async () => {
      finish();
      await pending;
    });
    expect(result.current.isUploading).toBe(false);

    const after = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });
});

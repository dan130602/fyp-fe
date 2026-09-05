import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../upload-api.ts", () => ({
  requestPresignedUploads: vi.fn(),
  putToS3: vi.fn(),
}));

const { requestPresignedUploads, putToS3 } = await import("../upload-api.ts");
const { useUploadFile } = await import("../use-upload-file.ts");

const mockPresign = vi.mocked(requestPresignedUploads);
const mockPutToS3 = vi.mocked(putToS3);

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  mockPresign.mockReset();
  mockPutToS3.mockReset();
});

describe("useUploadFile", () => {
  it("presigns then PUTs, resolving with the object key on success", async () => {
    mockPresign.mockResolvedValue({
      uploads: [
        {
          fileName: "call.mp3",
          objectKey: "uploads/u1/x-call.mp3",
          presignedUrl: "https://s3.example/x",
          expiresIn: 900,
        },
      ],
    });
    mockPutToS3.mockResolvedValue(undefined);

    const { result } = renderHook(() => useUploadFile(), { wrapper });
    const file = new File(["abc"], "call.mp3", { type: "audio/mpeg" });

    act(() => result.current.mutate({ file }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      fileName: "call.mp3",
      objectKey: "uploads/u1/x-call.mp3",
    });
    expect(mockPresign).toHaveBeenCalledWith([
      { fileName: "call.mp3", contentType: "audio/mpeg", fileSize: 3 },
    ]);
    expect(mockPutToS3).toHaveBeenCalledWith("https://s3.example/x", file, "audio/mpeg", undefined);
  });

  it("is an error if the presign succeeds but the PUT fails", async () => {
    mockPresign.mockResolvedValue({
      uploads: [
        {
          fileName: "call.mp3",
          objectKey: "uploads/u1/x-call.mp3",
          presignedUrl: "https://s3.example/x",
          expiresIn: 900,
        },
      ],
    });
    mockPutToS3.mockRejectedValue(new Error("Upload to storage failed with status 403"));

    const { result } = renderHook(() => useUploadFile(), { wrapper });
    const file = new File(["abc"], "call.mp3", { type: "audio/mpeg" });

    act(() => result.current.mutate({ file }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Upload to storage failed with status 403");
  });

  it("is an error if the presign request itself fails, and never calls putToS3", async () => {
    mockPresign.mockRejectedValue(new Error("File extension is not allowed for file 'call.txt'"));

    const { result } = renderHook(() => useUploadFile(), { wrapper });
    const file = new File(["abc"], "call.txt", { type: "audio/mpeg" });

    act(() => result.current.mutate({ file }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockPutToS3).not.toHaveBeenCalled();
  });
});

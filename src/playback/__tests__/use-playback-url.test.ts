import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../playback-api.ts", () => ({ getPlaybackUrl: vi.fn() }));

const { getPlaybackUrl } = await import("../playback-api.ts");
const { usePlaybackUrl } = await import("../use-playback-url.ts");

const mockGetPlaybackUrl = vi.mocked(getPlaybackUrl);

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  mockGetPlaybackUrl.mockReset();
});

describe("usePlaybackUrl", () => {
  it("does not fetch when no asset id is selected", () => {
    const { result } = renderHook(() => usePlaybackUrl(undefined), { wrapper });

    expect(result.current.isFetching).toBe(false);
    expect(mockGetPlaybackUrl).not.toHaveBeenCalled();
  });

  it("fetches once an asset id is provided", async () => {
    mockGetPlaybackUrl.mockResolvedValue({ url: "https://s3.example/a1", expiresIn: 3600 });

    const { result } = renderHook(() => usePlaybackUrl("a1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetPlaybackUrl).toHaveBeenCalledWith("a1");
    expect(result.current.data).toEqual({ url: "https://s3.example/a1", expiresIn: 3600 });
  });

  it("refetches when the asset id changes", async () => {
    mockGetPlaybackUrl.mockResolvedValueOnce({ url: "https://s3.example/a1", expiresIn: 3600 });
    mockGetPlaybackUrl.mockResolvedValueOnce({ url: "https://s3.example/a2", expiresIn: 3600 });

    const { result, rerender } = renderHook(({ id }) => usePlaybackUrl(id), {
      wrapper,
      initialProps: { id: "a1" },
    });

    await waitFor(() => expect(result.current.data?.url).toBe("https://s3.example/a1"));

    rerender({ id: "a2" });

    await waitFor(() => expect(result.current.data?.url).toBe("https://s3.example/a2"));
    expect(mockGetPlaybackUrl).toHaveBeenCalledWith("a1");
    expect(mockGetPlaybackUrl).toHaveBeenCalledWith("a2");
    expect(mockGetPlaybackUrl).toHaveBeenCalledTimes(2);
  });
});

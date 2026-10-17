import { describe, expect, it, vi } from "vitest";

vi.mock("../../auth/cognito-auth.ts", () => ({ getIdToken: vi.fn() }));

const { listPollInterval } = await import("../use-playback-url.ts");

type Asset = Parameters<typeof listPollInterval>[0] extends (infer A)[] | undefined ? A : never;

const asset = (status: Asset["status"], processingMode: Asset["processingMode"]): Asset => ({
  id: "a",
  originalFilename: "call.mp3",
  contentType: "audio/mpeg",
  fileSizeBytes: 1,
  status,
  processingMode,
  createdAt: "2026-01-01T00:00:00Z",
});

describe("listPollInterval", () => {
  it("stops when nothing is in flight", () => {
    expect(listPollInterval(undefined)).toBe(false);
    expect(listPollInterval([asset("COMPLETED", "immediate"), asset("FAILED", "batch")])).toBe(
      false,
    );
  });

  it("polls fast while an immediate asset is pending", () => {
    expect(listPollInterval([asset("PENDING", "immediate")])).toBe(10_000);
  });

  it("polls slowly when only batch assets are in flight", () => {
    for (const status of ["PENDING", "QUEUED", "PROCESSING"] as const) {
      expect(listPollInterval([asset(status, "batch")])).toBe(300_000);
    }
  });

  it("polls fast when immediate and batch are both in flight", () => {
    expect(listPollInterval([asset("QUEUED", "batch"), asset("PENDING", "immediate")])).toBe(
      10_000,
    );
  });
});

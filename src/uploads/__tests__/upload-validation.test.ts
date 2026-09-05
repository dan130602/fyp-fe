import { describe, expect, it } from "vitest";
import { MAX_FILE_SIZE_BYTES } from "../upload-constants.ts";
import { validateFile } from "../upload-validation.ts";

function makeFile({ name = "call.mp3", type = "audio/mpeg", size = 1024 } = {}): File {
  const file = new File([new Uint8Array(Math.min(size, 16))], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("validateFile", () => {
  it("accepts an mp3 with matching content type", () => {
    expect(validateFile(makeFile({ name: "call.mp3", type: "audio/mpeg" }))).toEqual({ ok: true });
  });

  it("accepts a wav with audio/x-wav", () => {
    expect(validateFile(makeFile({ name: "call.wav", type: "audio/x-wav" }))).toEqual({ ok: true });
  });

  it("accepts an m4a with audio/mp4", () => {
    expect(validateFile(makeFile({ name: "call.m4a", type: "audio/mp4" }))).toEqual({ ok: true });
  });

  it("rejects a disallowed content type", () => {
    const result = validateFile(makeFile({ name: "call.mp3", type: "text/plain" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/not supported/i);
  });

  it("rejects a disallowed extension even with an allowed content type", () => {
    const result = validateFile(makeFile({ name: "call.txt", type: "audio/mpeg" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/extension/i);
  });

  it("rejects a file with no extension", () => {
    const result = validateFile(makeFile({ name: "call", type: "audio/mpeg" }));
    expect(result.ok).toBe(false);
  });

  it("rejects a zero-byte file", () => {
    const result = validateFile(makeFile({ size: 0 }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/empty/i);
  });

  it("rejects a file over the max size", () => {
    const result = validateFile(makeFile({ size: MAX_FILE_SIZE_BYTES + 1 }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/exceeds/i);
  });

  it("accepts a file exactly at the max size", () => {
    expect(validateFile(makeFile({ size: MAX_FILE_SIZE_BYTES }))).toEqual({ ok: true });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/api-client.ts", () => ({ apiGet: vi.fn() }));

import { apiGet } from "../../lib/api-client.ts";
import { getObservability } from "../observability-api.ts";
import { emptyOverview } from "./fixtures.ts";

describe("observability API", () => {
  beforeEach(() => vi.clearAllMocks());
  it("loads the authenticated production endpoint for the selected window", async () => {
    vi.mocked(apiGet).mockResolvedValue(emptyOverview());
    await getObservability(30);
    expect(apiGet).toHaveBeenCalledExactlyOnceWith("/api/observability?days=30");
  });
  it("propagates an unavailable backend rather than substituting demo statistics", async () => {
    vi.mocked(apiGet).mockRejectedValue(new Error("offline"));
    await expect(getObservability(7)).rejects.toThrow("offline");
  });
  it("rejects a successful response that is not the production metrics contract", async () => {
    vi.mocked(apiGet).mockResolvedValue({ counts: { calls: 175 } });
    await expect(getObservability(7)).rejects.toThrow("production observability records");
  });
});

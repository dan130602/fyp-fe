import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../auth/cognito-auth.ts", () => ({ getIdToken: vi.fn() }));

const { getIdToken } = await import("../../auth/cognito-auth.ts");
const { getComplianceOverview, getDashboardCalls } = await import("../dashboard-api.ts");

function lastUrl(): string {
  return String(vi.mocked(fetch).mock.calls[0]?.[0]);
}

beforeEach(() => {
  vi.mocked(getIdToken).mockResolvedValue("token");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("{}", { status: 200 })),
  );
});

describe("dashboard api", () => {
  it("leaves empty filters out of the query", async () => {
    await getComplianceOverview({ from: "", to: "", department: "" });

    expect(lastUrl()).toMatch(/\/api\/dashboard\/compliance-overview$/);
  });

  it("encodes filters", async () => {
    await getComplianceOverview({
      from: "2026-10-01",
      to: "2026-10-31",
      department: "Private Banking",
    });

    expect(lastUrl()).toContain("from=2026-10-01&to=2026-10-31&department=Private+Banking");
  });

  it("sends the calls scope and keeps page zero", async () => {
    await getDashboardCalls(
      { from: "", to: "", department: "" },
      { advisorId: "a1", outcome: null, page: 0 },
    );

    expect(lastUrl()).toContain("/api/dashboard/calls?advisorId=a1&page=0");
  });
});

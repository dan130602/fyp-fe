import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/api-client.ts", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
}));

const { apiGet, apiPatch, apiPost } = await import("../../lib/api-client.ts");
const { createUser, listUsers, updateUserRole, updateUserStatus } = await import("../users-api.ts");

const mockApiGet = vi.mocked(apiGet);
const mockApiPost = vi.mocked(apiPost);
const mockApiPatch = vi.mocked(apiPatch);

beforeEach(() => {
  mockApiGet.mockReset();
  mockApiPost.mockReset();
  mockApiPatch.mockReset();
});

describe("listUsers", () => {
  it("GETs /api/users", async () => {
    mockApiGet.mockResolvedValue([]);
    await listUsers();
    expect(mockApiGet).toHaveBeenCalledWith("/api/users");
  });
});

describe("createUser", () => {
  it("POSTs the request body to /api/users", async () => {
    mockApiPost.mockResolvedValue({});
    await createUser({ email: "new@example.com", name: "New User", role: "COMPLIANCE_OFFICER" });
    expect(mockApiPost).toHaveBeenCalledWith("/api/users", {
      email: "new@example.com",
      name: "New User",
      role: "COMPLIANCE_OFFICER",
    });
  });
});

describe("updateUserRole", () => {
  it("PATCHes /api/users/{id}/role with the new role", async () => {
    mockApiPatch.mockResolvedValue({});
    await updateUserRole("u1", "ADMIN");
    expect(mockApiPatch).toHaveBeenCalledWith("/api/users/u1/role", { role: "ADMIN" });
  });
});

describe("updateUserStatus", () => {
  it("PATCHes /api/users/{id}/status with the new status", async () => {
    mockApiPatch.mockResolvedValue({});
    await updateUserStatus("u1", "DISABLED");
    expect(mockApiPatch).toHaveBeenCalledWith("/api/users/u1/status", { status: "DISABLED" });
  });
});

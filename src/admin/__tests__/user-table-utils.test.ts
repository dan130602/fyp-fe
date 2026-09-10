import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS, filterUsers, sortUsers } from "../user-table-utils.ts";
import type { AdminUser } from "../users-api.ts";

const USERS: AdminUser[] = [
  {
    id: "1",
    email: "alice@example.com",
    name: "Alice Smith",
    role: "ADMIN",
    status: "ACTIVE",
    createdAt: "2026-01-03T00:00:00Z",
  },
  {
    id: "2",
    email: "bob@example.com",
    name: "Bob Jones",
    role: "COMPLIANCE_OFFICER",
    status: "DISABLED",
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "3",
    email: null,
    name: null,
    role: "MANAGER",
    status: "ACTIVE",
    createdAt: "2026-01-02T00:00:00Z",
  },
];

describe("filterUsers", () => {
  it("returns everything when filters are default", () => {
    expect(filterUsers(USERS, DEFAULT_FILTERS)).toHaveLength(3);
  });

  it("filters by role", () => {
    const result = filterUsers(USERS, { ...DEFAULT_FILTERS, role: "ADMIN" });
    expect(result.map((u) => u.id)).toEqual(["1"]);
  });

  it("filters by status", () => {
    const result = filterUsers(USERS, { ...DEFAULT_FILTERS, status: "DISABLED" });
    expect(result.map((u) => u.id)).toEqual(["2"]);
  });

  it("searches by name case-insensitively", () => {
    const result = filterUsers(USERS, { ...DEFAULT_FILTERS, search: "alice" });
    expect(result.map((u) => u.id)).toEqual(["1"]);
  });

  it("searches by email case-insensitively", () => {
    const result = filterUsers(USERS, { ...DEFAULT_FILTERS, search: "BOB@EXAMPLE" });
    expect(result.map((u) => u.id)).toEqual(["2"]);
  });

  it("does not throw on null name/email and excludes them from a search match", () => {
    const result = filterUsers(USERS, { ...DEFAULT_FILTERS, search: "zzz" });
    expect(result).toHaveLength(0);
  });

  it("combines role, status, and search filters", () => {
    const result = filterUsers(USERS, { search: "alice", role: "ADMIN", status: "ACTIVE" });
    expect(result.map((u) => u.id)).toEqual(["1"]);
  });
});

describe("sortUsers", () => {
  it("sorts by createdAt ascending", () => {
    const result = sortUsers(USERS, "createdAt", "asc");
    expect(result.map((u) => u.id)).toEqual(["2", "3", "1"]);
  });

  it("sorts by createdAt descending", () => {
    const result = sortUsers(USERS, "createdAt", "desc");
    expect(result.map((u) => u.id)).toEqual(["1", "3", "2"]);
  });

  it("sorts by name, placing null names last", () => {
    const result = sortUsers(USERS, "name", "asc");
    expect(result.map((u) => u.id)).toEqual(["1", "2", "3"]);
  });

  it("keeps null names last when sorting descending", () => {
    const result = sortUsers(USERS, "name", "desc");
    expect(result.map((u) => u.id)).toEqual(["2", "1", "3"]);
  });

  it("sorts by role", () => {
    const result = sortUsers(USERS, "role", "asc");
    expect(result.map((u) => u.role)).toEqual(["ADMIN", "COMPLIANCE_OFFICER", "MANAGER"]);
  });

  it("sorts by status", () => {
    const result = sortUsers(USERS, "status", "asc");
    expect(result[0]?.status).toBe("ACTIVE");
  });

  it("does not mutate the input array", () => {
    const copy = [...USERS];
    sortUsers(USERS, "name", "asc");
    expect(USERS).toEqual(copy);
  });
});

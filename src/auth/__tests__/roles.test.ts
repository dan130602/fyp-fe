import { describe, expect, it } from "vitest";
import { homeRouteFor, labelForRole, ROLE_HOME, ROLE_LABELS, ROLES, type Role } from "../roles.ts";

const ALL_ROLES: Role[] = [ROLES.OFFICER, ROLES.DEVELOPER, ROLES.MANAGER];

describe("ROLE_LABELS and ROLE_HOME", () => {
  it("covers every Role with a label", () => {
    for (const role of ALL_ROLES) expect(ROLE_LABELS[role]).toBeTypeOf("string");
  });

  it("covers every Role with a home route", () => {
    for (const role of ALL_ROLES) expect(ROLE_HOME[role]).toBeTypeOf("string");
  });
});

describe("homeRouteFor", () => {
  it.each(ALL_ROLES)("returns the mapped home route for %s", (role) => {
    expect(homeRouteFor(role)).toBe(ROLE_HOME[role]);
  });

  it("falls back to /login for null", () => {
    expect(homeRouteFor(null)).toBe("/login");
  });

  it("falls back to /login for undefined", () => {
    expect(homeRouteFor(undefined)).toBe("/login");
  });

  it("falls back to /login for an unknown role string", () => {
    expect(homeRouteFor("not-a-real-role" as Role)).toBe("/login");
  });
});

describe("labelForRole", () => {
  it.each(ALL_ROLES)("returns the mapped label for %s", (role) => {
    expect(labelForRole(role)).toBe(ROLE_LABELS[role]);
  });

  it("falls back to Unknown role for null", () => {
    expect(labelForRole(null)).toBe("Unknown role");
  });

  it("falls back to Unknown role for undefined", () => {
    expect(labelForRole(undefined)).toBe("Unknown role");
  });

  it("falls back to Unknown role for an unknown role string", () => {
    expect(labelForRole("not-a-real-role" as Role)).toBe("Unknown role");
  });
});

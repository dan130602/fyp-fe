import { describe, expect, it } from "vitest";
import { roleFromBackend } from "../current-user.ts";
import { ROLES } from "../roles.ts";

describe("roleFromBackend", () => {
  it.each([
    ["SUPER_ADMIN", ROLES.ADMIN],
    ["ADMIN", ROLES.ADMIN],
    ["MANAGER", ROLES.MANAGER],
    ["COMPLIANCE_OFFICER", ROLES.OFFICER],
    ["DEVELOPER", ROLES.DEVELOPER],
  ] as const)("maps %s to %s", (backend, expected) => {
    expect(roleFromBackend(backend)).toBe(expected);
  });
});

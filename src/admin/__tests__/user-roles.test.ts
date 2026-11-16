import { describe, expect, it } from "vitest";
import { BACKEND_ROLE_LABELS, BACKEND_ROLES } from "../user-roles.ts";

describe("BACKEND_ROLE_LABELS", () => {
  it("covers every member of BACKEND_ROLES", () => {
    for (const role of Object.values(BACKEND_ROLES)) {
      expect(BACKEND_ROLE_LABELS[role]).toBeTypeOf("string");
      expect(BACKEND_ROLE_LABELS[role].length).toBeGreaterThan(0);
    }
  });

  it("gives ADMIN and MANAGER distinct labels", () => {
    expect(BACKEND_ROLE_LABELS[BACKEND_ROLES.ADMIN]).not.toBe(
      BACKEND_ROLE_LABELS[BACKEND_ROLES.MANAGER],
    );
  });

  it("gives SUPER_ADMIN and ADMIN distinct labels", () => {
    // auth/roles.ts folds SUPER_ADMIN into ADMIN for routing; this table must still tell them apart.
    expect(BACKEND_ROLE_LABELS[BACKEND_ROLES.SUPER_ADMIN]).not.toBe(
      BACKEND_ROLE_LABELS[BACKEND_ROLES.ADMIN],
    );
  });
});

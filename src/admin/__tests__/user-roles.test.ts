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
    // Distinct from ROLE_LABELS[ROLES.ADMIN] in auth/roles.ts, which folds MANAGER into ADMIN
    // for routing and labels both as "Compliance manager". This table shows both roles at once,
    // so collapsing their labels here would defeat the table's purpose.
    expect(BACKEND_ROLE_LABELS[BACKEND_ROLES.ADMIN]).not.toBe(
      BACKEND_ROLE_LABELS[BACKEND_ROLES.MANAGER],
    );
  });
});

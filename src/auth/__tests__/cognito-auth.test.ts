import { describe, expect, it } from "vitest";
import { initialsFor, mapAuthError, resolveName, resolveRole } from "../cognito-auth.ts";

describe("resolveRole", () => {
  it("returns the single group present", () => {
    expect(resolveRole({ "cognito:groups": ["compliance-manager"] })).toBe("compliance-manager");
  });

  it("prioritises officer over manager and developer when all three are present", () => {
    const groups = ["internal-developer", "compliance-manager", "compliance-officer"];
    expect(resolveRole({ "cognito:groups": groups })).toBe("compliance-officer");
  });

  it("prioritises manager over developer when both are present", () => {
    const groups = ["internal-developer", "compliance-manager"];
    expect(resolveRole({ "cognito:groups": groups })).toBe("compliance-manager");
  });

  it("returns null when only unrecognised groups are present", () => {
    expect(resolveRole({ "cognito:groups": ["some-other-team"] })).toBeNull();
  });

  it("returns null for an empty groups array", () => {
    expect(resolveRole({ "cognito:groups": [] })).toBeNull();
  });

  it("returns null when cognito:groups is absent entirely", () => {
    expect(resolveRole({})).toBeNull();
  });
});

describe("initialsFor", () => {
  it("takes the first letter of the first two words", () => {
    expect(initialsFor("Test Officer")).toBe("TO");
  });

  it("takes the first two letters of a single word", () => {
    expect(initialsFor("Cher")).toBe("CH");
  });

  it("ignores extra whitespace between and around words", () => {
    expect(initialsFor("  Test   Officer  ")).toBe("TO");
  });

  it("returns an empty string for empty input", () => {
    expect(initialsFor("")).toBe("");
  });
});

describe("resolveName", () => {
  it("prefers the name claim when present", () => {
    expect(resolveName({ name: "Test Officer", email: "test.officer@example.com" })).toBe(
      "Test Officer",
    );
  });

  it("falls back to a prettified email local-part when name is absent", () => {
    expect(resolveName({ email: "test.officer@example.com" })).toBe("Test Officer");
  });

  it("falls back to the raw username when both name and email are absent", () => {
    expect(resolveName({ "cognito:username": "test-officer" })).toBe("test-officer");
  });

  it("returns an empty string when name, email, and username are all absent", () => {
    expect(resolveName({})).toBe("");
  });
});

describe("mapAuthError", () => {
  it("maps NotAuthorizedException and UserNotFoundException to the identical string", () => {
    const notAuthorized = mapAuthError({ code: "NotAuthorizedException" });
    const notFound = mapAuthError({ code: "UserNotFoundException" });
    expect(notAuthorized).toBe(notFound);
    expect(notAuthorized).toBe("Unrecognised username or password.");
  });

  it("maps PasswordResetRequiredException to its own message", () => {
    expect(mapAuthError({ code: "PasswordResetRequiredException" })).toBe(
      "Your password must be reset before you can sign in. Contact an administrator.",
    );
  });

  it("maps UserNotConfirmedException to its own message", () => {
    expect(mapAuthError({ code: "UserNotConfirmedException" })).toBe(
      "This account has not been confirmed yet. Contact an administrator.",
    );
  });

  it("falls back to a generic message for an unknown error code", () => {
    expect(mapAuthError({ code: "SomeUnmappedException" })).toBe(
      "Something went wrong while signing in. Please try again.",
    );
  });

  it("falls back to a generic message when the error has no code at all", () => {
    expect(mapAuthError(new Error("network down"))).toBe(
      "Something went wrong while signing in. Please try again.",
    );
  });
});

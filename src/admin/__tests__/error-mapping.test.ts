import { describe, expect, it } from "vitest";
import { ApiError } from "../../lib/api-client.ts";
import { mapCreateUserError, mapRoleOrStatusError } from "../error-mapping.ts";

describe("mapCreateUserError", () => {
  it("maps the 409 to an email duplicate message rather than passing the backend string through", () => {
    const error = new ApiError(409, "A user with email 'a@example.com' already exists");
    expect(mapCreateUserError(error)).toBe("A user with this email address already exists.");
  });

  it("joins 400 validation details", () => {
    const error = new ApiError(400, "Bad Request", {
      details: ["email: must not be blank", "role: must not be null"],
    });
    expect(mapCreateUserError(error)).toBe("email: must not be blank, role: must not be null");
  });

  it("maps 403 to a permission message", () => {
    const error = new ApiError(403, "Forbidden");
    expect(mapCreateUserError(error)).toBe("You do not have permission to perform this action.");
  });

  it("maps 500 to a generic retry message", () => {
    const error = new ApiError(500, "Internal Server Error");
    expect(mapCreateUserError(error)).toBe("Could not complete the request. Please try again.");
  });

  it("maps a non-ApiError to the generic message", () => {
    expect(mapCreateUserError(new Error("network down"))).toBe(
      "Could not complete the request. Please try again.",
    );
  });
});

describe("mapRoleOrStatusError", () => {
  it("passes the backend's own message through on 409 (self-protection)", () => {
    const error = new ApiError(409, "You cannot change your own role", {
      message: "You cannot change your own role",
    });
    expect(mapRoleOrStatusError(error)).toBe("You cannot change your own role");
  });

  it("maps 403 to a permission message", () => {
    const error = new ApiError(403, "Forbidden");
    expect(mapRoleOrStatusError(error)).toBe("You do not have permission to perform this action.");
  });

  it("maps 500 to a generic retry message", () => {
    const error = new ApiError(500, "Internal Server Error");
    expect(mapRoleOrStatusError(error)).toBe("Could not complete the request. Please try again.");
  });
});

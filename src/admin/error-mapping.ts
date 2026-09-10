// Maps ApiError from user management endpoints to copy an admin can act on.
import { ApiError } from "../lib/api-client.ts";

/** For POST /api/users: the Cognito username is an opaque UUID, so a 409 is a genuine email duplicate. */
export function mapCreateUserError(error: unknown): string {
  if (!(error instanceof ApiError)) return "Could not complete the request. Please try again.";

  switch (error.status) {
    case 409:
      return "A user with this email address already exists.";
    case 400:
      return joinValidationDetails(error) ?? "Check the form and try again.";
    case 403:
      return "You do not have permission to perform this action.";
    default:
      return "Could not complete the request. Please try again.";
  }
}

/** For PATCH .../role and .../status: 409 here is self-protection, so show the backend's own message. */
export function mapRoleOrStatusError(error: unknown): string {
  if (!(error instanceof ApiError)) return "Could not complete the request. Please try again.";

  switch (error.status) {
    case 409:
      return error.body?.message ?? "This change is not allowed.";
    case 400:
      return joinValidationDetails(error) ?? "Check the request and try again.";
    case 403:
      return "You do not have permission to perform this action.";
    default:
      return "Could not complete the request. Please try again.";
  }
}

function joinValidationDetails(error: ApiError): string | undefined {
  const details = error.body?.details;
  if (!details || details.length === 0) return undefined;
  return details.join(", ");
}

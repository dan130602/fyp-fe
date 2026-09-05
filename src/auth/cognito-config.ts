// Reads Cognito config from the env; fails loudly at import time if cognito mode is missing a var.
import { createLogger } from "../lib/logger.ts";

const log = createLogger("auth");
const DEV = import.meta.env.DEV;

export interface CognitoConfig {
  region: string | undefined;
  userPoolId: string | undefined;
  clientId: string | undefined;
}

export const cognitoConfig: CognitoConfig = {
  region: import.meta.env.VITE_COGNITO_REGION,
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
};

/** Auth backend to use; defaults to "dummy", the safe choice for an unconfigured checkout. */
export const AUTH_MODE: string = import.meta.env.VITE_AUTH_MODE || "dummy";
DEV && log.info("Active AUTH_MODE:", AUTH_MODE);

/** True when the app should authenticate against real Cognito rather than dummy users. */
export function isCognitoMode(): boolean {
  return AUTH_MODE === "cognito";
}

if (isCognitoMode()) {
  const missing = Object.entries({
    VITE_COGNITO_REGION: cognitoConfig.region,
    VITE_COGNITO_USER_POOL_ID: cognitoConfig.userPoolId,
    VITE_COGNITO_CLIENT_ID: cognitoConfig.clientId,
  })
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing required env var(s) for VITE_AUTH_MODE=cognito: ${missing.join(", ")}. ` +
        "Set them in .env.local (see .env.example).",
    );
  }
}

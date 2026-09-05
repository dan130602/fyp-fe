// Reads Cognito config from the env; fails loudly at import time if a var is missing.
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

const missing = Object.entries({
  VITE_COGNITO_REGION: cognitoConfig.region,
  VITE_COGNITO_USER_POOL_ID: cognitoConfig.userPoolId,
  VITE_COGNITO_CLIENT_ID: cognitoConfig.clientId,
})
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length > 0) {
  throw new Error(
    `Missing required env var(s): ${missing.join(", ")}. Set them in .env.local (see .env.example).`,
  );
}

DEV && log.info("Cognito config loaded for region:", cognitoConfig.region);

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// @vitejs/plugin-react was already a dependency but had no config to load it,
// so JSX was going through esbuild's default transform with no fast refresh.
export default defineConfig({
  plugins: [react()],

  // amazon-cognito-identity-js pulls in buffer@4.9.2, which needs Node's `global`.
  define: {
    global: "globalThis",
  },

  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    // pin so tests don't depend on .env.local vs CI
    env: { VITE_AUTH_MODE: "dummy" },
  },
});

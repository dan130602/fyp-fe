import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Loads @vitejs/plugin-react, which was a dependency but had no config wiring it in.
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // @/* is for new shadcn components only; existing imports stay relative.
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  // amazon-cognito-identity-js pulls in buffer@4.9.2, which needs Node's `global`.
  define: {
    global: "globalThis",
  },

  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
});

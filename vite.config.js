import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @vitejs/plugin-react was already a dependency but had no config to load it,
// so JSX was going through esbuild's default transform with no fast refresh.
export default defineConfig({
  plugins: [react()],
});

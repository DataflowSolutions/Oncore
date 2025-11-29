import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
  css: {
    // Avoid loading project PostCSS config during unit tests
    postcss: {
      plugins: [],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@/client": path.resolve(__dirname, "."),
    },
  },
});

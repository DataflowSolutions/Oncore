import path from "path";
import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

// Load .env.local for tests that need API keys
dotenv.config({ path: path.resolve(__dirname, ".env.local") });

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

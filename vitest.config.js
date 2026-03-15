import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.js", "operators/**/*.test.js"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{js,ts}", "operators/*.js"],
      exclude: ["**/__tests__/**", "**/*.test.js"],
    },
  },
});

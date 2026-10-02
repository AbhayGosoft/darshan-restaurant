import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: false,
    hookTimeout: 30000,
    testTimeout: 15000,
    // Existing fixtures build slot instants in UTC; timezone-specific behaviour is tested explicitly.
    env: { BUSINESS_TIMEZONE: "UTC" },
  },
});

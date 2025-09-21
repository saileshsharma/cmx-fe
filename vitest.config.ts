import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
    reporters: process.env.CI ? ["junit", "default"] : ["default"],
    outputFile: process.env.CI ? "junit-report/junit.xml" : undefined,
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      reporter: ["text", "lcov"],
      exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"]
    }
  }
});

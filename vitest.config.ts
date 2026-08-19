import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * `coverage.provider: "v8"` was set here without `@vitest/coverage-v8`
 * ever being added to devDependencies — `npm run test:coverage` failed
 * outright with a missing-package error. That's fixed (package.json).
 * Thresholds are new: previously nothing enforced a minimum, so coverage
 * could silently regress to zero and CI's `test` job would still pass.
 * These are intentionally modest starting floors for a codebase this
 * size, not a target — raise them as real coverage grows rather than
 * lowering them when a change makes them inconvenient.
 */
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/integration/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: [
        "tests/**",
        "**/*.config.*",
        ".next/**",
        "node_modules/**",
        "**/*.d.ts",
        "prisma/**",
        "scripts/**",
        // Barrel/re-export files — no branching logic to cover.
        "**/index.ts",
      ],
      thresholds: {
        lines: 40,
        statements: 40,
        functions: 40,
        branches: 35,
      },
    },
  },
});

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.tsx"],
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", ".git"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: [
        "tests/**",
        "app/**/*.config.*",
        "next.config.ts",
        "instrumentation.ts",
        "prisma/**",
      ],
    },
  },
});

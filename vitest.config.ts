import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/*
 * One test runner for the app screen. `jsdom` because the behaviour worth testing
 * here is rendered behaviour (a switch's role, a dialog's focus trap, a panel's
 * resize handle), not just pure functions.
 *
 * The `@/*` alias mirrors `tsconfig.json` so tests import modules exactly the way
 * the app does, and there is no second path convention to keep in sync.
 */
export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**"],
    restoreMocks: true,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});

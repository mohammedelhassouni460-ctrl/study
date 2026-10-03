import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    server: { deps: { inline: ["server-only"] } },
    alias: { "server-only": new URL("./tests/unit/stubs/server-only.ts", import.meta.url).pathname },
  },
});

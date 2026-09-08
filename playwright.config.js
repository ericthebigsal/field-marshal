import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  fullyParallel: false,
  use: { headless: true, channel: "chrome" },
  projects: [{ name: "chrome", use: { channel: "chrome" } }],
});

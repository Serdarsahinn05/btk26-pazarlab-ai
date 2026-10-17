import os from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

// End-to-end tests against the real backend with AI and Serper switched off (rule-based paths,
// no network). Locally: `PYTHON=<venv python> PW_CHANNEL=chrome npm run test:e2e`.
const python = process.env.PYTHON ?? "python";
const CI = !!process.env.CI;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    colorScheme: "light",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: process.env.PW_CHANNEL, viewport: { width: 1280, height: 900 } } },
  ],
  webServer: [
    {
      command: `"${python}" -m uvicorn app.main:app --port 8000`,
      cwd: path.join(__dirname, "..", "backend"),
      url: "http://127.0.0.1:8000/api/health",
      reuseExistingServer: !CI,
      timeout: 60_000,
      env: {
        GEMINI_API_KEY: "",
        SERPER_API_KEY: "",
        HISTORY_DB_PATH: path.join(os.tmpdir(), "pazarlab-e2e.db"),
        RATE_LIMIT_SIMULATE_PER_MIN: "1000",
        RATE_LIMIT_WHATIF_PER_MIN: "1000",
        RATE_LIMIT_DRAFT_PER_MIN: "1000",
        RATE_LIMIT_HISTORY_PER_MIN: "1000",
      },
    },
    {
      command: "npm run build && npm run start",
      url: "http://localhost:3000",
      reuseExistingServer: !CI,
      timeout: 300_000,
    },
  ],
});

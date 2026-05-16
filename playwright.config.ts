import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // Start the dev server automatically before tests run
  webServer: {
    command: 'npm run dev -- --port 5174',
    url: 'http://localhost:5174/pokemon-ohko-finder/',
    reuseExistingServer: true,
  },
});

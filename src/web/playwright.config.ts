import { defineConfig, devices } from '@playwright/test';

// Starts the API and the web app, or reuses them when they are already running.
// Override the API command with E2E_API_CMD (CI uses a pre-built API: dotnet run --no-build ...).
const apiCommand =
  process.env.E2E_API_CMD ?? 'dotnet run --project ../ClaimsDesk.Api/ClaimsDesk.Api.csproj --urls http://localhost:5080';

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: apiCommand,
      url: 'http://localhost:5080/health',
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});

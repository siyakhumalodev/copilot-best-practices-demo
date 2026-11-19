import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import shared from '../playwright.config';

const webRoot = fileURLToPath(new URL('..', import.meta.url));

// Shared demo ports may belong to another checkout. Never reuse or stop those services.
export default defineConfig(shared, {
  testDir: '.',
  use: { baseURL: 'http://localhost:5273' },
  webServer: [
    {
      cwd: webRoot,
      command: 'dotnet run --no-launch-profile --project ../ClaimsDesk.Api/ClaimsDesk.Api.csproj --urls http://localhost:5180',
      url: 'http://localhost:5180/health',
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      cwd: webRoot,
      command: 'npm run dev -- --config e2e/isolated.vite.config.ts',
      url: 'http://localhost:5273',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});

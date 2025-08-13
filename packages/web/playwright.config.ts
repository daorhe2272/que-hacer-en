import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: process.env.WEB_BASE_URL || 'http://localhost:4000',
    trace: 'on-first-retry'
  },
  webServer: [
    {
      command: process.env.CI ? 'pnpm --filter @que-hacer-en/api run start' : 'pnpm --filter @que-hacer-en/api run start',
      port: 4001,
      reuseExistingServer: true
    },
    {
      command: 'pnpm build && next start',
      port: 4000,
      reuseExistingServer: true,
      env: { NEXT_PUBLIC_API_URL: 'http://localhost:4001', E2E: 'true', PORT: '4000' }
    }
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ]
})



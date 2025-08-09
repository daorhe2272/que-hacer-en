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
      command: process.env.CI ? 'pnpm --filter @que-hacer-en/api run start' : 'pnpm --filter @que-hacer-en/api dev',
      port: 4001,
      reuseExistingServer: true
    },
    {
      command: process.env.CI ? 'next start -p 4000' : 'next dev -p 4000',
      port: 4000,
      reuseExistingServer: true,
      env: { NEXT_PUBLIC_API_URL: 'http://localhost:4001', E2E: 'true' }
    }
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ]
})



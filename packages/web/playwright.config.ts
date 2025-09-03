import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'

// Load environment variables from .env file for Supabase credentials
config()

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: 0,
  globalSetup: './tests/e2e/test-helpers/global-setup.ts',
  globalTeardown: './tests/e2e/test-helpers/global-teardown.ts',
  use: {
    baseURL: process.env.WEB_BASE_URL || 'http://localhost:4000',
    trace: 'on-first-retry'
  },
  webServer: [
    {
      command: process.env.CI ? 'pnpm --filter @que-hacer-en/api run start' : 'pnpm --filter @que-hacer-en/api run start',
      port: 4001,
      reuseExistingServer: true,
      env: {
        PORT: '4001'
      }
    },
    {
      command: 'pnpm build && next start',
      port: 4000,
      reuseExistingServer: true,
      timeout: 120000, // 2 minutes timeout for server start
      env: { 
        NEXT_PUBLIC_API_URL: 'http://localhost:4001', 
        NEXT_PUBLIC_WEB_URL: 'http://localhost:4000',
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        E2E: 'true', 
        PORT: '4000'
      }
    }
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ]
})



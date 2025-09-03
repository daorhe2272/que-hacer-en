import { FullConfig } from '@playwright/test'

/**
 * Global setup for Playwright tests
 * This runs once before all tests
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test setup...')
  
  // Verify required environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]
  
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar])
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
  
  console.log('✅ Environment variables verified')
  console.log('✅ E2E test setup complete')
}

export default globalSetup
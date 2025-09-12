import { FullConfig } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { Pool } from 'pg'

/**
 * Global setup for Playwright tests
 * This runs once before all tests
 */
async function globalSetup(_config: FullConfig) {
  console.log('🚀 Starting E2E test setup...')
  
  // Verify required environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL'
  ]
  
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar])
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
  
  console.log('✅ Environment variables verified')
  
  // Clean up existing test data before running tests
  try {
    await cleanupTestUsers()
    await cleanupTestEvents()
    console.log('✅ Pre-test cleanup completed')
  } catch (error) {
    console.error('❌ Pre-test cleanup failed:', error)
    throw error
  }
  
  console.log('✅ E2E test setup complete')
}

/**
 * Clean up test users before tests start
 */
async function cleanupTestUsers() {
  try {
    console.log('👥 Pre-test cleanup: Removing test users...')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // Get all test users (by email pattern)
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    })
    
    if (listError) {
      console.warn('Warning: Could not list users for pre-test cleanup:', listError.message)
      return
    }
    
    const testUsers = users.users.filter(user => 
      user.email && (
        user.email.includes('@e2e-test.com') ||
        user.email.includes('test-') ||
        user.email.toLowerCase().includes('test')
      )
    )
    
    console.log(`📊 Found ${testUsers.length} test users to clean up`)
    
    for (const user of testUsers) {
      try {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
        if (deleteError) {
          console.warn(`Could not delete user ${user.email}:`, deleteError.message)
        }
      } catch (error) {
        console.warn(`Error deleting user ${user.email}:`, error)
      }
    }
    
    console.log(`✅ Pre-test cleanup: removed ${testUsers.length} test users`)
  } catch (error) {
    console.warn('Warning: Pre-test user cleanup failed:', error)
  }
}

/**
 * Clean up test events before tests start
 */
async function cleanupTestEvents() {
  try {
    console.log('📅 Pre-test cleanup: Removing test events...')
    
    const databaseUrl = process.env.DATABASE_URL!
    const pool = new Pool({ connectionString: databaseUrl })
    
    try {
      // Delete test events by title patterns
      const result = await pool.query(`
        DELETE FROM events 
        WHERE title ILIKE '%test%' 
           OR title ILIKE '%Test Concert Event%'
           OR title ILIKE '%Test Event%'
           OR title ILIKE '%Tie Breaking Test Event%'
           OR title ILIKE '%Price Tie Breaking Test Event%'
           OR title = 'Test Concert Event'
           OR title = 'Evento de Precio Desconocido'
      `)
      
      console.log(`✅ Pre-test cleanup: deleted ${result.rowCount || 0} test events`)
      
      // Clean up orphaned event_tags
      const tagsResult = await pool.query(`
        DELETE FROM event_tags 
        WHERE event_id NOT IN (SELECT id FROM events)
      `)
      
      if (tagsResult.rowCount && tagsResult.rowCount > 0) {
        console.log(`🏷️  Pre-test cleanup: deleted ${tagsResult.rowCount} orphaned event tags`)
      }
      
    } finally {
      await pool.end()
    }
  } catch (error) {
    console.warn('Warning: Pre-test event cleanup failed:', error)
  }
}

export default globalSetup
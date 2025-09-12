/**
 * Global teardown for E2E tests  
 * Runs once after all tests to clean up any remaining test data
 */

import { createClient } from '@supabase/supabase-js'
import { Pool } from 'pg'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const databaseUrl = process.env.DATABASE_URL!

if (!supabaseUrl || !supabaseServiceRoleKey || !databaseUrl) {
  throw new Error('Missing required environment variables for global test teardown')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function globalTeardown() {
  console.log('🧹 Global E2E teardown: Final cleanup of test data...')

  try {
    // Clean up test users
    await cleanupTestUsers()
    
    // Clean up test events  
    await cleanupTestEvents()
    
    console.log('✅ Global teardown completed - test environment cleaned')
  } catch (error) {
    console.error('❌ Global teardown failed:', error)
    // Don't throw - we don't want to fail the entire test run due to cleanup issues
  }
}

async function cleanupTestUsers() {
  try {
    console.log('👥 Final cleanup of test users...')
    
    // Get all test users (by email pattern)
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    })
    
    if (listError) {
      console.warn('Warning: Could not list users for final cleanup:', listError.message)
      return
    }
    
    const testUsers = users.users.filter(user => 
      user.email && (
        user.email.includes('@e2e-test.com') ||
        user.email.includes('test-') ||
        user.email.toLowerCase().includes('test')
      )
    )
    
    console.log(`Found ${testUsers.length} test users to clean up`)
    
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
    
    console.log(`✅ Final cleanup: removed ${testUsers.length} test users`)
  } catch (error) {
    console.warn('Warning: Final test user cleanup failed:', error)
  }
}

async function cleanupTestEvents() {
  try {
    console.log('📅 Final cleanup of test events...')
    
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
      `)
      
      console.log(`✅ Final cleanup: deleted ${result.rowCount || 0} test events`)
      
      // Clean up orphaned event_tags
      const tagsResult = await pool.query(`
        DELETE FROM event_tags 
        WHERE event_id NOT IN (SELECT id FROM events)
      `)
      
      if (tagsResult.rowCount && tagsResult.rowCount > 0) {
        console.log(`🏷️  Final cleanup: deleted ${tagsResult.rowCount} orphaned event tags`)
      }
      
    } finally {
      await pool.end()
    }
  } catch (error) {
    console.warn('Warning: Final test event cleanup failed:', error)
  }
}

export default globalTeardown
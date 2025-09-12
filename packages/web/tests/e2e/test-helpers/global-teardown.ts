import { FullConfig } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { Pool } from 'pg'

/**
 * Global teardown for Playwright tests
 * This runs once after all tests complete
 */
async function globalTeardown(_config: FullConfig) {
  console.log('🧹 Starting E2E test cleanup...')
  
  try {
    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.warn('⚠️  Missing Supabase credentials for cleanup')
      return
    }
    
    // Create admin client for cleanup
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // Clean up test users (emails ending with @e2e-test.com)
    await cleanupTestUsers(supabaseAdmin)
    
    // Clean up test events
    await cleanupTestEvents()
    
    console.log('✅ E2E test cleanup complete')
  } catch (error) {
    console.error('❌ Error during E2E test cleanup:', error)
  }
}

/**
 * Clean up all test users from the database
 */
async function cleanupTestUsers(supabaseAdmin: any) {
  try {
    console.log('🔍 Finding test users with @e2e-test.com emails...')
    
    // Get all users with test emails
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('Failed to list users:', listError.message)
      return
    }
    
    if (!users || !users.users) {
      console.log('No users found')
      return
    }
    
    // Filter for test users
    const testUsers = users.users.filter((user: any) => 
      user.email && user.email.endsWith('@e2e-test.com')
    )
    
    console.log(`📊 Found ${testUsers.length} test users to clean up`)
    
    if (testUsers.length === 0) {
      console.log('✅ No test users to clean up')
      return
    }
    
    // Delete each test user
    let cleanedCount = 0
    let errorCount = 0
    
    for (const user of testUsers) {
      try {
        console.log(`🗑️  Deleting test user: ${user.email}`)
        
        // Delete from auth
        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
        
        if (deleteAuthError) {
          console.warn(`Failed to delete auth user ${user.email}:`, deleteAuthError.message)
          errorCount++
          continue
        }
        
        // Also try to clean up from users table if it exists
        try {
          await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', user.id)
        } catch (tableError) {
          // Users table might not exist, that's okay
        }
        
        cleanedCount++
      } catch (error) {
        console.warn(`Failed to delete test user ${user.email}:`, error)
        errorCount++
      }
    }
    
    console.log(`✅ Cleanup complete: ${cleanedCount} users deleted, ${errorCount} errors`)
    
  } catch (error) {
    console.error('Error during test user cleanup:', error)
  }
}

/**
 * Clean up test events from the database
 */
async function cleanupTestEvents() {
  try {
    console.log('📅 Final cleanup: Removing test events...')
    
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      console.warn('⚠️  DATABASE_URL not available for event cleanup')
      return
    }
    
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
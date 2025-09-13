#!/usr/bin/env node

/**
 * Standalone script to clean up all test data from Supabase (users + events)
 * This performs the same cleanup as the E2E test global teardown
 * Usage: node scripts/cleanup-test-data.js
 */

const { createClient } = require('@supabase/supabase-js')
const { Pool } = require('pg')
const { config } = require('dotenv')

// Load environment variables
config()

async function cleanupTestData() {
  console.log('🚀 Starting manual test data cleanup...')
  
  try {
    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const databaseUrl = process.env.DATABASE_URL
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    }
    
    // Create admin client for cleanup
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // Clean up test users from auth
    await cleanupTestUsers(supabaseAdmin)
    
    // Clean up test users from public.users table
    await cleanupPublicUsers(supabaseAdmin)
    
    // Clean up test events (if DATABASE_URL is available)
    if (databaseUrl) {
      await cleanupTestEvents(databaseUrl)
    } else {
      console.warn('⚠️  DATABASE_URL not available - skipping event cleanup')
    }
    
    console.log('🎉 Manual test data cleanup completed successfully!')
    
  } catch (error) {
    console.error('❌ Error during manual cleanup:', error)
    process.exit(1)
  }
}

/**
 * Clean up all test users from Supabase Auth
 */
async function cleanupTestUsers(supabaseAdmin) {
  try {
    console.log('\n👥 Cleaning up test users...')
    console.log('🔍 Finding test users with @e2e-test.com emails...')
    
    // Get all users with test emails
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`)
    }
    
    if (!users || !users.users) {
      console.log('No users found')
      return
    }
    
    // Filter for test users
    const testUsers = users.users.filter(user => 
      user.email && user.email.endsWith('@e2e-test.com')
    )
    
    console.log(`📊 Found ${testUsers.length} test users to clean up`)
    
    if (testUsers.length === 0) {
      console.log('✅ No test users to clean up')
      return
    }
    
    // Show users that will be deleted
    console.log('Test users to be deleted:')
    testUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.id})`)
    })
    
    // Confirm deletion
    if (process.argv.includes('--dry-run')) {
      console.log('🔍 Dry run mode - no users will be deleted')
      return
    }
    
    if (!process.argv.includes('--force')) {
      console.log('\n⚠️  Add --force flag to actually delete this data')
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
          console.error(`❌ Failed to delete auth user ${user.email}:`, deleteAuthError.message)
          errorCount++
          continue
        }
        
        // Also try to clean up from users table if it exists
        try {
          const { error } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', user.id)
            
          if (error) {
            console.warn(`⚠️  Could not clean up user from users table: ${error.message}`)
          }
        } catch (tableError) {
          // Users table might not exist, that's okay
        }
        
        cleanedCount++
      } catch (error) {
        console.error(`❌ Failed to delete test user ${user.email}:`, error)
        errorCount++
      }
    }
    
    console.log(`📊 User cleanup complete: ${cleanedCount} users deleted, ${errorCount} errors`)
    
    // If there were errors, throw to make the cleanup failure visible
    if (errorCount > 0) {
      throw new Error(`Failed to clean up ${errorCount} test users. Check logs above for details.`)
    }
    
    // Verify cleanup succeeded by checking if any test users remain
    const { data: remainingUsers, error: verifyError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (!verifyError && remainingUsers?.users) {
      const remainingTestUsers = remainingUsers.users.filter(user => 
        user.email && user.email.endsWith('@e2e-test.com')
      )
      
      if (remainingTestUsers.length > 0) {
        console.error(`⚠️  User cleanup verification failed: ${remainingTestUsers.length} test users still remain:`)
        remainingTestUsers.forEach(user => console.error(`  - ${user.email} (${user.id})`))
        throw new Error(`User cleanup verification failed: ${remainingTestUsers.length} test users still remain`)
      } else {
        console.log('✅ User cleanup verification passed: no test users remain')
      }
    }
    
  } catch (error) {
    console.error('Error during test user cleanup:', error)
    throw error
  }
}

/**
 * Clean up test users from public.users table
 */
async function cleanupPublicUsers(supabaseAdmin) {
  try {
    console.log('\n👤 Cleaning up test users from public.users table...')
    
    // First, find test users in public.users table by email pattern
    const { data: publicUsers, error: queryError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .like('email', '%@e2e-test.com')
    
    if (queryError) {
      console.warn(`⚠️  Could not query public.users table: ${queryError.message}`)
      return
    }
    
    if (!publicUsers || publicUsers.length === 0) {
      console.log('✅ No test users found in public.users table')
      return
    }
    
    console.log(`📊 Found ${publicUsers.length} test users in public.users table`)
    
    // Show users that will be deleted
    console.log('Public test users to be deleted:')
    publicUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.id})`)
    })
    
    // Confirm deletion
    if (process.argv.includes('--dry-run')) {
      console.log('🔍 Dry run mode - no public users will be deleted')
      return
    }
    
    if (!process.argv.includes('--force')) {
      console.log('\n⚠️  Add --force flag to actually delete this data')
      return
    }
    
    // Delete test users from public.users table
    let cleanedCount = 0
    let errorCount = 0
    
    for (const user of publicUsers) {
      try {
        console.log(`🗑️  Deleting public test user: ${user.email}`)
        
        const { error: deleteError } = await supabaseAdmin
          .from('users')
          .delete()
          .eq('id', user.id)
        
        if (deleteError) {
          console.error(`❌ Failed to delete public user ${user.email}:`, deleteError.message)
          errorCount++
          continue
        }
        
        cleanedCount++
      } catch (error) {
        console.error(`❌ Failed to delete public user ${user.email}:`, error)
        errorCount++
      }
    }
    
    console.log(`📊 Public user cleanup complete: ${cleanedCount} users deleted, ${errorCount} errors`)
    
    // If there were errors, throw to make the cleanup failure visible
    if (errorCount > 0) {
      throw new Error(`Failed to clean up ${errorCount} test users from public.users table. Check logs above for details.`)
    }
    
    // Verify cleanup succeeded by checking if any test users remain in public.users
    const { data: remainingPublicUsers, error: verifyError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .like('email', '%@e2e-test.com')
    
    if (!verifyError && remainingPublicUsers) {
      if (remainingPublicUsers.length > 0) {
        console.error(`⚠️  Public user cleanup verification failed: ${remainingPublicUsers.length} test users still remain:`)
        remainingPublicUsers.forEach(user => console.error(`  - ${user.email} (${user.id})`))
        throw new Error(`Public user cleanup verification failed: ${remainingPublicUsers.length} test users still remain`)
      } else {
        console.log('✅ Public user cleanup verification passed: no test users remain in public.users')
      }
    }
    
  } catch (error) {
    console.error('Error during public test user cleanup:', error)
    throw error
  }
}

/**
 * Clean up test events from the database
 */
async function cleanupTestEvents(databaseUrl) {
  try {
    console.log('\n📅 Cleaning up test events...')
    
    const pool = new Pool({ connectionString: databaseUrl })
    
    try {
      // Delete test events by title patterns (same as E2E teardown)
      const result = await pool.query(`
        DELETE FROM events 
        WHERE title ILIKE '%test%' 
           OR title ILIKE '%Test Concert Event%'
           OR title ILIKE '%Test Event%'
           OR title ILIKE '%Tie Breaking Test Event%'
           OR title ILIKE '%Price Tie Breaking Test Event%'
           OR title = 'Test Concert Event'
      `)
      
      console.log(`📊 Deleted ${result.rowCount || 0} test events`)
      
      // Clean up orphaned event_tags
      const tagsResult = await pool.query(`
        DELETE FROM event_tags 
        WHERE event_id NOT IN (SELECT id FROM events)
      `)
      
      if (tagsResult.rowCount && tagsResult.rowCount > 0) {
        console.log(`🏷️  Deleted ${tagsResult.rowCount} orphaned event tags`)
      }
      
      console.log('✅ Test events cleanup completed')
      
    } finally {
      await pool.end()
    }
  } catch (error) {
    console.error('Error during test event cleanup:', error)
    throw error
  }
}

// Show usage if no args provided
if (process.argv.length === 2) {
  console.log('Manual Test Data Cleanup Script')
  console.log('Cleans up the same test data as E2E test teardown (users + events)')
  console.log('')
  console.log('Usage:')
  console.log('  node scripts/cleanup-test-data.js --dry-run    # Show what would be deleted')
  console.log('  node scripts/cleanup-test-data.js --force      # Actually delete test data')
  console.log('')
  console.log('Required environment variables:')
  console.log('  NEXT_PUBLIC_SUPABASE_URL')
  console.log('  SUPABASE_SERVICE_ROLE_KEY')
  console.log('  DATABASE_URL (optional - for event cleanup)')
  process.exit(0)
}

// Run the cleanup
cleanupTestData()
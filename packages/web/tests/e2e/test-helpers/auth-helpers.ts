import { createClient } from '@supabase/supabase-js'
import { expect, Page } from '@playwright/test'

// Create Supabase clients for test operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables for E2E tests')
}

// Client for regular operations (login testing)
// const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for user management (bypasses RLS and email confirmation)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export interface TestUser {
  email: string
  password: string
  id?: string
  accessToken?: string
}

/**
 * Generate a unique test user email
 */
export function generateTestUser(): TestUser {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  return {
    email: `test-${timestamp}-${random}@e2e-test.com`,
    password: 'TestPassword123!'
  }
}

/**
 * Create a test user in Supabase Auth using admin privileges
 * This bypasses email confirmation requirements
 */
export async function createTestUser(testUser?: TestUser): Promise<TestUser> {
  const user = testUser || generateTestUser()
  
  // Use admin client to create a confirmed user directly
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true, // Admin can confirm email directly
    user_metadata: {
      created_by: 'e2e_test'
    }
  })

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`)
  }

  if (!data.user) {
    throw new Error('No user data returned from createUser')
  }

  return {
    ...user,
    id: data.user.id
  }
}

/**
 * Delete a test user from Supabase Auth using admin privileges
 */
export async function deleteTestUser(userId: string): Promise<void> {
  try {
    // Use admin client to delete the user
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (error) {
      console.error(`Failed to delete test user ${userId}: ${error.message}`)
      throw new Error(`Failed to delete test user ${userId}: ${error.message}`)
    }
    
    console.log(`✅ Successfully deleted test user: ${userId}`)
  } catch (error) {
    console.error(`Failed to delete test user ${userId}:`, error)
    throw error // Re-throw to make individual cleanup failures visible
  }
  
  // Also clean up from users table if it exists (using admin client)
  try {
    // Try to delete by auth user ID first
    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)
    
    if (error) {
      console.warn(`Could not clean up user from users table by ID: ${error.message}`)
    }
    
    // Also try to delete by email pattern in case there's a mismatch between auth and public user IDs
    const authUser = await supabaseAdmin.auth.admin.getUserById(userId)
    if (authUser.data?.user?.email?.endsWith('@e2e-test.com')) {
      const { error: emailDeleteError } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('email', authUser.data.user.email)
        
      if (emailDeleteError && !emailDeleteError.message.includes('No rows')) {
        console.warn(`Could not clean up user from users table by email: ${emailDeleteError.message}`)
      }
    }
  } catch (error) {
    // Users table might not exist or user might not be in it - this is non-critical
    console.warn('Could not clean up user from users table:', error)
  }
}

/**
 * Login a test user through the UI
 */
export async function loginUser(page: Page, testUser: TestUser, options?: {
  skipVerification?: boolean
  customVerification?: () => Promise<void>
}): Promise<void> {
  await page.goto('/login')
  
  // Fill login form
  await page.getByPlaceholder('Correo electrónico').fill(testUser.email)
  await page.getByPlaceholder('Contraseña').fill(testUser.password)
  
  // Submit form
  await page.locator('form').getByRole('button', { name: 'Iniciar sesión' }).click()
  
  // Wait for successful login (should redirect away from login page)
  await page.waitForFunction(
    () => !window.location.pathname.includes('/login'),
    { timeout: 10000 }
  )
  
  // Handle verification based on options
  if (options?.skipVerification) {
    return // Skip all verification
  }
  
  if (options?.customVerification) {
    await options.customVerification()
    return
  }
  
  // Default verification - check for user menu (works for pages with navigation)
  // Use first() to avoid strict mode violation since both elements exist in DOM
  await expect(page.locator('[data-testid="user-menu-desktop"], [data-testid="user-menu-mobile"]').first()).toBeVisible({ timeout: 5000 })
}

/**
 * Register a new user through the UI
 */
export async function registerUser(page: Page, testUser?: TestUser): Promise<TestUser> {
  const user = testUser || generateTestUser()
  
  await page.goto('/login')
  
  // Switch to register mode
  await page.locator('.bg-gray-100').getByRole('button', { name: 'Registrarse' }).click()
  
  // Fill registration form
  await page.getByPlaceholder('Correo electrónico').fill(user.email)
  await page.getByPlaceholder('Contraseña').first().fill(user.password)
  await page.getByPlaceholder('Confirmar contraseña').fill(user.password)
  
  // Submit form
  await page.locator('form').getByRole('button', { name: 'Crear cuenta' }).click()
  
  // Wait for registration success message or redirect
  await expect(page.getByText(/exitosamente|éxito/i)).toBeVisible({ timeout: 10000 })
  
  return user
}

/**
 * Logout current user through the UI
 */
export async function logoutUser(page: Page): Promise<void> {
  try {
    // Look for user menu (desktop or mobile)
    const userMenu = page.locator('[data-testid="user-menu-desktop"], [data-testid="user-menu-mobile"]').first()
    if (await userMenu.isVisible()) {
      await userMenu.click()
      
      const logoutButton = page.getByText('Cerrar sesión')
      if (await logoutButton.isVisible()) {
        await logoutButton.click()
        
        // Wait for logout to complete
        await page.waitForTimeout(1000)
        
        // Verify we're logged out
        await expect(page.getByText('Iniciar sesión')).toBeVisible({ timeout: 5000 })
      }
    }
  } catch (error) {
    console.warn('Could not logout user:', error)
  }
}

/**
 * Ensure we start with a clean, logged-out state
 */
export async function ensureLoggedOut(page: Page): Promise<void> {
  await page.goto('/eventos/bogota')
  await logoutUser(page)
}

/**
 * Clean up test data after test completion
 */
export async function cleanupTestUser(testUser: TestUser): Promise<void> {
  if (testUser.id) {
    try {
      await deleteTestUser(testUser.id)
    } catch (error) {
      console.error(`Failed to cleanup test user ${testUser.email} (${testUser.id}):`, error)
      throw error // Re-throw to make test cleanup failures visible
    }
  } else {
    console.warn(`Cannot cleanup test user ${testUser.email}: no user ID available`)
  }
}

/**
 * Create and login a test user in one step
 */
export async function createAndLoginTestUser(page: Page, options?: {
  skipVerification?: boolean
  customVerification?: () => Promise<void>
}): Promise<TestUser> {
  const testUser = await createTestUser()
  await loginUser(page, testUser, options)
  
  // Get the access token from browser local storage after login
  const accessToken = await page.evaluate(() => {
    const supabaseData = localStorage.getItem('sb-' + new URL(window.location.href).hostname.replace(/\./g, '-') + '-auth-token')
    if (supabaseData) {
      try {
        const parsed = JSON.parse(supabaseData)
        return parsed.access_token
      } catch {
        return null
      }
    }
    return null
  })
  
  if (accessToken) {
    testUser.accessToken = accessToken
  }
  
  return testUser
}

/**
 * Delete a test event via API call
 */
export async function cleanupTestEvent(eventId: string, accessToken: string): Promise<void> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'
    const response = await fetch(`${apiUrl}/api/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.warn(`Failed to cleanup test event ${eventId}: ${response.status}`)
    }
  } catch (error) {
    console.warn(`Error cleaning up test event ${eventId}:`, error)
  }
}

/**
 * Clean up multiple test events by title pattern
 */
export async function cleanupTestEventsByTitle(title: string, accessToken: string): Promise<void> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'
    
    // First, get all events that match the title pattern
    const response = await fetch(`${apiUrl}/api/events/manage?limit=100`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      const testEvents = data.events?.filter((event: any) => 
        event.title === title || event.title.includes('Test Concert Event')
      ) || []
      
      // Delete each matching event
      for (const event of testEvents) {
        await cleanupTestEvent(event.id, accessToken)
      }
    }
  } catch (error) {
    console.warn('Error cleaning up test events by title:', error)
  }
}
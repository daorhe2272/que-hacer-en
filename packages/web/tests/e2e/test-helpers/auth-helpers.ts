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
const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
      console.warn(`Failed to delete test user ${userId}: ${error.message}`)
    }
  } catch (error) {
    console.warn(`Failed to delete test user ${userId}:`, error)
  }
  
  // Also clean up from users table if it exists (using admin client)
  try {
    await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)
  } catch (error) {
    // Users table might not exist or user might not be in it
    console.warn('Could not clean up user from users table:', error)
  }
}

/**
 * Login a test user through the UI
 */
export async function loginUser(page: Page, testUser: TestUser): Promise<void> {
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
  
  // Verify we're logged in by checking for user menu or logged-in state
  // This will vary based on your app's UI
  await expect(page.getByText(/Cuenta|@/)).toBeVisible({ timeout: 5000 })
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
    // Look for user menu
    const userMenu = page.getByText(/Cuenta|@/)
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
    await deleteTestUser(testUser.id)
  }
}

/**
 * Create and login a test user in one step
 */
export async function createAndLoginTestUser(page: Page): Promise<TestUser> {
  const testUser = await createTestUser()
  await loginUser(page, testUser)
  return testUser
}
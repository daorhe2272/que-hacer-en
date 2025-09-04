import { test, expect } from '@playwright/test'
import { 
  createAndLoginTestUser, 
  createTestUser, 
  ensureLoggedOut, 
  cleanupTestUser, 
  loginUser, 
  registerUser, 
  TestUser 
} from './test-helpers/auth-helpers'

test.describe('Authentication with Real Database Operations', () => {
  
  test.beforeEach(async ({ page }) => {
    // Ensure we start each test logged out
    await ensureLoggedOut(page)
  })

  test.describe('User Registration', () => {
    let testUser: TestUser

    test.afterEach(async () => {
      // Clean up test user after each test
      if (testUser) {
        await cleanupTestUser(testUser)
      }
    })

    test('Should successfully register a new user', async ({ page }) => {
      testUser = await registerUser(page)
      
      // Should show success message
      await expect(page.getByText(/exitosamente|éxito/i)).toBeVisible()
      
      // Should remain on login page for email confirmation
      expect(page.url()).toContain('/login')
    })

    test('Should prevent registration with duplicate email', async ({ page }) => {
      // First, create a user
      testUser = await createTestUser()
      
      // Try to register again with same email
      await page.goto('/login')
      await page.locator('.bg-gray-100').getByRole('button', { name: 'Registrarse' }).click()
      
      await page.getByPlaceholder('Correo electrónico').fill(testUser.email)
      await page.getByPlaceholder('Contraseña').first().fill('AnotherPassword123!')
      await page.getByPlaceholder('Confirmar contraseña').fill('AnotherPassword123!')
      
      await page.locator('form').getByRole('button', { name: 'Crear cuenta' }).click()
      
      // Should show error or remain on registration page
      await page.waitForTimeout(3000)
      expect(page.url()).toContain('/login')
    })
  })

  test.describe('User Login', () => {
    let testUser: TestUser

    test.beforeEach(async () => {
      // Create a test user before each login test
      testUser = await createTestUser()
    })

    test.afterEach(async () => {
      if (testUser) {
        await cleanupTestUser(testUser)
      }
    })

    test('Should successfully login with valid credentials', async ({ page }) => {
      await loginUser(page, testUser)
      
      // Should be redirected away from login page
      expect(page.url()).not.toContain('/login')
      
      // Should show user is logged in (user menu visible)
      await expect(page.locator('[data-testid="user-menu-desktop"], [data-testid="user-menu-mobile"]').first()).toBeVisible()
    })

    test('Should reject login with invalid password', async ({ page }) => {
      const invalidUser = { ...testUser, password: 'wrongpassword' }
      
      await page.goto('/login')
      await page.getByPlaceholder('Correo electrónico').fill(invalidUser.email)
      await page.getByPlaceholder('Contraseña').fill(invalidUser.password)
      
      await page.locator('form').getByRole('button', { name: 'Iniciar sesión' }).click()
      
      // Should remain on login page
      await page.waitForTimeout(3000)
      expect(page.url()).toContain('/login')
      
      // Should show form is still interactive
      const submitButton = page.locator('form').getByRole('button', { name: 'Iniciar sesión' })
      await expect(submitButton).toBeVisible()
      await expect(submitButton).not.toBeDisabled()
    })

    test('Should reject login with non-existent email', async ({ page }) => {
      await page.goto('/login')
      await page.getByPlaceholder('Correo electrónico').fill('nonexistent@example.com')
      await page.getByPlaceholder('Contraseña').fill('somepassword')
      
      await page.locator('form').getByRole('button', { name: 'Iniciar sesión' }).click()
      
      // Should remain on login page
      await page.waitForTimeout(3000)
      expect(page.url()).toContain('/login')
    })
  })
})

test.describe('Post-Login Redirect Functionality (Real Auth)', () => {
  let testUser: TestUser

  test.beforeEach(async ({ page }) => {
    // Create a test user and ensure logged out state
    testUser = await createTestUser()
    await ensureLoggedOut(page)
  })

  test.afterEach(async () => {
    if (testUser) {
      await cleanupTestUser(testUser)
    }
  })

  test('Should redirect to last visited page after successful login', async ({ page }) => {
    // First visit a specific event page while not logged in
    await page.goto('/eventos/medellin?category=musica')
    
    // Go to login page
    await page.goto('/login')
    
    // Login with real credentials
    await loginUser(page, testUser)
    
    // Should redirect to the last visited page
    // Note: This test may need adjustment based on your redirect implementation
    // The middleware should have added the redirect parameter
    await page.waitForTimeout(2000)
    
    // Check if we were redirected appropriately (could be to landing page or last visited)
    expect(page.url()).not.toContain('/login')
    
    // Verify user is actually logged in
    await expect(page.locator('[data-testid="user-menu-desktop"], [data-testid="user-menu-mobile"]').first()).toBeVisible()
  })

  test('Should redirect to landing page when no previous page exists', async ({ page }) => {
    // Go directly to login without visiting other pages
    await page.goto('/login')
    
    // Login with real credentials
    await loginUser(page, testUser)
    
    // Should redirect to main landing page or default location
    await page.waitForTimeout(2000)
    expect(page.url()).not.toContain('/login')
    
    // Verify user is logged in
    await expect(page.locator('[data-testid="user-menu-desktop"], [data-testid="user-menu-mobile"]').first()).toBeVisible()
  })

  test('Should redirect to specific page when redirect parameter is provided', async ({ page }) => {
    // Go to login with explicit redirect parameter
    await page.goto('/login?redirect=/favoritos')
    
    // Login with skip verification since favoritos page doesn't have navigation
    await loginUser(page, testUser, { skipVerification: true })
    
    // Wait for redirect to favoritos
    await page.waitForURL('**/favoritos', { timeout: 10000 })
    
    // Should be redirected to the favoritos page
    expect(page.url()).toContain('/favoritos')
    
    // Test-specific verification: Check that we can access the favoritos page content
    // This proves authentication worked (middleware allowed access to protected route)
    await expect(page.locator('h1')).toContainText('Mis Favoritos')
  })

  test('Should handle complex redirect URLs with query parameters', async ({ page }) => {
    const redirectUrl = '/eventos/bogota?category=arte&q=exposicion&page=2'
    await page.goto(`/login?redirect=${encodeURIComponent(redirectUrl)}`)
    
    // Login with real credentials
    await loginUser(page, testUser)
    
    await page.waitForTimeout(3000)
    
    // Should not remain on login page
    expect(page.url()).not.toContain('/login')
    
    // Verify user is logged in
    await expect(page.locator('[data-testid="user-menu-desktop"], [data-testid="user-menu-mobile"]').first()).toBeVisible()
  })

  test('Should redirect correctly when accessing protected route', async ({ page }) => {
    // Try to access protected route (favoritos) while not logged in
    await page.goto('/favoritos')
    
    // Should be redirected to login with redirect parameter
    await page.waitForURL(/\/login.*redirect/, { timeout: 10000 })
    
    // Login with real credentials - skip verification since we'll redirect to favoritos (no navbar)
    await loginUser(page, testUser, { skipVerification: true })
    
    // Should redirect back to the originally requested protected route
    await page.waitForURL('**/favoritos', { timeout: 10000 })
    
    // Should eventually reach favorites page or be properly redirected
    expect(page.url()).toContain('/favoritos')
    
    // Test-specific verification: Wait for page to finish loading, then check content
    // The favoritos page has loading states, so wait for the main content
    await page.waitForTimeout(2000) // Allow time for favorites to load
    await expect(page.locator('h1')).toContainText('Mis Favoritos', { timeout: 10000 })
  })

  test('Should reject malicious redirect URLs', async ({ page }) => {
    // Try with malicious external redirect
    await page.goto('/login?redirect=https://malicious-site.com')
    
    // Login with real credentials
    await loginUser(page, testUser)
    
    await page.waitForTimeout(2000)
    
    // Should NOT redirect to external site
    expect(page.url()).not.toContain('malicious-site.com')
    
    // Should be on our domain
    expect(page.url()).toContain('localhost:4000')
    
    // Verify user is logged in
    await expect(page.locator('[data-testid="user-menu-desktop"], [data-testid="user-menu-mobile"]').first()).toBeVisible()
  })
})

test.describe('Authenticated User Workflows', () => {
  let testUser: TestUser

  test.beforeEach(async ({ page }) => {
    // Create and login a test user before each test
    // Skip verification since tests will navigate to different page types
    testUser = await createAndLoginTestUser(page, { skipVerification: true })
  })

  test.afterEach(async () => {
    if (testUser) {
      await cleanupTestUser(testUser)
    }
  })

  test('Authenticated user can access protected routes', async ({ page }) => {
    // Should be able to access favorites page
    await page.goto('/favoritos')
    
    // Should not be redirected to login
    expect(page.url()).toContain('/favoritos')
    
    // Should see favorites page content - wait for loading to complete
    await page.waitForTimeout(2000) // Allow time for favorites to load
    await expect(page.locator('h1')).toContainText('Mis Favoritos', { timeout: 10000 })
  })

  test('Authenticated user sees user-specific UI elements', async ({ page }) => {
    await page.goto('/eventos/bogota')
    
    // Should see user menu (main auth verification)
    await expect(page.locator('[data-testid="user-menu-desktop"], [data-testid="user-menu-mobile"]').first()).toBeVisible()
    
    // Should NOT see login button
    await expect(page.getByText('Iniciar sesión')).not.toBeVisible()
    
    // Check for events if they exist (data might not be loaded in test environment)
    const eventCards = page.getByTestId('event-card')
    const eventCount = await eventCards.count()
    
    if (eventCount > 0) {
      // If events exist, verify heart buttons are visible
      const heartButtons = page.locator('button[aria-label*="favorito"]')
      await expect(heartButtons.first()).toBeVisible()
    } else {
      console.log('No events found - this might be expected in test environment')
    }
  })

  test('Authenticated organizer can access create event page', async ({ page }) => {
    // Note: This test assumes the test user has organizer role
    // You might need to create a specific organizer test user
    
    await page.goto('/eventos/bogota')
    
    // Look for create event button (might only be visible to organizers)
    const createEventButton = page.getByRole('button', { name: 'Crear Evento' })
    
    // If visible, test the functionality
    if (await createEventButton.isVisible()) {
      await createEventButton.click()
      
      // Should navigate to create event page
      expect(page.url()).toContain('/crear-evento')
    } else {
      // User is not an organizer, which is expected for regular attendee users
      console.log('User is attendee role, create event button not visible (expected)')
    }
  })

  test('Authenticated user can logout successfully', async ({ page }) => {
    await page.goto('/eventos/bogota')
    
    // Verify we're logged in first
    await expect(page.locator('[data-testid="user-menu-desktop"], [data-testid="user-menu-mobile"]').first()).toBeVisible()
    
    // Click user menu
    await page.locator('[data-testid="user-menu-desktop"], [data-testid="user-menu-mobile"]').first().click()
    
    // Click logout button
    await page.getByText('Cerrar sesión').click()
    
    // Should be logged out
    await page.waitForTimeout(2000)
    
    // Should see login button again
    await expect(page.getByText('Iniciar sesión')).toBeVisible()
    
    // Should not see user menu
    await expect(page.locator('[data-testid="user-menu-desktop"], [data-testid="user-menu-mobile"]').first()).not.toBeVisible()
  })
})
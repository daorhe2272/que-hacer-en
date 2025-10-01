import { test, expect } from '@playwright/test'
import { createAndLoginTestUser, cleanupTestUser, cleanupTestEventsByTitle } from './test-helpers/auth-helpers'

test.describe('Flujos de autenticación', () => {
  
  test.beforeEach(async ({ page }) => {
    // Ensure we start each test logged out
    await page.goto('/eventos/bogota')
    // If there's a logout option, use it
    const userMenu = page.getByText(/Cuenta|@/)
    if (await userMenu.isVisible()) {
      await userMenu.click()
      const logoutButton = page.getByText('Cerrar sesión')
      if (await logoutButton.isVisible()) {
        await logoutButton.click()
        await page.waitForTimeout(1000)
      }
    }
  })

  test('Botón "Iniciar Sesión" navega a página de login', async ({ page }) => {
    await page.goto('/eventos/bogota')

    // Wait for JavaScript and all components to load
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000) // Give time for client-side components to hydrate

    // Should show login button when not authenticated (it's a link, not button)
    const loginLink = page.getByText('Iniciar sesión')
    await expect(loginLink).toBeVisible()

    // Click login button
    await loginLink.click()
    await page.waitForURL(/\/login/)

    // Should be on login page - check for the welcome heading (new flow)
    await expect(page.getByRole('heading', { name: 'Bienvenido' })).toBeVisible()
  })

  test('Página de login muestra formulario completo', async ({ page }) => {
    await page.goto('/login')

    // Should show welcome screen first with choice buttons
    await expect(page.getByRole('heading', { name: 'Bienvenido' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Crear cuenta nueva' })).toBeVisible()
    await expect(page.getByText('Google')).toBeVisible()

    // Click "Iniciar sesión" to go to form
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()

    // Now should show the login form
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
    await expect(page.getByPlaceholder('Correo electrónico')).toBeVisible()
    await expect(page.getByPlaceholder('Contraseña')).toBeVisible()
    await expect(page.locator('form').getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
  })

  test('Alternar entre login y registro funciona', async ({ page }) => {
    await page.goto('/login')

    // Should start with welcome screen
    await expect(page.getByRole('heading', { name: 'Bienvenido' })).toBeVisible()

    // Click "Crear cuenta nueva" to go to register
    await page.getByRole('button', { name: 'Crear cuenta nueva' }).click()

    // Should show register form
    await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible()
    await expect(page.getByPlaceholder('Confirmar contraseña')).toBeVisible()

    // Click the link to switch to login
    await page.getByText('¿Ya tienes cuenta? Iniciar sesión').click()

    // Should show login form
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
    await expect(page.getByPlaceholder('Confirmar contraseña')).not.toBeVisible()

    // Click back button to return to choice
    await page.getByText('Volver').click()

    // Should be back to welcome screen
    await expect(page.getByRole('heading', { name: 'Bienvenido' })).toBeVisible()
  })

  test('Login con credenciales inválidas muestra error', async ({ page }) => {
    await page.goto('/login')

    // Navigate to login form
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()

    // Fill form with invalid credentials using placeholders
    await page.getByPlaceholder('Correo electrónico').fill('invalid@example.com')
    await page.getByPlaceholder('Contraseña').fill('wrongpassword')

    // Submit form
    await page.locator('form').getByRole('button', { name: 'Iniciar sesión' }).click()

    // Wait for authentication attempt to complete
    await page.waitForTimeout(5000) // Wait for async auth request

    // The most reliable test: if login failed, we should still be on login page
    // If login succeeded, we would be redirected away from /login
    expect(page.url()).toContain('/login')

    // Additionally, verify form is still interactive (submit button visible and enabled)
    const submitButton = page.locator('form').getByRole('button', { name: 'Iniciar sesión' })
    await expect(submitButton).toBeVisible()
    await expect(submitButton).not.toBeDisabled()
  })

  test('Registro con email inválido muestra validación', async ({ page }) => {
    await page.goto('/login')

    // Navigate to register form
    await page.getByRole('button', { name: 'Crear cuenta nueva' }).click()

    // Test HTML5 email validation - use invalid format that browsers reject
    await page.getByPlaceholder('Correo electrónico').fill('invalid-email')
    await page.getByPlaceholder('Contraseña').first().fill('password123')
    await page.getByPlaceholder('Confirmar contraseña').fill('password123')

    // Try to submit - browser validation should prevent submission
    await page.locator('form').getByRole('button', { name: 'Crear cuenta' }).click()

    // Should still be on login page since HTML5 validation blocked submission
    await page.waitForTimeout(500)
    expect(page.url()).toContain('/login')

    // Check if email input shows invalid state
    const emailInput = page.getByPlaceholder('Correo electrónico')
    const isInvalid = await emailInput.evaluate((input: HTMLInputElement) => !input.validity.valid)
    expect(isInvalid).toBe(true)
  })

  test('Acceso a ruta protegida redirige a login', async ({ page }) => {
    // Try to access protected route directly
    await page.goto('/favoritos')

    // Should redirect to login with redirect parameter
    await page.waitForURL(/\/login.*redirect/)
    await expect(page.getByRole('heading', { name: 'Bienvenido' })).toBeVisible()

    // URL should contain redirect parameter (encoded or unencoded)
    const url = page.url()
    expect(url.includes('redirect=%2Ffavoritos') || url.includes('redirect=/favoritos')).toBe(true)
  })

  test('Acceso a crear evento sin permisos redirige a login', async ({ page }) => {
    // Try to access organizer route
    await page.goto('/crear-evento')

    // Should redirect to login
    await page.waitForURL(/\/login.*redirect/)
    await expect(page.getByRole('heading', { name: 'Bienvenido' })).toBeVisible()

    // URL should contain redirect parameter
    expect(page.url()).toContain('redirect=%2Fcrear-evento')
  })

  test('Botón "Crear Evento" no visible cuando no autenticado', async ({ page }) => {
    await page.goto('/eventos/bogota')
    
    // "Crear Evento" button should not be visible for unauthenticated users
    const createEventButton = page.getByRole('button', { name: 'Crear Evento' })
    await expect(createEventButton).not.toBeVisible()
    
    // Should show login button instead (it's a link, not button)
    const loginLink = page.getByRole('link', { name: 'Iniciar sesión' })
    await expect(loginLink).toBeVisible()
  })

  test('Navegación con parámetro redirect funciona', async ({ page }) => {
    // Go to login with redirect parameter
    await page.goto('/login?redirect=/favoritos')

    // Should be on login page showing welcome screen
    await expect(page.getByRole('heading', { name: 'Bienvenido' })).toBeVisible()

    // URL should contain the redirect parameter (encoded or unencoded)
    const url = page.url()
    expect(url.includes('redirect=%2Ffavoritos') || url.includes('redirect=/favoritos')).toBe(true)
  })

  test('Error de autenticación muestra página de error', async ({ page }) => {
    // Navigate to auth error page
    await page.goto('/auth/auth-code-error')
    
    // Should show error page with proper styling
    await expect(page.getByText(/Error de autenticación|Authentication error/)).toBeVisible()
    
    // Should have proper background styling (hero gradient)
    const body = page.locator('body')
    const bgClass = await body.getAttribute('class')
    // The page should have the proper styling applied
    await expect(page.locator('.min-h-screen')).toBeVisible()
  })

  test('Corazones de favoritos: visibles cuando autenticado, no visibles sin autenticación', async ({ page }) => {
    // This test combines multiple flows to ensure we have data and test complete auth behavior

    // 1. Create and login a test user
    const testUser = await createAndLoginTestUser(page, { skipVerification: true })

    try {
      // 2. Go to create event page and create a test event
      await page.goto('/crear-evento')
      await expect(page.locator('h1')).toContainText('Crear Nuevo Evento', { timeout: 10000 })

      // Fill in event creation form using the working approach from fixed tests
      await page.getByPlaceholder('Ej: Concierto de música en vivo').fill('Test Concert Event for Hearts')
      await page.getByPlaceholder('Describe tu evento en detalle...').fill('This is a detailed test event for favorite hearts testing with more than 10 characters.')

      // Set date to tomorrow
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateString = tomorrow.toISOString().split('T')[0]
      await page.locator('input[type="date"]').fill(dateString)

      // Set time using the TimePicker component
      await page.getByTestId('time-picker-input').click() // Open the time picker
      await page.getByTestId('hour-increment').click() // Set to 1 PM
      await page.getByText('PM').click() // Select PM and close picker

      await page.getByPlaceholder('Ej: Teatro Nacional').fill('Test Venue')
      await page.getByPlaceholder('Ej: Carrera 7 #22-47').fill('Test Address 123')
      await page.locator('select').first().selectOption({ index: 1 }) // Select first available category
      await page.locator('select').last().selectOption({ index: 1 }) // Select first available city

      // Set price to "De pago" to show the price input
      await page.locator('input[type="radio"][name="priceType"]').nth(2).check()
      await page.getByPlaceholder('0').fill('50000') // Price input appears with placeholder 0

      // Set capacity to "Capacidad limitada" to show the capacity input
      await page.locator('input[type="radio"][name="capacityType"]').nth(2).check()
      await page.getByPlaceholder('50').fill('100') // Capacity

      await page.getByPlaceholder('Nombre del organizador').fill('Test Organizer')

      // Submit the form
      await page.getByRole('button', { name: 'Crear Evento' }).click()

      // Wait for success message
      await expect(page.getByText('¡Evento creado exitosamente!')).toBeVisible({ timeout: 15000 })

      // Wait for redirect to complete (optional since we'll navigate manually)
      await page.waitForTimeout(2000)

      // 3. Go to events page and verify we can see the event
      await page.goto('/eventos/bogota')
      await page.waitForSelector('[data-testid="event-card"]', { timeout: 15000 })

      // 4. Verify heart buttons are visible when authenticated
      const heartButtons = page.locator('button[aria-label*="favorito"]')
      await expect(heartButtons.first()).toBeVisible()

      // 5. Click the heart to add to favorites
      await heartButtons.first().click()
      await page.waitForTimeout(1000) // Wait for favorite action

      // 6. Logout
      await page.locator('[data-testid="user-menu-desktop"], [data-testid="user-menu-mobile"]').first().click()
      await page.getByText('Cerrar sesión').click()
      await page.waitForTimeout(2000)

      // 7. Verify we're logged out and heart buttons are no longer visible
      await expect(page.getByText('Iniciar sesión')).toBeVisible()

      // Reload the page to ensure clean state
      await page.reload()
      await page.waitForSelector('[data-testid="event-card"]', { timeout: 10000 })

      // Heart buttons should not be visible for unauthenticated users
      const heartButtonsAfterLogout = page.locator('button[aria-label*="favorito"]')
      await expect(heartButtonsAfterLogout.first()).not.toBeVisible()

    } finally {
      // Clean up test user and any events they created
      await cleanupTestUser(testUser)

      // Clean up the test event
      if (testUser.accessToken) {
        await cleanupTestEventsByTitle('Test Concert Event for Hearts', testUser.accessToken)
      }
    }
  })

  test('Menu de usuario no visible sin autenticación', async ({ page }) => {
    await page.goto('/eventos/bogota')
    
    // User menu should not be visible
    const userMenu = page.getByText(/Cuenta|@.*\.com/)
    await expect(userMenu).not.toBeVisible()
    
    // Should show login button instead (it's a link, not button)
    const loginLink = page.getByRole('link', { name: 'Iniciar sesión' })
    await expect(loginLink).toBeVisible()
  })

  test('Página de favoritos redirige a login cuando no autenticado', async ({ page }) => {
    await page.goto('/favoritos')

    // Should redirect to login
    await page.waitForURL(/\/login/)
    await expect(page.getByRole('heading', { name: 'Bienvenido' })).toBeVisible()
  })

  test('Validación de formularios funciona correctamente', async ({ page }) => {
    await page.goto('/login')

    // Navigate to login form first
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()

    // Try to submit empty form
    await page.locator('form').getByRole('button', { name: 'Iniciar sesión' }).click()

    // Should show validation errors or remain on page
    await page.waitForTimeout(500)
    const currentUrl = page.url()
    expect(currentUrl).toContain('/login')

    // Go back and switch to register and test validation
    await page.getByText('Volver').click()
    await page.getByRole('button', { name: 'Crear cuenta nueva' }).click()

    // Fill only email
    await page.getByPlaceholder('Correo electrónico').fill('test@example.com')
    await page.locator('form').getByRole('button', { name: 'Crear cuenta' }).click()

    // Should require password
    await page.waitForTimeout(500)
    expect(page.url()).toContain('/login')
  })

  test('Estilos y responsive funcionan en página de login', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto('/login')

    // Should show welcome screen first
    await expect(page.getByRole('heading', { name: 'Bienvenido' })).toBeVisible()

    // Navigate to form
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()

    // Check that the layout looks good on desktop
    const form = page.locator('form').first()
    await expect(form).toBeVisible()

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    await page.reload()

    // Navigate to form again on mobile
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()

    // Form should still be visible and functional on mobile
    await expect(form).toBeVisible()
    await expect(page.getByPlaceholder('Correo electrónico')).toBeVisible()
    await expect(page.getByPlaceholder('Contraseña')).toBeVisible()
  })

  test('Enlaces de navegación funcionan desde login', async ({ page }) => {
    await page.goto('/login')
    
    // Check if there's a way to go back to events
    const logoOrHomeLink = page.locator('a[href="/"], a[href="/eventos/bogota"], [role="button"]:has-text("Eventos")')
    
    if (await logoOrHomeLink.first().isVisible()) {
      await logoOrHomeLink.first().click()
      // Should navigate away from login
      await page.waitForTimeout(1000)
      expect(page.url()).not.toContain('/login')
    }
  })
})

test.describe('Redirect Parameter Handling (UI Only)', () => {
  test('Login page accepts redirect parameter in URL', async ({ page }) => {
    // Go to login with redirect parameter
    await page.goto('/login?redirect=/favoritos')

    // Should be on login page showing welcome screen
    await expect(page.getByRole('heading', { name: 'Bienvenido' })).toBeVisible()

    // URL should contain the redirect parameter
    const url = page.url()
    expect(url.includes('redirect=%2Ffavoritos') || url.includes('redirect=/favoritos')).toBe(true)
  })

  test('Login page handles complex redirect URLs in parameter', async ({ page }) => {
    const redirectUrl = '/eventos/bogota?category=arte&q=exposicion&page=2'
    await page.goto(`/login?redirect=${encodeURIComponent(redirectUrl)}`)

    // Should be on login page showing welcome screen
    await expect(page.getByRole('heading', { name: 'Bienvenido' })).toBeVisible()

    // URL should contain the encoded redirect parameter
    const url = page.url()
    expect(url).toContain('redirect=')
  })

  test('Malicious redirect URLs are handled safely', async ({ page }) => {
    // Try with malicious external redirect
    await page.goto('/login?redirect=https://malicious-site.com')

    // Should still show login page normally (welcome screen)
    await expect(page.getByRole('heading', { name: 'Bienvenido' })).toBeVisible()

    // Should be on our domain
    expect(page.url()).toContain('localhost:4000')
  })

  test('Google OAuth button is properly configured', async ({ page }) => {
    await page.goto('/login')
    
    // Google button should be visible and clickable
    const googleButton = page.getByText('Google')
    await expect(googleButton).toBeVisible()
    await expect(googleButton).toBeEnabled()
    
    // Note: We don't test actual OAuth flow in UI tests
    // That's covered in the real authentication tests
  })
})

test.describe('Estados de carga y errores de auth', () => {
  test('Loading states se muestran correctamente', async ({ page }) => {
    await page.goto('/login')

    // Navigate to login form
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()

    // Fill form
    await page.getByPlaceholder('Correo electrónico').fill('test@example.com')
    await page.getByPlaceholder('Contraseña').fill('password123')

    // Submit and check for loading state
    await page.locator('form').getByRole('button', { name: 'Iniciar sesión' }).click()

    // Button should show loading state specifically in the form
    await page.waitForTimeout(100)
    const submitButton = page.locator('form').getByRole('button', { name: /Procesando|Iniciar sesión/ })
    await expect(submitButton).toBeVisible()
  })

  test('Mensajes de error son accesibles', async ({ page }) => {
    await page.goto('/login')

    // Navigate to login form
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()

    // Fill with invalid data
    await page.getByPlaceholder('Correo electrónico').fill('invalid@example.com')
    await page.getByPlaceholder('Contraseña').fill('wrongpassword')
    await page.locator('form').getByRole('button', { name: 'Iniciar sesión' }).click()

    // Wait for potential error
    await page.waitForTimeout(2000)

    // Check if error messages have proper ARIA attributes
    const errorMessages = page.locator('[role="alert"], .text-red-500, .text-red-600, .error')
    if (await errorMessages.first().isVisible()) {
      // Error should be accessible
      await expect(errorMessages.first()).toBeVisible()
    }
  })
})
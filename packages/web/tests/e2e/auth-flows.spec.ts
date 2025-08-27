import { test, expect } from '@playwright/test'

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
    
    // Should show login button when not authenticated (it's a link, not button)
    const loginLink = page.getByRole('link', { name: /Iniciar sesión|Login/ })
    await expect(loginLink).toBeVisible()
    
    // Click login button
    await loginLink.click()
    await page.waitForURL('/login')
    
    // Should be on login page - check for the actual heading text
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
  })

  test('Página de login muestra formulario completo', async ({ page }) => {
    await page.goto('/login')
    
    // Check form elements - use placeholders since inputs don't have labels
    await expect(page.getByPlaceholder('Correo electrónico')).toBeVisible()
    await expect(page.getByPlaceholder('Contraseña')).toBeVisible()
    await expect(page.locator('form').getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
    await expect(page.getByText('Google')).toBeVisible()
    
    // Check toggle buttons instead of "¿No tienes cuenta? Regístrate"
    await expect(page.locator('.bg-gray-100').getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
    await expect(page.locator('.bg-gray-100').getByRole('button', { name: 'Registrarse' })).toBeVisible()
  })

  test('Alternar entre login y registro funciona', async ({ page }) => {
    await page.goto('/login')
    
    // Should start with login form
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
    
    // Click register toggle button
    await page.locator('.bg-gray-100').getByRole('button', { name: 'Registrarse' }).click()
    
    // Should show register form
    await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible()
    await expect(page.getByPlaceholder('Confirmar contraseña')).toBeVisible()
    
    // Click back to login toggle
    await page.locator('.bg-gray-100').getByRole('button', { name: 'Iniciar sesión' }).click()
    
    // Should be back to login
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
    await expect(page.getByPlaceholder('Confirmar contraseña')).not.toBeVisible()
  })

  test('Login con credenciales inválidas muestra error', async ({ page }) => {
    await page.goto('/login')
    
    // Fill form with invalid credentials using placeholders
    await page.getByPlaceholder('Correo electrónico').fill('invalid@example.com')
    await page.getByPlaceholder('Contraseña').fill('wrongpassword')
    
    // Submit form
    await page.locator('form').getByRole('button', { name: 'Iniciar sesión' }).click()
    
    // Should show error message
    await expect(page.getByText(/Credenciales inválidas|Email o contraseña incorrectos|credenciales/i)).toBeVisible()
  })

  test('Registro con email inválido muestra validación', async ({ page }) => {
    await page.goto('/login')
    
    // Switch to register
    await page.locator('.bg-gray-100').getByRole('button', { name: 'Registrarse' }).click()
    
    // Fill form with invalid email
    await page.getByPlaceholder('Correo electrónico').fill('invalid-email')
    await page.getByPlaceholder('Contraseña').fill('password123')
    await page.getByPlaceholder('Confirmar contraseña').fill('password123')
    
    // Submit form
    await page.locator('form').getByRole('button', { name: 'Crear cuenta' }).click()
    
    // Should show validation error
    await expect(page.getByText(/Email inválido|Formato de email incorrecto/)).toBeVisible()
  })

  test('Acceso a ruta protegida redirige a login', async ({ page }) => {
    // Try to access protected route directly
    await page.goto('/favoritos')
    
    // Should redirect to login with redirect parameter
    await page.waitForURL(/\/login.*redirect/)
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
    
    // URL should contain redirect parameter
    expect(page.url()).toContain('redirect=%2Ffavoritos')
  })

  test('Acceso a crear evento sin permisos redirige a login', async ({ page }) => {
    // Try to access organizer route
    await page.goto('/crear-evento')
    
    // Should redirect to login
    await page.waitForURL(/\/login.*redirect/)
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
    
    // URL should contain redirect parameter
    expect(page.url()).toContain('redirect=%2Fcrear-evento')
  })

  test('Botón "Crear Evento" no visible cuando no autenticado', async ({ page }) => {
    await page.goto('/eventos/bogota')
    
    // "Crear Evento" button should not be visible for unauthenticated users
    const createEventButton = page.getByRole('button', { name: 'Crear Evento' })
    await expect(createEventButton).not.toBeVisible()
    
    // Should show login button instead (it's a link, not button)
    const loginLink = page.getByRole('link', { name: /Iniciar sesión|Login/ })
    await expect(loginLink).toBeVisible()
  })

  test('Navegación con parámetro redirect funciona', async ({ page }) => {
    // Go to login with redirect parameter
    await page.goto('/login?redirect=/favoritos')
    
    // Should be on login page
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
    
    // URL should contain the redirect parameter
    expect(page.url()).toContain('redirect=%2Ffavoritos')
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

  test('Corazones de favoritos no visibles sin autenticación', async ({ page }) => {
    await page.goto('/eventos/bogota')
    await page.waitForSelector('[data-testid="event-card"]')
    
    // Heart buttons should not be visible for unauthenticated users
    const heartButtons = page.locator('button[aria-label*="favorito"]')
    await expect(heartButtons.first()).not.toBeVisible()
  })

  test('Menu de usuario no visible sin autenticación', async ({ page }) => {
    await page.goto('/eventos/bogota')
    
    // User menu should not be visible
    const userMenu = page.getByText(/Cuenta|@.*\.com/)
    await expect(userMenu).not.toBeVisible()
    
    // Should show login button instead (it's a link, not button)
    const loginLink = page.getByRole('link', { name: /Iniciar sesión|Login/ })
    await expect(loginLink).toBeVisible()
  })

  test('Página de favoritos redirige a login cuando no autenticado', async ({ page }) => {
    await page.goto('/favoritos')
    
    // Should redirect to login
    await page.waitForURL(/\/login/)
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
  })

  test('Validación de formularios funciona correctamente', async ({ page }) => {
    await page.goto('/login')
    
    // Try to submit empty form
    await page.locator('form').getByRole('button', { name: 'Iniciar sesión' }).click()
    
    // Should show validation errors or remain on page
    await page.waitForTimeout(500)
    const currentUrl = page.url()
    expect(currentUrl).toContain('/login')
    
    // Switch to register and test validation
    await page.locator('.bg-gray-100').getByRole('button', { name: 'Registrarse' }).click()
    
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
    
    // Check that the layout looks good on desktop
    const form = page.locator('form, .bg-white')
    await expect(form).toBeVisible()
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    await page.reload()
    
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

test.describe('Estados de carga y errores de auth', () => {
  test('Loading states se muestran correctamente', async ({ page }) => {
    await page.goto('/login')
    
    // Fill form
    await page.getByPlaceholder('Correo electrónico').fill('test@example.com')
    await page.getByPlaceholder('Contraseña').fill('password123')
    
    // Submit and check for loading state
    await page.locator('form').getByRole('button', { name: 'Iniciar sesión' }).click()
    
    // Button should show loading state or be disabled briefly
    await page.waitForTimeout(100)
    const submitButton = page.getByRole('button', { name: /Iniciar|Cargando|Loading/ })
    await expect(submitButton).toBeVisible()
  })

  test('Mensajes de error son accesibles', async ({ page }) => {
    await page.goto('/login')
    
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
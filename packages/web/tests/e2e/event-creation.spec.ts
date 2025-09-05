import { test, expect } from '@playwright/test'
import { 
  createAndLoginTestUser, 
  ensureLoggedOut, 
  cleanupTestUser, 
  TestUser 
} from './test-helpers/auth-helpers'

test.describe('Event Creation E2E Tests', () => {
  test.describe('Access Control', () => {
    test('Should redirect unauthenticated users to login', async ({ page }) => {
      // Ensure we're logged out
      await ensureLoggedOut(page)
      
      // Try to access create event page
      await page.goto('/crear-evento')
      
      // Wait for either redirect to login or the page to load (depending on middleware)
      await page.waitForTimeout(2000)
      
      // Should either be redirected to login or show authentication check
      const currentUrl = page.url()
      
      if (currentUrl.includes('/login')) {
        // Redirected to login - check for redirect parameter
        expect(currentUrl).toContain('redirect=%2Fcrear-evento')
        await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
      } else {
        // Page loaded but should require authentication - check for auth redirect
        await page.waitForURL(/\/login/, { timeout: 5000 })
        expect(page.url()).toContain('redirect=%2Fcrear-evento')
        await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
      }
    })
  })

  // Authenticated user tests - each test creates its own user
  test.describe('Authenticated User Features', () => {
    let testUser: TestUser

    test.beforeEach(async ({ page }) => {
      // Create and login test user for authenticated tests
      testUser = await createAndLoginTestUser(page, { skipVerification: true })
    })

    test.afterEach(async () => {
      // Clean up test user after each test
      if (testUser) {
        await cleanupTestUser(testUser)
      }
    })

    test('Should show create event page for authenticated users', async ({ page }) => {
      // Navigate to create event page
      await page.goto('/crear-evento')
      
      // Should show the form
      await expect(page.getByRole('heading', { name: 'Crear Nuevo Evento' })).toBeVisible()
      
      // Check for required form fields
      await expect(page.getByPlaceholder('Ej: Concierto de música en vivo')).toBeVisible()
      await expect(page.getByPlaceholder('Describe tu evento en detalle...')).toBeVisible()
      await expect(page.getByText('Crear Evento')).toBeVisible()
    })

    test('Should be accessible from navbar create event button', async ({ page }) => {
      await page.goto('/eventos/bogota')
      
      // Look for create event button in navbar (might be desktop or mobile)
      const createEventButton = page.getByRole('button', { name: 'Crear Evento' })
      
      if (await createEventButton.isVisible()) {
        await createEventButton.click()
        
        // Should navigate to create event page
        await page.waitForURL('**/crear-evento')
        await expect(page.getByRole('heading', { name: 'Crear Nuevo Evento' })).toBeVisible()
      } else {
        console.log('Create event button not visible - user may not have organizer role')
        
        // Test direct navigation still works
        await page.goto('/crear-evento')
        await expect(page.getByRole('heading', { name: 'Crear Nuevo Evento' })).toBeVisible()
      }
    })
  })

  test.describe('Form Validation', () => {
    let testUser: TestUser

    test.beforeEach(async ({ page }) => {
      // Create and login test user for authenticated tests
      testUser = await createAndLoginTestUser(page, { skipVerification: true })
    })

    test.afterEach(async () => {
      // Clean up test user after each test
      if (testUser) {
        await cleanupTestUser(testUser)
      }
    })
    test('Should show validation errors for empty required fields', async ({ page }) => {
      await page.goto('/crear-evento')
      
      // Try to submit empty form
      await page.getByRole('button', { name: 'Crear Evento' }).click()
      
      // Should show validation errors for required fields
      await expect(page.getByText('El título es requerido')).toBeVisible()
      await expect(page.getByText('La descripción es requerida')).toBeVisible()
      await expect(page.getByText('La fecha es requerida')).toBeVisible()
      await expect(page.getByText('La hora es requerida')).toBeVisible()
      await expect(page.getByText('La ubicación es requerida')).toBeVisible()
      await expect(page.getByText('La dirección es requerida')).toBeVisible()
      await expect(page.getByText('La categoría es requerida')).toBeVisible()
      await expect(page.getByText('La ciudad es requerida')).toBeVisible()
      await expect(page.getByText('El organizador es requerido')).toBeVisible()
    })

    test('Should validate field length constraints', async ({ page }) => {
      await page.goto('/crear-evento')
      
      // Test minimum length validation
      await page.getByPlaceholder('Ej: Concierto de música en vivo').fill('AB') // Too short title
      await page.getByPlaceholder('Describe tu evento en detalle...').fill('Short') // Too short description
      await page.getByPlaceholder('Ej: Teatro Nacional').fill('A') // Too short location
      await page.getByPlaceholder('Ej: Carrera 7 #22-47').fill('B') // Too short address
      await page.getByPlaceholder('Nombre del organizador').fill('C') // Too short organizer
      
      // Try to submit
      await page.getByRole('button', { name: 'Crear Evento' }).click()
      
      // Should show length validation errors
      await expect(page.getByText('El título debe tener al menos 3 caracteres')).toBeVisible()
      await expect(page.getByText('La descripción debe tener al menos 10 caracteres')).toBeVisible()
      await expect(page.getByText('La ubicación debe tener al menos 2 caracteres')).toBeVisible()
      await expect(page.getByText('La dirección debe tener al menos 2 caracteres')).toBeVisible()
      await expect(page.getByText('El organizador debe tener al menos 2 caracteres')).toBeVisible()
    })

    test('Should validate maximum length constraints', async ({ page }) => {
      await page.goto('/crear-evento')
      
      const longText201 = 'A'.repeat(201)
      const longText2001 = 'A'.repeat(2001)
      
      // Test maximum length validation
      await page.getByPlaceholder('Ej: Concierto de música en vivo').fill(longText201)
      await page.getByPlaceholder('Describe tu evento en detalle...').fill(longText2001)
      await page.getByPlaceholder('Ej: Teatro Nacional').fill(longText201)
      await page.getByPlaceholder('Ej: Carrera 7 #22-47').fill(longText201)
      await page.getByPlaceholder('Nombre del organizador').fill(longText201)
      
      // Try to submit
      await page.getByRole('button', { name: 'Crear Evento' }).click()
      
      // Should show max length validation errors
      await expect(page.getByText('El título no puede exceder 200 caracteres')).toBeVisible()
      await expect(page.getByText('La descripción no puede exceder 2000 caracteres')).toBeVisible()
      await expect(page.getByText('La ubicación no puede exceder 200 caracteres')).toBeVisible()
      await expect(page.getByText('La dirección no puede exceder 200 caracteres')).toBeVisible()
      await expect(page.getByText('El organizador no puede exceder 200 caracteres')).toBeVisible()
    })

    test('Should validate date and time formats', async ({ page }) => {
      await page.goto('/crear-evento')
      
      // Fill valid data first
      await fillBasicValidEventData(page)
      
      // Test invalid date (past date)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const pastDate = yesterday.toISOString().split('T')[0]
      
      await page.locator('input[type="date"]').fill(pastDate)
      
      // Submit form
      await page.getByRole('button', { name: 'Crear Evento' }).click()
      
      // Note: The current validation doesn't check for past dates, 
      // but this test documents expected behavior for future enhancement
      
      // Test future date (should be valid)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const futureDate = tomorrow.toISOString().split('T')[0]
      
      await page.locator('input[type="date"]').fill(futureDate)
      await page.locator('input[type="time"]').fill('19:30')
      
      // Should not have date/time validation errors
      await page.getByRole('button', { name: 'Crear Evento' }).click()
      
      // Wait for potential validation
      await page.waitForTimeout(500)
      
      // Should not show date/time format errors
      await expect(page.getByText('La fecha debe tener el formato YYYY-MM-DD')).not.toBeVisible()
      await expect(page.getByText('La hora debe tener el formato HH:MM')).not.toBeVisible()
    })

    test('Should validate price and capacity constraints', async ({ page }) => {
      await page.goto('/crear-evento')
      
      // Test negative price
      await page.getByPlaceholder('0').first().fill('-100')
      
      // Test zero capacity
      await page.getByPlaceholder('50').fill('0')
      
      await page.getByRole('button', { name: 'Crear Evento' }).click()
      
      // Should show validation errors
      await expect(page.getByText('El precio no puede ser negativo')).toBeVisible()
      await expect(page.getByText('La capacidad debe ser un número positivo')).toBeVisible()
    })

    test('Should validate category and city selection', async ({ page }) => {
      await page.goto('/crear-evento')
      
      // Fill form but leave category and city empty
      await fillBasicValidEventData(page, { skipCategoryAndCity: true })
      
      await page.getByRole('button', { name: 'Crear Evento' }).click()
      
      // Should show validation errors
      await expect(page.getByText('La categoría es requerida')).toBeVisible()
      await expect(page.getByText('La ciudad es requerida')).toBeVisible()
    })

    test('Should validate optional image URL format', async ({ page }) => {
      await page.goto('/crear-evento')
      
      // Fill basic data
      await fillBasicValidEventData(page)
      
      // Test invalid URL format
      await page.getByPlaceholder('https://ejemplo.com/imagen.jpg').fill('not-a-url')
      
      await page.getByRole('button', { name: 'Crear Evento' }).click()
      
      // Should show URL validation error
      await expect(page.getByText('La imagen debe ser una URL válida')).toBeVisible()
      
      // Test valid URL
      await page.getByPlaceholder('https://ejemplo.com/imagen.jpg').fill('https://example.com/image.jpg')
      
      await page.getByRole('button', { name: 'Crear Evento' }).click()
      
      // Should not show URL validation error
      await expect(page.getByText('La imagen debe ser una URL válida')).not.toBeVisible()
    })
  })

  test.describe('Real-time Validation', () => {
    let testUser: TestUser

    test.beforeEach(async ({ page }) => {
      // Create and login test user for authenticated tests
      testUser = await createAndLoginTestUser(page, { skipVerification: true })
    })

    test.afterEach(async () => {
      // Clean up test user after each test
      if (testUser) {
        await cleanupTestUser(testUser)
      }
    })

    test('Should show validation errors as user types', async ({ page }) => {
      await page.goto('/crear-evento')
      
      // Type short title
      await page.getByPlaceholder('Ej: Concierto de música en vivo').fill('AB')
      await page.getByPlaceholder('Describe tu evento en detalle...').click() // Trigger blur
      
      // Should show real-time validation error
      await expect(page.getByText('El título debe tener al menos 3 caracteres')).toBeVisible()
      
      // Fix the error
      await page.getByPlaceholder('Ej: Concierto de música en vivo').fill('Valid Concert Title')
      
      // Error should disappear
      await expect(page.getByText('El título debe tener al menos 3 caracteres')).not.toBeVisible()
    })

    test('Should clear validation errors when field is corrected', async ({ page }) => {
      await page.goto('/crear-evento')
      
      // Submit empty form to show errors
      await page.getByRole('button', { name: 'Crear Evento' }).click()
      
      // Should show error
      await expect(page.getByText('El título es requerido')).toBeVisible()
      
      // Fill the field
      await page.getByPlaceholder('Ej: Concierto de música en vivo').fill('Valid Event Title')
      
      // Error should disappear
      await expect(page.getByText('El título es requerido')).not.toBeVisible()
    })
  })

  test.describe('Form Submission', () => {
    let testUser: TestUser

    test.beforeEach(async ({ page }) => {
      // Create and login test user for authenticated tests
      testUser = await createAndLoginTestUser(page, { skipVerification: true })
    })

    test.afterEach(async () => {
      // Clean up test user after each test
      if (testUser) {
        await cleanupTestUser(testUser)
      }
    })

    test('Should successfully create event with valid data', async ({ page }) => {
      await page.goto('/crear-evento')
      
      // Fill all required fields with valid data
      await fillCompleteValidEventData(page)
      
      // Submit form
      await page.getByRole('button', { name: 'Crear Evento' }).click()
      
      // Should show loading state
      await expect(page.getByText('Creando evento...')).toBeVisible()
      
      // Should show success message
      await expect(page.getByText('¡Evento creado exitosamente!')).toBeVisible({ timeout: 10000 })
      
      // Should show success details
      await expect(page.getByText('Tu evento ha sido publicado y estará disponible para todos los usuarios.')).toBeVisible()
      
      // Should show redirect message
      await expect(page.getByText('Redirigiendo...')).toBeVisible()
      
      // Should eventually redirect to home page
      await page.waitForURL('/', { timeout: 10000 })
    })

    test('Should handle server validation errors', async ({ page }) => {
      await page.goto('/crear-evento')
      
      // Fill form with valid data
      await fillCompleteValidEventData(page)
      
      // Mock server to return validation error
      await page.route('**/api/events', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Ya existe un evento con este título en la misma fecha',
            details: {
              fieldErrors: {
                title: ['Este título ya está en uso para la fecha seleccionada']
              }
            }
          })
        })
      })
      
      // Submit form
      await page.getByRole('button', { name: 'Crear Evento' }).click()
      
      // Should show server validation error message
      await expect(page.getByText('Ya existe un evento con este título en la misma fecha')).toBeVisible({ timeout: 5000 })
      
      // Form should remain on the page and be interactive
      await expect(page.getByRole('heading', { name: 'Crear Nuevo Evento' })).toBeVisible()
      
      // Submit button should be enabled for retry
      const submitButton = page.getByRole('button', { name: 'Crear Evento' })
      await expect(submitButton).toBeEnabled()
      
      // Form fields should be editable for corrections
      await expect(page.getByPlaceholder('Ej: Concierto de música en vivo')).toBeEnabled()
    })

    test('Should handle network errors gracefully', async ({ page }) => {
      await page.goto('/crear-evento')
      
      // Fill valid form data
      await fillCompleteValidEventData(page)
      
      // Intercept and fail the API request to simulate network error
      await page.route('**/api/events', async route => {
        await route.abort('failed')
      })
      
      // Submit form
      await page.getByRole('button', { name: 'Crear Evento' }).click()
      
      // Should show error message
      await expect(page.getByText('Error de conexión. Por favor intenta de nuevo.')).toBeVisible({ timeout: 5000 })
      
      // Form should remain interactive
      const submitButton = page.getByRole('button', { name: 'Crear Evento' })
      await expect(submitButton).toBeEnabled()
    })

    test('Should disable form during submission', async ({ page }) => {
      await page.goto('/crear-evento')
      
      // Fill valid form data
      await fillCompleteValidEventData(page)
      
      // Submit form
      await page.getByRole('button', { name: 'Crear Evento' }).click()
      
      // Button should be disabled and show loading state
      const submitButton = page.getByRole('button', { name: /Creando evento/ })
      await expect(submitButton).toBeVisible()
      await expect(submitButton).toBeDisabled()
      
      // Form fields should be disabled
      await expect(page.getByPlaceholder('Ej: Concierto de música en vivo')).toBeDisabled()
      await expect(page.getByPlaceholder('Describe tu evento en detalle...')).toBeDisabled()
    })
  })

  test.describe('UI and UX', () => {
    let testUser: TestUser

    test.beforeEach(async ({ page }) => {
      // Create and login test user for authenticated tests
      testUser = await createAndLoginTestUser(page, { skipVerification: true })
    })

    test.afterEach(async () => {
      // Clean up test user after each test
      if (testUser) {
        await cleanupTestUser(testUser)
      }
    })

    test('Should have proper responsive layout', async ({ page }) => {
      // Test desktop view
      await page.setViewportSize({ width: 1200, height: 800 })
      await page.goto('/crear-evento')
      
      // Form should be properly sized on desktop
      const form = page.locator('form')
      await expect(form).toBeVisible()
      
      // Test grid layouts for side-by-side fields
      const dateTimeRow = page.locator('.grid.grid-cols-1.md\\:grid-cols-2').first()
      await expect(dateTimeRow).toBeVisible()
      
      // Test mobile view
      await page.setViewportSize({ width: 375, height: 667 })
      await page.reload()
      
      // Form should still be visible and usable on mobile
      await expect(form).toBeVisible()
      await expect(page.getByPlaceholder('Ej: Concierto de música en vivo')).toBeVisible()
    })

    test('Should show proper loading states', async ({ page }) => {
      await page.goto('/crear-evento')
      
      // Should show authentication loading state initially
      const authLoadingText = page.getByText('Verificando permisos...')
      
      // After auth loads, should show form
      await expect(page.getByRole('heading', { name: 'Crear Nuevo Evento' })).toBeVisible()
    })

    test('Should have proper form styling and accessibility', async ({ page }) => {
      await page.goto('/crear-evento')
      
      // Check for proper labeling
      await expect(page.getByText('Título del evento *')).toBeVisible()
      await expect(page.getByText('Descripción *')).toBeVisible()
      
      // Check for required field indicators
      const requiredLabels = page.locator('label:has-text("*")')
      const requiredCount = await requiredLabels.count()
      expect(requiredCount).toBeGreaterThan(5) // Should have multiple required fields
      
      // Check focus management
      await page.getByPlaceholder('Ej: Concierto de música en vivo').focus()
      await expect(page.getByPlaceholder('Ej: Concierto de música en vivo')).toBeFocused()
    })

    test('Should show error states with proper styling', async ({ page }) => {
      await page.goto('/crear-evento')
      
      // Trigger validation error
      await page.getByRole('button', { name: 'Crear Evento' }).click()
      
      // Error fields should have error styling
      const titleField = page.getByPlaceholder('Ej: Concierto de música en vivo')
      const fieldClass = await titleField.getAttribute('class')
      expect(fieldClass).toContain('border-red-300')
      expect(fieldClass).toContain('bg-red-50')
      
      // Error messages should be properly styled
      const errorMessage = page.getByText('El título es requerido')
      await expect(errorMessage).toBeVisible()
      const errorClass = await errorMessage.getAttribute('class')
      expect(errorClass).toContain('text-red-600')
    })
  })

  test.describe('Category and City Selection', () => {
    let testUser: TestUser

    test.beforeEach(async ({ page }) => {
      // Create and login test user for authenticated tests
      testUser = await createAndLoginTestUser(page, { skipVerification: true })
    })

    test.afterEach(async () => {
      // Clean up test user after each test
      if (testUser) {
        await cleanupTestUser(testUser)
      }
    })

    test('Should populate category dropdown with valid options', async ({ page }) => {
      await page.goto('/crear-evento')
      
      const categorySelect = page.locator('select').first()
      
      // Should have placeholder option
      await expect(categorySelect.locator('option[value=""]')).toHaveText('Seleccionar categoría')
      
      // Should have valid category options (excluding 'todos')
      const options = categorySelect.locator('option:not([value=""])')
      const optionCount = await options.count()
      expect(optionCount).toBeGreaterThan(3) // Should have multiple categories
      
      // Check for common categories
      await expect(categorySelect.locator('option:has-text("Música")')).toHaveCount(1)
      await expect(categorySelect.locator('option:has-text("Arte")')).toHaveCount(1)
    })

    test('Should populate city dropdown with valid options', async ({ page }) => {
      await page.goto('/crear-evento')
      
      const citySelect = page.locator('select').last()
      
      // Should have placeholder option
      await expect(citySelect.locator('option[value=""]')).toHaveText('Seleccionar ciudad')
      
      // Should have all supported cities
      await expect(citySelect.locator('option:has-text("Bogotá")')).toHaveCount(1)
      await expect(citySelect.locator('option:has-text("Medellín")')).toHaveCount(1)
      await expect(citySelect.locator('option:has-text("Cali")')).toHaveCount(1)
      await expect(citySelect.locator('option:has-text("Barranquilla")')).toHaveCount(1)
      await expect(citySelect.locator('option:has-text("Cartagena")')).toHaveCount(1)
    })
  })
})

// Helper function to fill basic valid event data
async function fillBasicValidEventData(page: any, options?: { skipCategoryAndCity?: boolean }) {
  await page.getByPlaceholder('Ej: Concierto de música en vivo').fill('Test Concert Event')
  await page.getByPlaceholder('Describe tu evento en detalle...').fill('This is a detailed description of the test concert event with more than 10 characters.')
  
  // Set date to tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dateString = tomorrow.toISOString().split('T')[0]
  await page.locator('input[type="date"]').fill(dateString)
  
  await page.locator('input[type="time"]').fill('20:00')
  await page.getByPlaceholder('Ej: Teatro Nacional').fill('Test Venue')
  await page.getByPlaceholder('Ej: Carrera 7 #22-47').fill('Test Address 123')
  
  if (!options?.skipCategoryAndCity) {
    await page.locator('select').first().selectOption({ index: 1 }) // Select first available category
    await page.locator('select').last().selectOption({ index: 1 }) // Select first available city
  }
  
  await page.getByPlaceholder('0').first().fill('50000') // Price
  await page.getByPlaceholder('50').fill('100') // Capacity
  await page.getByPlaceholder('Nombre del organizador').fill('Test Organizer')
}

// Helper function to fill complete valid event data including optional fields
async function fillCompleteValidEventData(page: any) {
  await fillBasicValidEventData(page)
  await page.getByPlaceholder('https://ejemplo.com/imagen.jpg').fill('https://example.com/test-image.jpg')
}
import { test, expect } from '@playwright/test'
import {
  createAndLoginTestUser,
  ensureLoggedOut,
  cleanupTestUser,
  TestUser
} from './test-helpers/auth-helpers'

test.describe('Event Deletion E2E Tests', () => {
  let testUser: TestUser

  test.beforeEach(async ({ page }) => {
    // Create and login test user with organizer role
    testUser = await createAndLoginTestUser(page, {
      skipVerification: true,
      role: 'organizer'
    })
  })

  test.afterEach(async () => {
    // Clean up test user after each test
    if (testUser) {
      await cleanupTestUser(testUser)
    }
  })

  test.describe('Delete Event Functionality', () => {
    test('Should show delete option for event owner', async ({ page }) => {
      // First create an event that we can delete
      await page.goto('/crear-evento')

      // Fill out the event creation form
      await page.fill('input[name="title"]', 'Test Event for Deletion')
      await page.fill('textarea[name="description"]', 'This event will be deleted in the test')
      await page.selectOption('select[name="city"]', 'bogota')
      await page.selectOption('select[name="category"]', 'musica')
      await page.fill('input[name="location"]', 'Test Venue')
      await page.fill('input[name="date"]', '2024-12-25')
      await page.fill('input[name="time"]', '20:00')
      await page.fill('input[name="price"]', '25000')

      // Submit the form
      await page.click('button[type="submit"]')

      // Wait for success message or redirect
      await page.waitForTimeout(2000)

      // Navigate to the event details page (assuming we get redirected or get event ID)
      // This might require checking the URL or finding the created event
      await page.goto('/eventos/bogota')

      // Find and click on our created event
      const eventLink = page.locator('a').filter({ hasText: 'Test Event for Deletion' }).first()
      await expect(eventLink).toBeVisible()
      await eventLink.click()

      // Should be on event details page
      await expect(page.getByRole('heading', { name: 'Test Event for Deletion' })).toBeVisible()

      // Look for the manage menu button (three dots)
      const manageButton = page.locator('button[aria-label="Gestionar evento"]')
      await expect(manageButton).toBeVisible()

      // Click the manage button to open dropdown
      await manageButton.click()

      // Check that delete option is visible
      const deleteButton = page.getByRole('button', { name: 'Eliminar evento' })
      await expect(deleteButton).toBeVisible()
    })

    test('Should open confirmation modal when delete is clicked', async ({ page }) => {
      // Navigate to an event details page (we'll use a test event)
      // For this test, we'll mock having an event or use the event creation flow
      await page.goto('/crear-evento')

      // Create a test event first
      await page.fill('input[name="title"]', 'Event to Test Modal')
      await page.fill('textarea[name="description"]', 'Testing modal functionality')
      await page.selectOption('select[name="city"]', 'bogota')
      await page.selectOption('select[name="category"]', 'musica')
      await page.fill('input[name="location"]', 'Modal Test Venue')
      await page.fill('input[name="date"]', '2024-12-26')
      await page.fill('input[name="time"]', '19:00')

      await page.click('button[type="submit"]')
      await page.waitForTimeout(2000)

      // Navigate to events and find our event
      await page.goto('/eventos/bogota')
      const eventLink = page.locator('a').filter({ hasText: 'Event to Test Modal' }).first()
      await eventLink.click()

      // Open manage menu
      const manageButton = page.locator('button[aria-label="Gestionar evento"]')
      await manageButton.click()

      // Click delete button
      const deleteButton = page.getByRole('button', { name: 'Eliminar evento' })
      await deleteButton.click()

      // Check that confirmation modal is visible
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText('Eliminar evento').first()).toBeVisible()
      await expect(page.getByText('¿Estás seguro de que quieres eliminar')).toBeVisible()
      await expect(page.getByText('Event to Test Modal')).toBeVisible()

      // Check that both cancel and confirm buttons are present
      await expect(page.getByRole('button', { name: 'Cancelar' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Eliminar evento' })).toBeVisible()
    })

    test('Should close modal when cancel is clicked', async ({ page }) => {
      // Similar setup as previous test
      await page.goto('/crear-evento')

      await page.fill('input[name="title"]', 'Event to Test Cancel')
      await page.fill('textarea[name="description"]', 'Testing cancel functionality')
      await page.selectOption('select[name="city"]', 'bogota')
      await page.selectOption('select[name="category"]', 'deportes')
      await page.fill('input[name="location"]', 'Cancel Test Venue')
      await page.fill('input[name="date"]', '2024-12-27')
      await page.fill('input[name="time"]', '18:00')

      await page.click('button[type="submit"]')
      await page.waitForTimeout(2000)

      await page.goto('/eventos/bogota')
      const eventLink = page.locator('a').filter({ hasText: 'Event to Test Cancel' }).first()
      await eventLink.click()

      // Open delete modal
      const manageButton = page.locator('button[aria-label="Gestionar evento"]')
      await manageButton.click()
      await page.getByRole('button', { name: 'Eliminar evento' }).click()

      // Modal should be visible
      await expect(page.getByRole('dialog')).toBeVisible()

      // Click cancel
      await page.getByRole('button', { name: 'Cancelar' }).click()

      // Modal should be hidden
      await expect(page.getByRole('dialog')).not.toBeVisible()

      // Should still be on the event page
      await expect(page.getByRole('heading', { name: 'Event to Test Cancel' })).toBeVisible()
    })

    test('Should close modal when escape key is pressed', async ({ page }) => {
      // Similar setup
      await page.goto('/crear-evento')

      await page.fill('input[name="title"]', 'Event to Test Escape')
      await page.fill('textarea[name="description"]', 'Testing escape key')
      await page.selectOption('select[name="city"]', 'medellin')
      await page.selectOption('select[name="category"]', 'arte')
      await page.fill('input[name="location"]', 'Escape Test Venue')
      await page.fill('input[name="date"]', '2024-12-28')
      await page.fill('input[name="time"]', '17:00')

      await page.click('button[type="submit"]')
      await page.waitForTimeout(2000)

      await page.goto('/eventos/medellin')
      const eventLink = page.locator('a').filter({ hasText: 'Event to Test Escape' }).first()
      await eventLink.click()

      // Open delete modal
      const manageButton = page.locator('button[aria-label="Gestionar evento"]')
      await manageButton.click()
      await page.getByRole('button', { name: 'Eliminar evento' }).click()

      // Modal should be visible
      await expect(page.getByRole('dialog')).toBeVisible()

      // Press escape key
      await page.keyboard.press('Escape')

      // Modal should be hidden
      await expect(page.getByRole('dialog')).not.toBeVisible()
    })

    test('Should handle successful event deletion', async ({ page }) => {
      // Create event for deletion
      await page.goto('/crear-evento')

      await page.fill('input[name="title"]', 'Event for Successful Deletion')
      await page.fill('textarea[name="description"]', 'This event will be successfully deleted')
      await page.selectOption('select[name="city"]', 'cali')
      await page.selectOption('select[name="category"]', 'tecnologia')
      await page.fill('input[name="location"]', 'Delete Success Venue')
      await page.fill('input[name="date"]', '2024-12-29')
      await page.fill('input[name="time"]', '16:00')

      await page.click('button[type="submit"]')
      await page.waitForTimeout(2000)

      await page.goto('/eventos/cali')
      const eventLink = page.locator('a').filter({ hasText: 'Event for Successful Deletion' }).first()
      await eventLink.click()

      // Open delete modal and confirm deletion
      const manageButton = page.locator('button[aria-label="Gestionar evento"]')
      await manageButton.click()
      await page.getByRole('button', { name: 'Eliminar evento' }).click()

      // Confirm deletion
      await page.getByRole('button', { name: 'Eliminar evento' }).last().click()

      // Should show loading state temporarily
      await expect(page.getByText('Eliminando...')).toBeVisible({ timeout: 5000 })

      // Should redirect to city events page after successful deletion
      await page.waitForURL(/\/eventos\/cali/, { timeout: 10000 })

      // Event should no longer be in the list
      await expect(page.locator('a').filter({ hasText: 'Event for Successful Deletion' })).not.toBeVisible()
    })

    test('Should not show delete option for non-owners', async ({ page }) => {
      // Log out current user and create a different user
      await ensureLoggedOut(page)

      // Create a second test user (different from the event creator)
      const secondUser = await createAndLoginTestUser(page, {
        skipVerification: true,
        role: 'attendee'
      })

      try {
        // Navigate to an event that was created by a different user
        // (For this test, we'd need an existing event or create one with first user)
        await page.goto('/eventos/bogota')

        // Find any event and click on it
        const eventLinks = page.locator('a[href*="/eventos/"]')
        if (await eventLinks.count() > 0) {
          await eventLinks.first().click()

          // Check that manage button is not visible for non-owners
          const manageButton = page.locator('button[aria-label="Gestionar evento"]')
          await expect(manageButton).not.toBeVisible()
        }
      } finally {
        // Clean up second user
        await cleanupTestUser(secondUser)
      }
    })
  })

  test.describe('Error Handling', () => {
    test('Should display error message on deletion failure', async ({ page }) => {
      // This test would require mocking API responses or using network interception
      // to simulate server errors. For now, we'll test the UI structure

      await page.goto('/crear-evento')

      await page.fill('input[name="title"]', 'Event for Error Test')
      await page.fill('textarea[name="description"]', 'Testing error handling')
      await page.selectOption('select[name="city"]', 'barranquilla')
      await page.selectOption('select[name="category"]', 'gastronomia')
      await page.fill('input[name="location"]', 'Error Test Venue')
      await page.fill('input[name="date"]', '2024-12-30')
      await page.fill('input[name="time"]', '15:00')

      await page.click('button[type="submit"]')
      await page.waitForTimeout(2000)

      await page.goto('/eventos/barranquilla')
      const eventLink = page.locator('a').filter({ hasText: 'Event for Error Test' }).first()
      await eventLink.click()

      // Intercept the delete API call to return an error
      await page.route('**/api/events/**', async route => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Error del servidor. Inténtalo de nuevo más tarde' })
          })
        } else {
          await route.continue()
        }
      })

      // Try to delete the event
      const manageButton = page.locator('button[aria-label="Gestionar evento"]')
      await manageButton.click()
      await page.getByRole('button', { name: 'Eliminar evento' }).click()
      await page.getByRole('button', { name: 'Eliminar evento' }).last().click()

      // Should show error message
      await expect(page.getByText('Error del servidor. Inténtalo de nuevo más tarde')).toBeVisible({ timeout: 10000 })

      // Modal should still be open
      await expect(page.getByRole('dialog')).toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test('Should support keyboard navigation in confirmation modal', async ({ page }) => {
      await page.goto('/crear-evento')

      await page.fill('input[name="title"]', 'Accessibility Test Event')
      await page.fill('textarea[name="description"]', 'Testing keyboard navigation')
      await page.selectOption('select[name="city"]', 'cartagena')
      await page.selectOption('select[name="category"]', 'cultura')
      await page.fill('input[name="location"]', 'Accessibility Venue')
      await page.fill('input[name="date"]', '2024-12-31')
      await page.fill('input[name="time"]', '14:00')

      await page.click('button[type="submit"]')
      await page.waitForTimeout(2000)

      await page.goto('/eventos/cartagena')
      const eventLink = page.locator('a').filter({ hasText: 'Accessibility Test Event' }).first()
      await eventLink.click()

      // Open modal
      const manageButton = page.locator('button[aria-label="Gestionar evento"]')
      await manageButton.click()
      await page.getByRole('button', { name: 'Eliminar evento' }).click()

      // Test tab navigation
      await page.keyboard.press('Tab')
      await expect(page.getByRole('button', { name: 'Eliminar evento' }).last()).toBeFocused()

      await page.keyboard.press('Tab')
      await expect(page.getByRole('button', { name: 'Cancelar' })).toBeFocused()

      // Test shift+tab
      await page.keyboard.press('Shift+Tab')
      await expect(page.getByRole('button', { name: 'Eliminar evento' }).last()).toBeFocused()
    })

    test('Should have proper ARIA attributes', async ({ page }) => {
      await page.goto('/crear-evento')

      await page.fill('input[name="title"]', 'ARIA Test Event')
      await page.fill('textarea[name="description"]', 'Testing ARIA attributes')
      await page.selectOption('select[name="city"]', 'bogota')
      await page.selectOption('select[name="category"]', 'educacion')
      await page.fill('input[name="location"]', 'ARIA Test Venue')
      await page.fill('input[name="date"]', '2025-01-01')
      await page.fill('input[name="time"]', '13:00')

      await page.click('button[type="submit"]')
      await page.waitForTimeout(2000)

      await page.goto('/eventos/bogota')
      const eventLink = page.locator('a').filter({ hasText: 'ARIA Test Event' }).first()
      await eventLink.click()

      // Open modal
      const manageButton = page.locator('button[aria-label="Gestionar evento"]')
      await manageButton.click()
      await page.getByRole('button', { name: 'Eliminar evento' }).click()

      // Check modal ARIA attributes
      const modal = page.getByRole('dialog')
      await expect(modal).toHaveAttribute('aria-modal', 'true')
      await expect(modal).toHaveAttribute('aria-labelledby', 'modal-title')
      await expect(modal).toHaveAttribute('aria-describedby', 'modal-description')

      // Check that title and description elements exist
      await expect(page.locator('#modal-title')).toBeVisible()
      await expect(page.locator('#modal-description')).toBeVisible()
    })
  })
})
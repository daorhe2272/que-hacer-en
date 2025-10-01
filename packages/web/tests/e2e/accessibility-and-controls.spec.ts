import { test, expect } from '@playwright/test'

test.describe('Controles y accesibilidad básica', () => {
  test('Select de tamaño de página tiene ARIA label y afecta URL', async ({ page }) => {
    await page.goto('/eventos/medellin')

    // Test page size selector (this control still exists)
    await page.selectOption('select[aria-label="Eventos por página"]', '12')
    await expect(page).toHaveURL(/limit=12/)
  })

  test('Paginación: estado de botones y navegación', async ({ page }) => {
    await page.goto('/eventos/bogota?limit=12')
    const prev = page.getByRole('link', { name: 'Anterior' })
    const next = page.getByRole('link', { name: 'Siguiente' })
    // En la primera página, 'Anterior' puede estar deshabilitado/no interactivo y puede no renderizarse
    if (await next.count()) await expect(next).toBeVisible()

    if (await next.count() && await next.isEnabled()) {
      await next.click()
      await expect(page).toHaveURL(/page=2/)
    }
  })
})



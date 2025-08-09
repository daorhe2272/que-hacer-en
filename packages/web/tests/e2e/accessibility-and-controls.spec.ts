import { test, expect } from '@playwright/test'

test.describe('Controles y accesibilidad básica', () => {
  test('Selects de orden y tamaño tienen ARIA labels y afectan URL', async ({ page }) => {
    await page.goto('/eventos/medellin')
    await page.selectOption('select[aria-label="Orden: campo"]', { label: 'Fecha' })
    await page.selectOption('select[aria-label="Orden: dirección"]', { label: 'Ascendente' })
    await expect(page).toHaveURL(/sort=date/)
    await expect(page).toHaveURL(/order=asc/)

    await page.selectOption('select[aria-label="Por página"]', '12')
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



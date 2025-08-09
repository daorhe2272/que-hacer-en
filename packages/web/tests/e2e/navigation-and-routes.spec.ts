import { test, expect } from '@playwright/test'

test.describe('Navegación y rutas', () => {
  test('Home: seleccionar ciudad redirige a /eventos/[city]', async ({ page }) => {
    await page.goto('/')
    await page.selectOption('select', { value: 'bogota' })
    await page.waitForURL(/\/eventos\/bogota$/)
    await expect(page.getByRole('heading', { name: 'Eventos populares cerca de ti' })).toBeVisible()
  })

  test('Ciudad inválida muestra 404/not-found', async ({ page }) => {
    await page.goto('/eventos/unknown-city')
    await expect(page.getByText('Página no encontrada')).toBeVisible()
  })
})



import { test, expect } from '@playwright/test'

test.describe('Eventos - paginación y orden', () => {
  test('lista por ciudad carga y navega paginación', async ({ page }) => {
    await page.goto('/eventos/bogota')
    await expect(page.getByRole('heading', { name: 'Eventos populares cerca de ti' })).toBeVisible()

    const cards = page.getByTestId('event-card')
    await expect(cards.first()).toBeVisible()

    // Cambiar tamaño de página
    await page.selectOption('select[aria-label="Por página"]', '12')
    await expect(page).toHaveURL(/limit=12/)
    const next = page.getByRole('link', { name: 'Siguiente' })
    // Puede no existir si totalPages === 1 en la ciudad/limit actual
    if (await next.count()) await expect(next).toBeVisible()

    // Ir a siguiente página si existe
    if (await next.count() && await next.isVisible() && await next.isEnabled()) {
      await next.click()
      await expect(page).toHaveURL(/page=2/)
    }
  })

  test('orden por precio descendente reordena', async ({ page }) => {
    await page.goto('/eventos/medellin')

    await page.selectOption('select[aria-label="Orden: campo"]', { label: 'Precio' })
    await page.selectOption('select[aria-label="Orden: dirección"]', { label: 'Descendente' })
    await expect(page).toHaveURL(/sort=price/) 
    await expect(page).toHaveURL(/order=desc/)

    const prices = await page.getByTestId('event-card').evaluateAll(nodes => nodes.map(n => Number(n.getAttribute('data-price'))))
    const sorted = [...prices].sort((a, b) => b - a)
    expect(prices).toEqual(sorted)
  })
})



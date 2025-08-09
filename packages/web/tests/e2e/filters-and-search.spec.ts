import { test, expect } from '@playwright/test'

test.describe('Búsqueda y filtros', () => {
  test('Buscar texto y filtrar por categoría resetea page y actualiza URL', async ({ page }) => {
    await page.goto('/eventos/bogota')
    await page.getByRole('textbox', { name: 'Buscar', exact: true }).click()
    await page.keyboard.type('tecnologia')
    await page.getByTestId('search-submit').click()
    await page.waitForFunction(() => window.location.search.includes('q=tecnologia'))
    await expect(page).toHaveURL(/q=tecnologia/)

    await page.selectOption('select[aria-label="Categoría"]', 'tecnologia')
    await page.getByRole('button', { name: /^Buscar$/ }).click()
    await expect(page).toHaveURL(/category=tecnologia/)
    await expect(page).not.toHaveURL(/page=/)
  })

  test('Filtro por categoría desde chips vacíos en NoResults', async ({ page }) => {
    await page.goto('/eventos/cali?q=zzzz&category=deportes')
    await expect(page.getByText('No encontramos resultados')).toBeVisible()
    // El texto 'Música' aparece en más de un botón; usar el último (chips de NoResults)
    await page.getByRole('button', { name: 'Música' }).last().click()
    await expect(page).toHaveURL(/category=musica/)
  })
})



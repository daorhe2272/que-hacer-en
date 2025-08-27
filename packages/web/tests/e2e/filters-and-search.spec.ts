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

  test('búsqueda por texto funciona correctamente', async ({ page }) => {
    await page.goto('/eventos/bogota')
    
    // Buscar usando "Rock" que existe en los datos de prueba
    const searchInput = page.locator('[data-testid="search"] input[aria-label="Buscar"]')
    await searchInput.click()
    await searchInput.fill('Rock')
    await page.getByTestId('search-submit').click()
    await expect(page).toHaveURL(/q=Rock/)
    
    const resultsWithRock = await page.getByTestId('event-card').count()
    expect(resultsWithRock).toBeGreaterThan(0)
    
    // Verificar que el contenido correcto aparece
    await expect(page.getByText('Festival Rock al Parque')).toBeVisible()
    
    // Limpiar y buscar "Festival" que también debería existir
    await page.goto('/eventos/bogota')
    await searchInput.click()
    await searchInput.fill('Festival')
    await page.getByTestId('search-submit').click()
    await expect(page).toHaveURL(/q=Festival/)
    
    const resultsWithFestival = await page.getByTestId('event-card').count()
    expect(resultsWithFestival).toBeGreaterThan(0)
    
    // Verificar que encuentra múltiples resultados con "Festival"
    await expect(page.getByText('Festival Rock al Parque')).toBeVisible()
    await expect(page.getByText('Festival Gastronómico Zona Rosa')).toBeVisible()
  })

  test('filtro por categoría resetea page y preserva otros parámetros', async ({ page }) => {
    // Comenzar con búsqueda y navegación a página 2
    await page.goto('/eventos/bogota?q=evento&page=2&limit=8')
    
    // Cambiar categoría
    await page.selectOption('select[aria-label="Categoría"]', 'musica')
    await page.getByRole('button', { name: /^Buscar$/ }).click()
    
    // Debe resetear page pero preservar otros parámetros
    await expect(page).toHaveURL(/category=musica/)
    await expect(page).toHaveURL(/q=evento/)
    await expect(page).toHaveURL(/limit=8/)
    await expect(page).not.toHaveURL(/page=2/) // page debe resetearse
  })

  test('combinación de q + categoría con paginación y orden aplicado', async ({ page }) => {
    await page.goto('/eventos/medellin')
    
    // Configurar búsqueda, categoría y orden
    await page.getByRole('textbox', { name: 'Buscar', exact: true }).click()
    await page.keyboard.type('festival')
    await page.selectOption('select[aria-label="Categoría"]', 'musica')
    await page.selectOption('select[aria-label="Orden: campo"]', { label: 'Precio' })
    await page.selectOption('select[aria-label="Orden: dirección"]', { label: 'Ascendente' })
    await page.getByRole('button', { name: /^Buscar$/ }).click()
    
    // Verificar que todos los parámetros están en la URL
    await expect(page).toHaveURL(/q=festival/)
    await expect(page).toHaveURL(/category=musica/)
    await expect(page).toHaveURL(/sort=price/)
    await expect(page).toHaveURL(/order=asc/)
    
    // Si hay resultados, verificar que están ordenados por precio
    const cards = page.getByTestId('event-card')
    if (await cards.count() > 1) {
      const prices = await cards.evaluateAll(nodes => nodes.map(n => Number(n.getAttribute('data-price'))))
      const sorted = [...prices].sort((a, b) => a - b)
      expect(prices).toEqual(sorted)
    }
    
    // Cambiar de página si es posible y verificar persistencia
    const next = page.getByRole('link', { name: 'Siguiente' })
    if (await next.count() && await next.isVisible() && await next.isEnabled()) {
      await next.click()
      await expect(page).toHaveURL(/q=festival/)
      await expect(page).toHaveURL(/category=musica/)
      await expect(page).toHaveURL(/sort=price/)
      await expect(page).toHaveURL(/order=asc/)
      await expect(page).toHaveURL(/page=2/)
    }
  })
})



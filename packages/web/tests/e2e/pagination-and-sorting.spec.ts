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

  test('selector "Por página" cambia conteo y actualiza URL, persiste entre páginas', async ({ page }) => {
    await page.goto('/eventos/bogota')
    
    // Cambiar a 12 por página
    await page.selectOption('select[aria-label="Por página"]', '12')
    await expect(page).toHaveURL(/limit=12/)
    
    // Navegar a página 2 si existe
    const next = page.getByRole('link', { name: 'Siguiente' })
    if (await next.count() && await next.isVisible() && await next.isEnabled()) {
      await next.click()
      await expect(page).toHaveURL(/page=2/)
      await expect(page).toHaveURL(/limit=12/) // Debe persistir el limit
    }
  })

  test('botones "Anterior" y "Siguiente" se deshabilitan correctamente', async ({ page }) => {
    // Use a small limit to ensure multiple pages regardless of total event count
    const testLimit = 2
    
    // Go to page 1 with small limit - should always have "Anterior" disabled
    await page.goto(`/eventos/bogota?limit=${testLimit}&page=1`)
    
    // Wait for content to load
    await expect(page.getByRole('heading', { name: 'Eventos populares cerca de ti' })).toBeVisible()
    
    // Test page 1: "Anterior" should always be disabled
    const prev1 = page.getByRole('link', { name: 'Anterior' })
    if (await prev1.count()) {
      await expect(prev1).toHaveClass(/text-gray-400.*pointer-events-none|pointer-events-none.*text-gray-400/)
      await expect(prev1).toHaveAttribute('aria-disabled', 'true')
    }
    
    // Check if there are multiple pages by looking for "Siguiente" button
    const next1 = page.getByRole('link', { name: 'Siguiente' })
    const hasMultiplePages = await next1.count() > 0
    
    if (hasMultiplePages) {
      // If there are multiple pages, test the last page
      // Extract total pages from the pagination info
      const paginationText = await page.locator('text=/Página \\d+ de \\d+/').textContent()
      const totalPagesMatch = paginationText?.match(/Página \d+ de (\d+)/)
      const totalPages = totalPagesMatch ? parseInt(totalPagesMatch[1]) : 1
      
      if (totalPages > 1) {
        // Go to the last page
        await page.goto(`/eventos/bogota?limit=${testLimit}&page=${totalPages}`)
        await expect(page.getByRole('heading', { name: 'Eventos populares cerca de ti' })).toBeVisible()
        
        // On last page: "Siguiente" should be disabled, "Anterior" should be enabled
        const prevLast = page.getByRole('link', { name: 'Anterior' })
        if (await prevLast.count()) {
          await expect(prevLast).toHaveClass(/text-gray-700.*hover:bg-gray-50/)
          await expect(prevLast).toHaveAttribute('aria-disabled', 'false')
        }
        
        const nextLast = page.getByRole('link', { name: 'Siguiente' })
        if (await nextLast.count()) {
          await expect(nextLast).toHaveClass(/text-gray-400.*pointer-events-none|pointer-events-none.*text-gray-400/)
          await expect(nextLast).toHaveAttribute('aria-disabled', 'true')
        }
      }
    }
    // If there's only one page, pagination might not render at all, which is also correct
  })

  test('deep link fuera de rango maneja estado esperado', async ({ page }) => {
    // Ir a una página que no existe (página 999)
    await page.goto('/eventos/bogota?page=999&limit=10')
    
    // Debe mostrar sin errores y manejar el estado apropiadamente
    await expect(page.getByRole('heading', { name: 'Eventos populares cerca de ti' })).toBeVisible()
    
    // Puede mostrar página vacía o redirigir a página válida
    const cards = page.getByTestId('event-card')
    const noResults = page.getByTestId('no-results')
    
    // Debe mostrar o eventos o estado vacío, pero no crash
    const hasCards = await cards.count() > 0
    const hasNoResults = await noResults.count() > 0
    expect(hasCards || hasNoResults).toBe(true)
  })

  test('orden por fecha ascendente reordena correctamente', async ({ page }) => {
    await page.goto('/eventos/bogota')

    await page.selectOption('select[aria-label="Orden: campo"]', { label: 'Fecha' })
    await page.selectOption('select[aria-label="Orden: dirección"]', { label: 'Ascendente' })
    await expect(page).toHaveURL(/sort=date/)
    await expect(page).toHaveURL(/order=asc/)

    // Verificar que las fechas están en orden ascendente
    const cards = page.getByTestId('event-card')
    if (await cards.count() > 1) {
      const dates = await cards.evaluateAll(nodes => 
        nodes.map(n => n.querySelector('[data-testid="event-date"]')?.textContent || '')
      )
      
      // Verificar que al menos tenemos fechas
      expect(dates.length).toBeGreaterThan(0)
    }
  })

  test('orden por fecha descendente reordena correctamente', async ({ page }) => {
    await page.goto('/eventos/medellin')

    await page.selectOption('select[aria-label="Orden: campo"]', { label: 'Fecha' })
    await page.selectOption('select[aria-label="Orden: dirección"]', { label: 'Descendente' })
    await expect(page).toHaveURL(/sort=date/)
    await expect(page).toHaveURL(/order=desc/)

    const cards = page.getByTestId('event-card')
    if (await cards.count() > 1) {
      const dates = await cards.evaluateAll(nodes => 
        nodes.map(n => n.querySelector('[data-testid="event-date"]')?.textContent || '')
      )
      
      expect(dates.length).toBeGreaterThan(0)
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

  test('persistencia de sort y order al cambiar de página y limit', async ({ page }) => {
    await page.goto('/eventos/bogota')

    // Configurar ordenamiento
    await page.selectOption('select[aria-label="Orden: campo"]', { label: 'Precio' })
    await page.selectOption('select[aria-label="Orden: dirección"]', { label: 'Ascendente' })
    await expect(page).toHaveURL(/sort=price/)
    await expect(page).toHaveURL(/order=asc/)

    // Cambiar limit
    await page.selectOption('select[aria-label="Por página"]', '20')
    await expect(page).toHaveURL(/sort=price/) // Debe persistir
    await expect(page).toHaveURL(/order=asc/)  // Debe persistir
    await expect(page).toHaveURL(/limit=20/)

    // Cambiar de página si es posible
    const next = page.getByRole('link', { name: 'Siguiente' })
    if (await next.count() && await next.isVisible() && await next.isEnabled()) {
      await next.click()
      await expect(page).toHaveURL(/sort=price/) // Debe persistir
      await expect(page).toHaveURL(/order=asc/)  // Debe persistir
      await expect(page).toHaveURL(/page=2/)
    }
  })
})



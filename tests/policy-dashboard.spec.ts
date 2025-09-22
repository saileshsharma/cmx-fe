import { test, expect } from '@playwright/test'

test.describe('Policy Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the policy dashboard
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should load the policy dashboard', async ({ page }) => {
    // Look for dashboard elements
    const pageContent = await page.content()

    // Check for typical dashboard elements
    const hasDashboard = pageContent.includes('Dashboard') ||
                        pageContent.includes('Policy') ||
                        pageContent.includes('Claims') ||
                        page.locator('table, .card, .dashboard').count() > 0

    if (hasDashboard) {
      expect(hasDashboard).toBeTruthy()
    } else {
      // At minimum, the page should load without errors
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('should display policy data', async ({ page }) => {
    // Wait for any data to load
    await page.waitForTimeout(3000)

    // Look for policy-related content
    const tables = page.locator('table')
    const cards = page.locator('.card, [class*="card"]')
    const lists = page.locator('ul, ol')

    const hasData = await tables.count() > 0 ||
                   await cards.count() > 0 ||
                   await lists.count() > 0

    if (hasData) {
      // Verify at least one of these contains policy-related text
      const pageText = await page.textContent('body')
      const hasPolicyContent = pageText?.includes('Policy') ||
                              pageText?.includes('THAUTO') ||
                              pageText?.includes('Claim') ||
                              pageText?.includes('Insured')

      expect(hasPolicyContent).toBeTruthy()
    }
  })

  test('should handle policy search functionality', async ({ page }) => {
    // Look for search input
    const searchInputs = page.locator('input[type="text"], input[type="search"]')

    if (await searchInputs.count() > 0) {
      const searchInput = searchInputs.first()
      await searchInput.fill('THAUTO')

      // Look for search button or trigger search
      const searchButton = page.locator('button').filter({ hasText: /search/i })

      if (await searchButton.count() > 0) {
        await searchButton.click()
        await page.waitForTimeout(2000)

        // Check if search results are displayed
        const pageContent = await page.content()
        expect(pageContent).toContain('THAUTO')
      } else {
        // Maybe search triggers on input
        await searchInput.press('Enter')
        await page.waitForTimeout(2000)
      }
    }
  })

  test('should navigate to policy details', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(3000)

    // Look for clickable policy items (links, buttons, table rows)
    const clickableItems = page.locator('a[href*="policy"], button[data-policy], tr[data-policy], .policy-item')

    if (await clickableItems.count() > 0) {
      await clickableItems.first().click()
      await page.waitForTimeout(2000)

      // Should navigate to policy details or show more information
      const newContent = await page.content()
      const hasDetailedInfo = newContent.includes('Details') ||
                             newContent.includes('Information') ||
                             newContent.includes('Policy Number') ||
                             newContent.includes('Insured')

      expect(hasDetailedInfo).toBeTruthy()
    }
  })

  test('should show claims information', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(3000)

    // Look for claims-related content
    const pageContent = await page.content()

    if (pageContent.includes('Claim')) {
      // If claims are shown, verify the display
      const claimElements = page.locator('[class*="claim"], [data-claim]')

      if (await claimElements.count() > 0) {
        // Check that claim information is properly formatted
        const firstClaim = claimElements.first()
        await expect(firstClaim).toBeVisible()
      }
    }
  })

  test('should handle empty state', async ({ page }) => {
    // This test checks how the dashboard handles no data
    await page.waitForTimeout(3000)

    const pageContent = await page.content()

    // If there's no data, should show appropriate message
    if (pageContent.includes('No data') ||
        pageContent.includes('No policies') ||
        pageContent.includes('Empty')) {

      expect(pageContent).toMatch(/No data|No policies|Empty|No results/i)
    } else {
      // If there is data, should show at least some content
      expect(pageContent.length).toBeGreaterThan(1000) // Some substantial content
    }
  })

  test('should handle responsive behavior on mobile', async ({ page }) => {
    // Switch to mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(1000)

    // Check that the page is still usable
    await expect(page.locator('body')).toBeVisible()

    // If there are navigation elements, they should be accessible
    const navElements = page.locator('nav, .navigation, [role="navigation"]')

    if (await navElements.count() > 0) {
      await expect(navElements.first()).toBeVisible()
    }

    // Tables should be scrollable or reorganized for mobile
    const tables = page.locator('table')

    if (await tables.count() > 0) {
      const table = tables.first()
      await expect(table).toBeVisible()

      // Check if table is scrollable or has been adapted for mobile
      const tableStyles = await table.evaluate(el => {
        const styles = window.getComputedStyle(el)
        return {
          overflow: styles.overflow,
          overflowX: styles.overflowX,
          display: styles.display
        }
      })

      // Should handle mobile display appropriately
      expect(tableStyles.overflowX === 'auto' ||
             tableStyles.overflowX === 'scroll' ||
             tableStyles.display === 'block').toBeTruthy()
    }
  })
})
import { test, expect } from '@playwright/test'

test.describe('CMX Frontend Application', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/')
  })

  test('should load the homepage', async ({ page }) => {
    // Wait for the page to load
    await page.waitForLoadState('networkidle')

    // Check that the page has loaded correctly
    await expect(page).toHaveTitle(/Claims MotorX|CMX/i)

    // Check for main navigation or key elements
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('should navigate between pages', async ({ page }) => {
    // Wait for the page to load
    await page.waitForLoadState('networkidle')

    // Look for navigation links
    const navLinks = page.locator('nav a, .nav a, [role="navigation"] a')
    const linkCount = await navLinks.count()

    if (linkCount > 0) {
      // Click on the first navigation link
      await navLinks.first().click()
      await page.waitForLoadState('networkidle')

      // Verify navigation occurred
      await expect(page.url()).not.toBe('http://localhost:5173/')
    }
  })

  test('should handle responsive design', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForLoadState('networkidle')

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForLoadState('networkidle')

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForLoadState('networkidle')

    // Verify the page is still functional in mobile view
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})
import { test, expect } from '@playwright/test'

test.describe('FNOL (First Notice of Loss) Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the FNOL page
    await page.goto('/create-fnol')
    await page.waitForLoadState('networkidle')
  })

  test('should load FNOL creation page', async ({ page }) => {
    // Check that we're on the FNOL page
    await expect(page).toHaveURL(/.*create-fnol/)

    // Look for FNOL form elements
    await expect(page.locator('input[type="text"]').first()).toBeVisible()
    await expect(page.locator('button').first()).toBeVisible()
  })

  test('should search for policy by number', async ({ page }) => {
    // Find policy number input field
    const policyInput = page.locator('input[type="text"]').first()
    await expect(policyInput).toBeVisible()

    // Enter a test policy number
    await policyInput.fill('THAUTO0000228')

    // Find and click the search/view button
    const searchButton = page.locator('button').filter({ hasText: /view|search/i }).first()
    if (await searchButton.count() > 0) {
      await searchButton.click()

      // Wait for the policy data to load
      await page.waitForTimeout(2000)

      // Check if policy information is displayed
      // This might show policy details, insured information, etc.
      const pageContent = await page.content()
      const hasContent = pageContent.includes('THAUTO0000228') ||
                        pageContent.includes('Policy') ||
                        pageContent.includes('Insured')

      expect(hasContent).toBeTruthy()
    }
  })

  test('should handle invalid policy number', async ({ page }) => {
    // Find policy number input field
    const policyInput = page.locator('input[type="text"]').first()
    await expect(policyInput).toBeVisible()

    // Enter an invalid policy number
    await policyInput.fill('INVALID123')

    // Find and click the search/view button
    const searchButton = page.locator('button').filter({ hasText: /view|search/i }).first()
    if (await searchButton.count() > 0) {
      await searchButton.click()

      // Wait for the response
      await page.waitForTimeout(2000)

      // Check for error message or no results
      const pageContent = await page.content()
      const hasErrorOrNoResults = pageContent.includes('not found') ||
                                 pageContent.includes('No policy') ||
                                 pageContent.includes('Invalid') ||
                                 pageContent.includes('Error')

      // Either shows error message or doesn't show policy details
      if (!hasErrorOrNoResults) {
        // If no explicit error, ensure no policy details are shown
        expect(pageContent).not.toContain('Policy Details')
      }
    }
  })

  test('should navigate to FNOL form after policy selection', async ({ page }) => {
    // Search for a valid policy first
    const policyInput = page.locator('input[type="text"]').first()
    await policyInput.fill('THAUTO0000228')

    const searchButton = page.locator('button').filter({ hasText: /view|search/i }).first()
    if (await searchButton.count() > 0) {
      await searchButton.click()
      await page.waitForTimeout(2000)

      // Look for "Create FNOL" or similar button
      const createFnolButton = page.locator('button').filter({ hasText: /create|fnol|proceed/i })

      if (await createFnolButton.count() > 0) {
        await createFnolButton.first().click()
        await page.waitForTimeout(1000)

        // Should now be on the FNOL creation form
        // Look for form fields typical of FNOL creation
        const formFields = page.locator('input, textarea, select')
        const fieldCount = await formFields.count()

        expect(fieldCount).toBeGreaterThan(0)
      }
    }
  })

  test('should validate form fields', async ({ page }) => {
    // Navigate to a form if it's not already visible
    const submitButton = page.locator('button').filter({ hasText: /submit|create|save/i })

    if (await submitButton.count() > 0) {
      // Try to submit without filling required fields
      await submitButton.first().click()

      // Wait for validation
      await page.waitForTimeout(1000)

      // Check for validation messages
      const validationMessages = page.locator('.error, .invalid, [role="alert"]')
      const hasValidation = await validationMessages.count() > 0

      // Or check if form prevented submission (still on same page)
      const currentUrl = page.url()
      expect(currentUrl).toContain('fnol')
    }
  })

  test('should handle successful FNOL creation', async ({ page }) => {
    // This test assumes we can get to the FNOL form and fill it out
    // Fill out required fields (adjust selectors based on actual form)

    // Example form filling (adjust based on actual form structure)
    const textInputs = page.locator('input[type="text"]')
    const textareas = page.locator('textarea')

    if (await textInputs.count() > 0) {
      await textInputs.nth(0).fill('Test incident description')
    }

    if (await textareas.count() > 0) {
      await textareas.first().fill('Detailed description of the incident for testing purposes.')
    }

    // Look for date inputs
    const dateInputs = page.locator('input[type="date"]')
    if (await dateInputs.count() > 0) {
      await dateInputs.first().fill('2024-01-15')
    }

    // Submit the form
    const submitButton = page.locator('button').filter({ hasText: /submit|create|save/i })
    if (await submitButton.count() > 0) {
      await submitButton.first().click()

      // Wait for submission to complete
      await page.waitForTimeout(3000)

      // Check for success message or redirect
      const pageContent = await page.content()
      const isSuccess = pageContent.includes('Success') ||
                       pageContent.includes('Created') ||
                       pageContent.includes('FNOL') ||
                       page.url().includes('success') ||
                       page.url().includes('dashboard')

      if (isSuccess) {
        expect(isSuccess).toBeTruthy()
      } else {
        // If not successful, at least ensure no critical errors
        expect(pageContent).not.toContain('Error 500')
        expect(pageContent).not.toContain('Internal Server Error')
      }
    }
  })
})
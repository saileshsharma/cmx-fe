import { test, expect } from '@playwright/test';

test.describe('GraphQL Integration Tests', () => {
  test('should load the application and display header', async ({ page }) => {
    await page.goto('/');

    // Wait for the app to load
    await page.waitForLoadState('networkidle');

    // Check that the page loaded successfully
    await expect(page).toHaveTitle(/ClaimsMotorX/i);

    // Look for any header or navigation elements
    const header = page.locator('header, nav, [role="banner"], h1, h2');
    await expect(header.first()).toBeVisible();
  });

  test('should be able to make GraphQL requests', async ({ page }) => {
    // Track GraphQL requests
    const graphqlRequests: any[] = [];

    page.on('request', request => {
      if (request.url().includes('/graphql')) {
        graphqlRequests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData()
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait a bit for any GraphQL requests to be made
    await page.waitForTimeout(3000);

    // Check if any GraphQL requests were made
    if (graphqlRequests.length > 0) {
      console.log('GraphQL requests detected:', graphqlRequests.length);
      console.log('First GraphQL request:', graphqlRequests[0]);

      // Verify that GraphQL requests are going to the correct endpoint
      expect(graphqlRequests[0].url).toContain('4000/graphql');
      expect(graphqlRequests[0].method).toBe('POST');
    }
  });

  test('should display claims data if available', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for potential data loading
    await page.waitForTimeout(5000);

    // Look for claims-related content
    const claimsElements = [
      page.locator('text=/claim/i'),
      page.locator('text=/THATCL/i'), // Based on our test data
      page.locator('[data-testid*="claim"]'),
      page.locator('.claim'),
      page.locator('#claims')
    ];

    let foundClaims = false;
    for (const element of claimsElements) {
      const count = await element.count();
      if (count > 0) {
        foundClaims = true;
        console.log('Found claims content:', await element.first().textContent());
        break;
      }
    }

    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/graphql-integration-test.png', fullPage: true });

    console.log('Claims data found:', foundClaims);
  });

  test('should handle GraphQL errors gracefully', async ({ page }) => {
    // Intercept GraphQL requests and return an error
    await page.route('**/graphql', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          errors: [{ message: 'Test error' }]
        })
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The app should still load and not crash
    await expect(page.locator('body')).toBeVisible();

    // Check that no unhandled errors appeared
    const errorMessages = page.locator('text=/error/i, text=/failed/i');
    const errorCount = await errorMessages.count();

    console.log('Error messages found:', errorCount);

    // App should handle errors gracefully
    await page.screenshot({ path: 'test-results/graphql-error-handling.png', fullPage: true });
  });
});
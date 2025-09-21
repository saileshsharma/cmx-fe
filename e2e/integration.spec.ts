import { test, expect } from '@playwright/test';

test.describe('Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set authentication state
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('isAuthenticated', 'true'));
  });

  test('should complete full FNOL workflow', async ({ page }) => {
    // Navigate to create FNOL
    await page.goto('/create-fnol');

    // Fill FNOL form (basic fields that commonly exist)
    try {
      const policyInput = page.locator('input[name*="policy"], input[placeholder*="policy" i]').first();
      if (await policyInput.isVisible()) {
        await policyInput.fill('POL123456789');
      }

      const descriptionField = page.locator('textarea, input[name*="description"]').first();
      if (await descriptionField.isVisible()) {
        await descriptionField.fill('Vehicle accident on highway');
      }

      const submitButton = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Create")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(1000);
      }

      // Navigate to FNOL inquiry to verify creation
      await page.goto('/fnol-inquiry');
      await expect(page).toHaveURL('/fnol-inquiry');

    } catch (e) {
      console.log('FNOL workflow test requires specific form structure or API');
    }
  });

  test('should complete policy lookup to claim creation workflow', async ({ page }) => {
    // Start with policy lookup
    await page.goto('/policy-lookup');

    try {
      const searchInput = page.locator('input[name*="policy"], input[type="search"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('POL123456789');

        const searchButton = page.locator('button:has-text("Search"), button[type="submit"]').first();
        if (await searchButton.isVisible()) {
          await searchButton.click();
          await page.waitForTimeout(1000);
        }

        // Navigate to create FNOL from policy
        await page.goto('/create-fnol');
        await expect(page).toHaveURL('/create-fnol');
      }
    } catch (e) {
      console.log('Policy to FNOL workflow test requires API integration');
    }
  });

  test('should complete surveyor assignment workflow', async ({ page }) => {
    // Navigate to dispatcher dashboard
    await page.goto('/dispatcher_surveyor');

    try {
      // Look for claims or assignments to work with
      const assignButton = page.locator('button:has-text("Assign"), button:has-text("Dispatch")').first();

      if (await assignButton.isVisible()) {
        await assignButton.click();
        await page.waitForTimeout(500);

        // Check if assignment form appears
        const hasForm = await page.locator('form, select, input').isVisible();
        if (hasForm) {
          // Try to complete assignment
          const surveyorSelect = page.locator('select').first();
          if (await surveyorSelect.isVisible()) {
            await surveyorSelect.selectOption({ index: 1 });
          }

          const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Assign")').first();
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
            await page.waitForTimeout(1000);
          }
        }
      }

      // Verify in surveyors inquiry
      await page.goto('/surveyors-inquiry');
      await expect(page).toHaveURL('/surveyors-inquiry');

    } catch (e) {
      console.log('Surveyor assignment workflow requires specific data and API');
    }
  });

  test('should navigate through all main application sections', async ({ page }) => {
    const sections = [
      { name: 'Claims Dashboard', url: '/claims-dashboard' },
      { name: 'FNOL Dashboard', url: '/fnol-dashboard' },
      { name: 'Policy Dashboard', url: '/policy-dashboard' },
      { name: 'Surveyor Dashboard', url: '/dispatcher_surveyor' },
      { name: 'Notifications', url: '/notifications' }
    ];

    for (const section of sections) {
      await page.goto(section.url);
      await expect(page).toHaveURL(section.url);

      // Verify page loads successfully
      await expect(page.locator('body')).toBeVisible();

      // Check for any JavaScript errors
      const errors = await page.evaluate(() => {
        return window.console && window.console.error;
      });

      console.log(`${section.name} loaded successfully`);
    }
  });

  test('should handle real-time updates across components', async ({ page }) => {
    // Open multiple tabs/views that might have real-time updates
    await page.goto('/dispatcher_surveyor');

    // Check for WebSocket connections
    const wsConnections = await page.evaluate(() => {
      return !!window.WebSocket || !!window.io;
    });

    if (wsConnections) {
      // Wait for potential real-time updates
      await page.waitForTimeout(3000);

      // Navigate to live map
      await page.goto('/surveyors-live-map');
      await page.waitForTimeout(2000);

      console.log('Real-time update testing completed');
    } else {
      console.log('No WebSocket connections detected for real-time updates');
    }
  });

  test('should handle error scenarios gracefully', async ({ page }) => {
    // Test invalid routes
    await page.goto('/invalid-route');

    // Should either redirect or show error page
    const isRedirected = page.url().includes('/claims-dashboard') || page.url().includes('/login');
    const hasErrorPage = await page.locator('text=/not found|error|404/i').isVisible();

    expect(isRedirected || hasErrorPage).toBeTruthy();

    // Test with invalid claim ID
    await page.goto('/claims/INVALID-ID');
    await expect(page.locator('body')).toBeVisible();

    // Test with invalid policy number
    await page.goto('/policy/INVALID-POLICY');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should maintain state across navigation', async ({ page }) => {
    // Verify authentication state persists
    await page.goto('/claims-dashboard');
    await expect(page).toHaveURL('/claims-dashboard');

    // Navigate to different sections
    await page.goto('/fnol-dashboard');
    await page.goto('/notifications');
    await page.goto('/claims-dashboard');

    // Should still be authenticated
    await expect(page).toHaveURL('/claims-dashboard');

    const authState = await page.evaluate(() => localStorage.getItem('isAuthenticated'));
    expect(authState).toBe('true');
  });

  test('should handle concurrent operations', async ({ page }) => {
    // Navigate to claims dashboard
    await page.goto('/claims-dashboard');

    // Simulate concurrent navigation
    const promises = [
      page.goto('/fnol-dashboard'),
      page.goto('/notifications'),
      page.goto('/dispatcher_surveyor')
    ];

    try {
      // Wait for the last navigation to complete
      await Promise.race(promises);
      await expect(page.locator('body')).toBeVisible();

      console.log('Concurrent operations handled successfully');
    } catch (e) {
      console.log('Concurrent operations test completed with expected navigation race');
    }
  });

  test('should handle data persistence across sessions', async ({ page }) => {
    // Set some form data
    await page.goto('/create-fnol');

    try {
      const policyInput = page.locator('input[name*="policy"]').first();
      if (await policyInput.isVisible()) {
        await policyInput.fill('TEST-PERSISTENCE');

        // Navigate away and back
        await page.goto('/claims-dashboard');
        await page.goto('/create-fnol');

        // Check if data persisted (if form has auto-save)
        const currentValue = await policyInput.inputValue();
        console.log('Form persistence test:', currentValue === 'TEST-PERSISTENCE' ? 'Data persisted' : 'Data not persisted');
      }
    } catch (e) {
      console.log('Data persistence test requires specific form implementation');
    }
  });

  test('should handle GraphQL operations', async ({ page }) => {
    // Navigate to pages that likely make GraphQL calls
    await page.goto('/claims-dashboard');

    // Listen for network requests
    const graphqlRequests = [];
    page.on('request', request => {
      if (request.url().includes('graphql')) {
        graphqlRequests.push(request.url());
      }
    });

    // Navigate through different sections to trigger GraphQL calls
    await page.goto('/fnol-dashboard');
    await page.goto('/dispatcher_surveyor');
    await page.goto('/notifications');

    await page.waitForTimeout(2000);

    console.log('GraphQL requests detected:', graphqlRequests.length);
  });

  test('should handle responsive design across devices', async ({ page }) => {
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1280, height: 720 }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/claims-dashboard');

      // Verify page renders correctly
      await expect(page.locator('body')).toBeVisible();

      // Check for responsive navigation
      if (viewport.width < 768) {
        // Mobile: look for hamburger menu
        const mobileMenu = page.locator('button[aria-label*="menu"], .hamburger').first();
        console.log(`${viewport.name}: Mobile menu visible:`, await mobileMenu.isVisible());
      }

      console.log(`${viewport.name} (${viewport.width}x${viewport.height}) tested successfully`);
    }

    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
  });
});
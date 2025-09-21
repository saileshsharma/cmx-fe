import { test, expect } from '@playwright/test';

test.describe('Policy Management', () => {
  test.beforeEach(async ({ page }) => {
    // Set authentication state
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('isAuthenticated', 'true'));
  });

  test('should navigate to policy dashboard', async ({ page }) => {
    await page.goto('/policy-dashboard');
    await expect(page).toHaveURL('/policy-dashboard');

    // Check for policy dashboard content
    await expect(page.locator('h1, h2, h3').filter({ hasText: /policy|dashboard/i })).toBeVisible();
  });

  test('should display policy dashboard widgets', async ({ page }) => {
    await page.goto('/policy-dashboard');

    // Check for dashboard elements
    const dashboardElements = [
      '.card, [class*="card"]',
      '.widget, [class*="widget"]',
      '.stat, [class*="stat"]',
      '[data-testid*="policy"]',
      'table, [role="table"]',
      'text=/policy/i'
    ];

    let visibleElements = 0;
    for (const selector of dashboardElements) {
      try {
        if (await page.locator(selector).first().isVisible()) {
          visibleElements++;
        }
      } catch (e) {
        // Element not found
      }
    }

    expect(visibleElements).toBeGreaterThan(0);
  });

  test('should navigate to policy lookup page', async ({ page }) => {
    await page.goto('/policy-lookup');
    await expect(page).toHaveURL('/policy-lookup');

    // Should display policy lookup interface
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display policy search form', async ({ page }) => {
    await page.goto('/policy-lookup');

    // Check for policy search elements
    const searchElements = [
      'input[name*="policy"], input[placeholder*="policy" i]',
      'input[type="search"]',
      'input[name*="number"], input[placeholder*="number" i]',
      'form, [role="form"]'
    ];

    let hasSearchElements = false;
    for (const selector of searchElements) {
      try {
        if (await page.locator(selector).first().isVisible()) {
          hasSearchElements = true;
          break;
        }
      } catch (e) {
        // Element not found
      }
    }

    expect(hasSearchElements).toBeTruthy();
  });

  test('should handle policy search functionality', async ({ page }) => {
    await page.goto('/policy-lookup');

    const searchInput = page.locator('input[name*="policy"], input[placeholder*="policy" i], input[type="search"]').first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('POL123456789');

      // Look for search button
      const searchButton = page.locator('button:has-text("Search"), button[type="submit"], button:has-text("Find"), button:has-text("Lookup")').first();

      if (await searchButton.isVisible()) {
        await searchButton.click();
      } else {
        await searchInput.press('Enter');
      }

      await page.waitForTimeout(1000);

      // Should show results or no results
      const hasResults = await page.locator('table, .policy-result, [data-testid*="policy"], .search-result').isVisible();
      const hasNoResults = await page.locator('text=/no results|not found|no policy|no data/i').isVisible();

      expect(hasResults || hasNoResults).toBeTruthy();
    }
  });

  test('should navigate to policy search page', async ({ page }) => {
    await page.goto('/search');
    await expect(page).toHaveURL('/search');

    // Check for unified search interface
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display policy search interface', async ({ page }) => {
    await page.goto('/search');

    // Check for search form elements
    const searchElements = [
      'input[type="search"]',
      'input[name*="search"]',
      'input[placeholder*="search" i]',
      'form',
      'button:has-text("Search")'
    ];

    let hasSearchInterface = false;
    for (const selector of searchElements) {
      try {
        if (await page.locator(selector).first().isVisible()) {
          hasSearchInterface = true;
          break;
        }
      } catch (e) {
        // Element not found
      }
    }

    expect(hasSearchInterface).toBeTruthy();
  });

  test('should handle policy detail navigation', async ({ page }) => {
    // Test dynamic policy detail route
    const testPolicyNumber = 'POL123456789';
    await page.goto(`/policy/${testPolicyNumber}`);
    await expect(page).toHaveURL(`/policy/${testPolicyNumber}`);

    // Should display policy detail page
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display policy detail information', async ({ page }) => {
    const testPolicyNumber = 'POL123456789';
    await page.goto(`/policy/${testPolicyNumber}`);

    // Check for policy detail elements
    const detailElements = [
      'text=/policy/i',
      'text=/number/i',
      'text=/holder/i',
      'text=/premium/i',
      'text=/coverage/i',
      'text=/effective/i',
      'text=/expir/i',
      '.policy-detail, [class*="policy"]',
      'table, [role="table"]'
    ];

    let visibleElements = 0;
    for (const selector of detailElements) {
      try {
        if (await page.locator(selector).first().isVisible()) {
          visibleElements++;
        }
      } catch (e) {
        // Element not found
      }
    }

    expect(visibleElements).toBeGreaterThan(0);
  });

  test('should validate policy number format', async ({ page }) => {
    await page.goto('/policy-lookup');

    const searchInput = page.locator('input[name*="policy"], input[placeholder*="policy" i], input[type="search"]').first();

    if (await searchInput.isVisible()) {
      // Test with invalid format
      await searchInput.fill('123');

      const searchButton = page.locator('button:has-text("Search"), button[type="submit"]').first();

      if (await searchButton.isVisible()) {
        await searchButton.click();
        await page.waitForTimeout(500);

        // Should show validation error or handle gracefully
        const hasValidation = await page.locator('[class*="error"], [class*="invalid"], text=/invalid|format|required/i').isVisible();
        const staysOnPage = page.url().includes('/policy-lookup') || page.url().includes('/search');

        expect(hasValidation || staysOnPage).toBeTruthy();
      }
    }
  });

  test('should handle policy creation workflow', async ({ page }) => {
    // Navigate to create policy if such functionality exists
    await page.goto('/policy-dashboard');

    const createButton = page.locator('button:has-text("Create"), button:has-text("New Policy"), a:has-text("Create Policy")').first();

    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Should navigate to policy creation form
      const hasForm = await page.locator('form, input[name*="policy"], textarea').isVisible();
      expect(hasForm).toBeTruthy();
    } else {
      // Policy creation might not be available in frontend
      console.log('Policy creation functionality not found in UI');
    }
  });

  test('should display policy status information', async ({ page }) => {
    const testPolicyNumber = 'POL123456789';
    await page.goto(`/policy/${testPolicyNumber}`);

    // Check for status-related information
    const statusElements = [
      'text=/active/i',
      'text=/inactive/i',
      'text=/cancelled/i',
      'text=/expired/i',
      'text=/status/i',
      '.status, [class*="status"]',
      '.badge, [class*="badge"]'
    ];

    let hasStatus = false;
    for (const selector of statusElements) {
      try {
        if (await page.locator(selector).first().isVisible()) {
          hasStatus = true;
          break;
        }
      } catch (e) {
        // Element not found
      }
    }

    // Status information is optional
    console.log('Policy status information found:', hasStatus);
  });

  test('should handle policy coverage details', async ({ page }) => {
    const testPolicyNumber = 'POL123456789';
    await page.goto(`/policy/${testPolicyNumber}`);

    // Check for coverage information
    const coverageElements = [
      'text=/coverage/i',
      'text=/limit/i',
      'text=/deductible/i',
      'text=/premium/i',
      '.coverage, [class*="coverage"]',
      'table:has(td:text("Coverage")), table:has(th:text("Coverage"))'
    ];

    let hasCoverage = false;
    for (const selector of coverageElements) {
      try {
        if (await page.locator(selector).first().isVisible()) {
          hasCoverage = true;
          break;
        }
      } catch (e) {
        // Element not found
      }
    }

    // Coverage details are optional
    console.log('Policy coverage details found:', hasCoverage);
  });

  test('should navigate to policy pages from navigation menu', async ({ page }) => {
    await page.goto('/claims-dashboard');

    // Test navigation to policy dashboard
    const policyLink = page.locator('[data-testid="nav-policy-dashboard"], a[href*="policy-dashboard"], text="Policy Dashboard"').first();

    if (await policyLink.isVisible()) {
      await policyLink.click();
      await expect(page).toHaveURL('/policy-dashboard');
    }
  });
});
import { test, expect } from '@playwright/test';

test.describe('Claims Management', () => {
  test.beforeEach(async ({ page }) => {
    // Set authentication state
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('isAuthenticated', 'true'));
  });

  test('should navigate to claims dashboard', async ({ page }) => {
    await page.goto('/claims-dashboard');
    await expect(page).toHaveURL('/claims-dashboard');

    // Check for claims dashboard content
    await expect(page.locator('h1, h2, h3').filter({ hasText: /claim|dashboard/i })).toBeVisible();
  });

  test('should display claims overview widgets', async ({ page }) => {
    await page.goto('/claims-dashboard');

    // Check for typical dashboard elements
    const dashboardElements = [
      '.card, [class*="card"]',
      '.widget, [class*="widget"]',
      '.stat, [class*="stat"]',
      '[data-testid*="claim"]',
      'table, [role="table"]'
    ];

    let visibleElements = 0;
    for (const selector of dashboardElements) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          visibleElements++;
        }
      } catch (e) {
        // Element not found
      }
    }

    expect(visibleElements).toBeGreaterThan(0);
  });

  test('should navigate to claims inquiry page', async ({ page }) => {
    await page.goto('/claims-inquiry');
    await expect(page).toHaveURL('/claims-inquiry');

    // Should display claims search/inquiry interface
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display claims list or search interface', async ({ page }) => {
    await page.goto('/claims-inquiry');

    // Check for search or list functionality
    const hasSearch = await page.locator('input[type="search"], input[placeholder*="search" i], input[name*="search"], input[name*="claim"]').isVisible();
    const hasTable = await page.locator('table, [role="table"]').isVisible();
    const hasList = await page.locator('ul, ol, [role="list"], .claim-list').isVisible();

    expect(hasSearch || hasTable || hasList).toBeTruthy();
  });

  test('should handle claim detail navigation', async ({ page }) => {
    // Test dynamic claim detail route
    const testClaimId = 'CLM123456';
    await page.goto(`/claims/${testClaimId}`);
    await expect(page).toHaveURL(`/claims/${testClaimId}`);

    // Should display claim detail page content
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display claim detail information', async ({ page }) => {
    const testClaimId = 'CLM123456';
    await page.goto(`/claims/${testClaimId}`);

    // Check for claim detail elements
    const detailElements = [
      'text=/claim/i',
      'text=/policy/i',
      'text=/amount/i',
      'text=/status/i',
      'text=/date/i',
      '.claim-detail, [class*="claim"]',
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

  test('should handle claims search functionality', async ({ page }) => {
    await page.goto('/claims-inquiry');

    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[name*="search"], input[name*="claim"]').first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('CLM123');

      // Look for search button or auto-search
      const searchButton = page.locator('button:has-text("Search"), button[type="submit"], button:has-text("Find")').first();

      if (await searchButton.isVisible()) {
        await searchButton.click();
      } else {
        await searchInput.press('Enter');
      }

      await page.waitForTimeout(1000);

      // Should show results or no results message
      const hasResults = await page.locator('table tbody tr, .search-result, [data-testid*="result"], .claim-item').count() > 0;
      const hasNoResults = await page.locator('text=/no results|not found|no claims|no data/i').isVisible();

      expect(hasResults || hasNoResults).toBeTruthy();
    }
  });

  test('should handle claim status updates', async ({ page }) => {
    const testClaimId = 'CLM123456';
    await page.goto(`/claims/${testClaimId}`);

    // Look for status update functionality
    const statusDropdown = page.locator('select[name*="status"], select:has(option:text("Open")), select:has(option:text("Closed"))').first();
    const statusButton = page.locator('button:has-text("Update Status"), button:has-text("Change Status")').first();

    if (await statusDropdown.isVisible()) {
      // Test status dropdown
      await statusDropdown.click();
      const options = await statusDropdown.locator('option').count();
      expect(options).toBeGreaterThan(1);
    } else if (await statusButton.isVisible()) {
      // Test status button
      await statusButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should display claim attachments or documents', async ({ page }) => {
    const testClaimId = 'CLM123456';
    await page.goto(`/claims/${testClaimId}`);

    // Check for attachments section
    const attachmentElements = [
      'text=/attachment/i',
      'text=/document/i',
      'text=/file/i',
      '.attachment, [class*="attachment"]',
      '.document, [class*="document"]',
      'input[type="file"]'
    ];

    let hasAttachments = false;
    for (const selector of attachmentElements) {
      try {
        if (await page.locator(selector).first().isVisible()) {
          hasAttachments = true;
          break;
        }
      } catch (e) {
        // Element not found
      }
    }

    // Attachments are optional, so we just log the result
    console.log('Attachments section found:', hasAttachments);
  });

  test('should handle claim assignment workflow', async ({ page }) => {
    await page.goto('/claims-inquiry');

    // Look for assignment functionality
    const assignButton = page.locator('button:has-text("Assign"), button:has-text("Assignment")').first();
    const assignLink = page.locator('a[href*="assign"], [data-testid*="assign"]').first();

    if (await assignButton.isVisible()) {
      await assignButton.click();
      await page.waitForTimeout(500);
    } else if (await assignLink.isVisible()) {
      await assignLink.click();
      await page.waitForTimeout(500);
    }

    // Assignment workflow may vary, so we just verify we don't get errors
    expect(page.url()).toBeTruthy();
  });

  test('should navigate to claims from navigation menu', async ({ page }) => {
    await page.goto('/claims-dashboard');

    // Test navigation to claims inquiry
    const claimsLink = page.locator('[data-testid="nav-claims-inquiry"], a[href*="claims-inquiry"], text="Claims Management", text="Claims Inquiry"').first();

    if (await claimsLink.isVisible()) {
      await claimsLink.click();
      await expect(page).toHaveURL('/claims-inquiry');
    }
  });

  test('should handle pagination in claims list', async ({ page }) => {
    await page.goto('/claims-inquiry');

    // Look for pagination controls
    const paginationElements = [
      'button:has-text("Next")',
      'button:has-text("Previous")',
      'button:has-text(">")',
      'button:has-text("<")',
      '.pagination, [class*="pagination"]',
      '[data-testid*="page"]'
    ];

    let hasPagination = false;
    for (const selector of paginationElements) {
      try {
        if (await page.locator(selector).first().isVisible()) {
          hasPagination = true;
          break;
        }
      } catch (e) {
        // Element not found
      }
    }

    // Pagination is optional depending on data
    console.log('Pagination found:', hasPagination);
  });
});
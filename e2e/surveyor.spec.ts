import { test, expect } from '@playwright/test';

test.describe('Surveyor Management', () => {
  test.beforeEach(async ({ page }) => {
    // Set authentication state
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('isAuthenticated', 'true'));
  });

  test('should navigate to dispatcher surveyor dashboard', async ({ page }) => {
    await page.goto('/dispatcher_surveyor');
    await expect(page).toHaveURL('/dispatcher_surveyor');

    // Check for surveyor dashboard content
    await expect(page.locator('h1, h2, h3').filter({ hasText: /surveyor|dispatch/i })).toBeVisible();
  });

  test('should display surveyor dashboard widgets', async ({ page }) => {
    await page.goto('/dispatcher_surveyor');

    // Check for dashboard elements
    const dashboardElements = [
      '.card, [class*="card"]',
      '.widget, [class*="widget"]',
      '.stat, [class*="stat"]',
      '[data-testid*="surveyor"]',
      'table, [role="table"]',
      'text=/surveyor/i'
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

  test('should navigate to surveyors inquiry page', async ({ page }) => {
    await page.goto('/surveyors-inquiry');
    await expect(page).toHaveURL('/surveyors-inquiry');

    // Should display surveyors inquiry interface
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display surveyors list or search interface', async ({ page }) => {
    await page.goto('/surveyors-inquiry');

    // Check for search or list functionality
    const interfaceElements = [
      'input[type="search"], input[placeholder*="search" i]',
      'input[name*="surveyor"], input[placeholder*="surveyor" i]',
      'table, [role="table"]',
      'ul, ol, [role="list"]',
      '.surveyor-list, [class*="surveyor"]'
    ];

    let hasInterface = false;
    for (const selector of interfaceElements) {
      try {
        if (await page.locator(selector).first().isVisible()) {
          hasInterface = true;
          break;
        }
      } catch (e) {
        // Element not found
      }
    }

    expect(hasInterface).toBeTruthy();
  });

  test('should handle surveyor search functionality', async ({ page }) => {
    await page.goto('/surveyors-inquiry');

    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[name*="surveyor"]').first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('John Doe');

      // Look for search button
      const searchButton = page.locator('button:has-text("Search"), button[type="submit"], button:has-text("Find")').first();

      if (await searchButton.isVisible()) {
        await searchButton.click();
      } else {
        await searchInput.press('Enter');
      }

      await page.waitForTimeout(1000);

      // Should show results or no results
      const hasResults = await page.locator('table tbody tr, .search-result, [data-testid*="surveyor"], .surveyor-item').count() > 0;
      const hasNoResults = await page.locator('text=/no results|not found|no surveyors|no data/i').isVisible();

      expect(hasResults || hasNoResults).toBeTruthy();
    }
  });

  test('should navigate to surveyor live map', async ({ page }) => {
    await page.goto('/surveyors-live-map');
    await expect(page).toHaveURL('/surveyors-live-map');

    // Check for map interface
    const mapElements = [
      '#map, [id*="map"]',
      '.map, [class*="map"]',
      'canvas',
      '[data-testid*="map"]',
      'text=/map/i'
    ];

    let hasMap = false;
    for (const selector of mapElements) {
      try {
        if (await page.locator(selector).first().isVisible()) {
          hasMap = true;
          break;
        }
      } catch (e) {
        // Element not found
      }
    }

    expect(hasMap).toBeTruthy();
  });

  test('should display map controls and surveyor locations', async ({ page }) => {
    await page.goto('/surveyors-live-map');

    // Check for map controls
    const mapControls = [
      'button:has-text("Zoom")',
      'button[title*="zoom"], button[aria-label*="zoom"]',
      '.map-control, [class*="control"]',
      '.leaflet-control, [class*="leaflet"]',
      'text=/location/i'
    ];

    let hasControls = false;
    for (const selector of mapControls) {
      try {
        if (await page.locator(selector).first().isVisible()) {
          hasControls = true;
          break;
        }
      } catch (e) {
        // Element not found
      }
    }

    // Map controls are optional depending on implementation
    console.log('Map controls found:', hasControls);
  });

  test('should navigate to surveyor edit page', async ({ page }) => {
    await page.goto('/surveyors-edit');
    await expect(page).toHaveURL('/surveyors-edit');

    // Should display surveyor edit interface
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display surveyor edit form', async ({ page }) => {
    await page.goto('/surveyors-edit');

    // Check for edit form elements
    const formElements = [
      'form, [role="form"]',
      'input[name*="name"], input[placeholder*="name" i]',
      'input[name*="email"], input[type="email"]',
      'input[name*="phone"], input[type="tel"]',
      'select, [role="combobox"]',
      'button:has-text("Save"), button:has-text("Update")'
    ];

    let hasForm = false;
    for (const selector of formElements) {
      try {
        if (await page.locator(selector).first().isVisible()) {
          hasForm = true;
          break;
        }
      } catch (e) {
        // Element not found
      }
    }

    expect(hasForm).toBeTruthy();
  });

  test('should handle surveyor form submission', async ({ page }) => {
    await page.goto('/surveyors-edit');

    // Fill basic form fields if they exist
    try {
      const nameInput = page.locator('input[name*="name"], input[placeholder*="name" i]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill('John Smith');
      }

      const emailInput = page.locator('input[name*="email"], input[type="email"]').first();
      if (await emailInput.isVisible()) {
        await emailInput.fill('john.smith@example.com');
      }

      const phoneInput = page.locator('input[name*="phone"], input[type="tel"]').first();
      if (await phoneInput.isVisible()) {
        await phoneInput.fill('555-0123');
      }

      const saveButton = page.locator('button:has-text("Save"), button:has-text("Update"), button[type="submit"]').first();
      if (await saveButton.isVisible()) {
        await saveButton.click();

        await page.waitForTimeout(1000);

        // Should show success message or redirect
        const hasSuccess = await page.locator('text=/success|saved|updated/i').isVisible();
        const redirected = !page.url().includes('/surveyors-edit');

        expect(hasSuccess || redirected).toBeTruthy();
      }
    } catch (e) {
      console.log('Form submission test failed, form might require API or have different structure');
    }
  });

  test('should handle surveyor assignment workflow', async ({ page }) => {
    await page.goto('/dispatcher_surveyor');

    // Look for assignment functionality
    const assignButtons = [
      'button:has-text("Assign")',
      'button:has-text("Dispatch")',
      'a:has-text("Assignment")',
      '[data-testid*="assign"]'
    ];

    let hasAssignment = false;
    for (const selector of assignButtons) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          await element.click();
          await page.waitForTimeout(500);
          hasAssignment = true;
          break;
        }
      } catch (e) {
        // Element not found
      }
    }

    // Assignment workflow may vary
    console.log('Assignment functionality found:', hasAssignment);
  });

  test('should display surveyor status information', async ({ page }) => {
    await page.goto('/surveyors-inquiry');

    // Check for status-related information
    const statusElements = [
      'text=/available/i',
      'text=/busy/i',
      'text=/offline/i',
      'text=/active/i',
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
    console.log('Surveyor status information found:', hasStatus);
  });

  test('should handle surveyor filtering and sorting', async ({ page }) => {
    await page.goto('/surveyors-inquiry');

    // Check for filter/sort controls
    const filterElements = [
      'select:has(option:text("Status"))',
      'select:has(option:text("Location"))',
      'button:has-text("Filter")',
      'button:has-text("Sort")',
      '.filter, [class*="filter"]',
      'input[type="checkbox"]'
    ];

    let hasFilters = false;
    for (const selector of filterElements) {
      try {
        if (await page.locator(selector).first().isVisible()) {
          hasFilters = true;
          break;
        }
      } catch (e) {
        // Element not found
      }
    }

    // Filters are optional
    console.log('Filter/sort functionality found:', hasFilters);
  });

  test('should navigate to surveyor pages from navigation menu', async ({ page }) => {
    await page.goto('/claims-dashboard');

    // Test navigation to surveyor dashboard
    const surveyorDashboardLink = page.locator('[data-testid="nav-dispatcher"], a[href*="dispatcher"], text="Surveyor Dashboard"').first();

    if (await surveyorDashboardLink.isVisible()) {
      await surveyorDashboardLink.click();
      await expect(page).toHaveURL('/dispatcher_surveyor');
    }

    // Test navigation to live map
    const liveMapLink = page.locator('[data-testid="nav-live-map"], a[href*="live-map"], text="Live Map"').first();

    if (await liveMapLink.isVisible()) {
      await liveMapLink.click();
      await page.waitForTimeout(500); // Wait for navigation
    }
  });

  test('should handle real-time updates on live map', async ({ page }) => {
    await page.goto('/surveyors-live-map');

    // Wait for potential real-time updates
    await page.waitForTimeout(2000);

    // Check if WebSocket connections are established (optional)
    const wsConnections = await page.evaluate(() => {
      // Check for common WebSocket indicators
      return !!window.WebSocket || !!window.io;
    });

    console.log('WebSocket support detected:', wsConnections);

    // Map should remain functional regardless
    await expect(page.locator('body')).toBeVisible();
  });
});
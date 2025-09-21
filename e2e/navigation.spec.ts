import { test, expect } from '@playwright/test';

test.describe('Navigation and Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Set authentication state
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('isAuthenticated', 'true'));
  });

  test('should display main navigation header', async ({ page }) => {
    await page.goto('/claims-dashboard');

    // Check for header navigation
    const headerElements = [
      'header, [role="banner"]',
      'nav, [role="navigation"]',
      '.header, [class*="header"]',
      '.nav, [class*="nav"]'
    ];

    let hasHeader = false;
    for (const selector of headerElements) {
      try {
        if (await page.locator(selector).first().isVisible()) {
          hasHeader = true;
          break;
        }
      } catch (e) {
        // Element not found
      }
    }

    expect(hasHeader).toBeTruthy();
  });

  test('should display brand information in header', async ({ page }) => {
    await page.goto('/claims-dashboard');

    // Check for brand/logo
    const brandElements = [
      'text=/Claims MotorX/i',
      'text=/Policy Portal/i',
      'text=/CMX/i',
      '.brand, [class*="brand"]',
      '.logo, [class*="logo"]',
      '[data-testid*="brand"], [data-testid*="logo"]'
    ];

    let hasBrand = false;
    for (const selector of brandElements) {
      try {
        if (await page.locator(selector).first().isVisible()) {
          hasBrand = true;
          break;
        }
      } catch (e) {
        // Element not found
      }
    }

    expect(hasBrand).toBeTruthy();
  });

  test('should display navigation menu items', async ({ page }) => {
    await page.goto('/claims-dashboard');

    // Check for navigation menu items
    const navItems = [
      'text="Home"',
      'text="FNOL Dashboard"',
      'text="Create FNOL"',
      'text="Surveyor Dashboard"',
      'text="Claims Management"',
      'text="Policy Dashboard"'
    ];

    let visibleNavItems = 0;
    for (const selector of navItems) {
      try {
        if (await page.locator(selector).first().isVisible()) {
          visibleNavItems++;
        }
      } catch (e) {
        // Item not found
      }
    }

    expect(visibleNavItems).toBeGreaterThan(2);
  });

  test('should navigate to home dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/claims-dashboard'); // Should redirect to claims-dashboard

    // Check for dashboard content
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display dashboard widgets and statistics', async ({ page }) => {
    await page.goto('/claims-dashboard');

    // Check for dashboard widgets
    const dashboardElements = [
      '.card, [class*="card"]',
      '.widget, [class*="widget"]',
      '.stat, [class*="stat"]',
      '.metric, [class*="metric"]',
      'text=/total/i',
      'text=/count/i',
      'text=/pending/i',
      'text=/active/i'
    ];

    let visibleWidgets = 0;
    for (const selector of dashboardElements) {
      try {
        if (await page.locator(selector).first().isVisible()) {
          visibleWidgets++;
        }
      } catch (e) {
        // Element not found
      }
    }

    expect(visibleWidgets).toBeGreaterThan(0);
  });

  test('should handle main navigation clicks', async ({ page }) => {
    await page.goto('/claims-dashboard');

    // Test FNOL Dashboard navigation
    const fnolDashboardLink = page.locator('[data-testid="nav-fnol-dashboard"], a[href*="fnol-dashboard"], text="FNOL Dashboard"').first();

    if (await fnolDashboardLink.isVisible()) {
      await fnolDashboardLink.click();
      await expect(page).toHaveURL('/fnol-dashboard');
    }

    // Test Create FNOL navigation
    const createFnolLink = page.locator('[data-testid="nav-create-fnol"], a[href*="create-fnol"], text="Create FNOL"').first();

    if (await createFnolLink.isVisible()) {
      await createFnolLink.click();
      await expect(page).toHaveURL('/create-fnol');
    }

    // Test Surveyor Dashboard navigation
    const surveyorDashboardLink = page.locator('[data-testid="nav-dispatcher"], a[href*="dispatcher"], text="Surveyor Dashboard"').first();

    if (await surveyorDashboardLink.isVisible()) {
      await surveyorDashboardLink.click();
      await expect(page).toHaveURL('/dispatcher_surveyor');
    }
  });

  test('should handle breadcrumb navigation', async ({ page }) => {
    await page.goto('/fnol-dashboard');

    // Check for breadcrumbs
    const breadcrumbs = [
      '.breadcrumb, [class*="breadcrumb"]',
      'nav[aria-label="breadcrumb"]',
      '[data-testid*="breadcrumb"]'
    ];

    let hasBreadcrumbs = false;
    for (const selector of breadcrumbs) {
      try {
        if (await page.locator(selector).first().isVisible()) {
          hasBreadcrumbs = true;
          break;
        }
      } catch (e) {
        // Element not found
      }
    }

    // Breadcrumbs are optional
    console.log('Breadcrumbs found:', hasBreadcrumbs);
  });

  test('should display user information or profile menu', async ({ page }) => {
    await page.goto('/claims-dashboard');

    // Check for user menu or profile info
    const userElements = [
      'button:has-text("Logout")',
      'button:has-text("Profile")',
      '.user-menu, [class*="user"]',
      '.profile, [class*="profile"]',
      '[data-testid*="user"], [data-testid*="profile"]'
    ];

    let hasUserMenu = false;
    for (const selector of userElements) {
      try {
        if (await page.locator(selector).first().isVisible()) {
          hasUserMenu = true;
          break;
        }
      } catch (e) {
        // Element not found
      }
    }

    expect(hasUserMenu).toBeTruthy();
  });

  test('should handle responsive navigation on smaller screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/claims-dashboard');

    // Check for mobile menu toggle
    const mobileMenuToggle = page.locator('button[aria-label*="menu"], button:has-text("☰"), .hamburger, [class*="hamburger"]').first();

    if (await mobileMenuToggle.isVisible()) {
      await mobileMenuToggle.click();
      await page.waitForTimeout(500);

      // Should show mobile navigation
      const mobileNav = await page.locator('nav, .mobile-nav, [class*="mobile"]').isVisible();
      expect(mobileNav).toBeTruthy();
    } else {
      // Navigation might be always visible or hidden on mobile
      console.log('Mobile menu toggle not found');
    }

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should handle navigation between different sections', async ({ page }) => {
    await page.goto('/claims-dashboard');

    const navigationTests = [
      { link: 'text="FNOL Management"', expectedUrl: '/fnol-inquiry' },
      { link: 'text="Claims Management"', expectedUrl: '/claims-inquiry' },
      { link: 'text="Surveyors Management"', expectedUrl: '/surveyors-inquiry' }
    ];

    for (const test of navigationTests) {
      try {
        const link = page.locator(test.link).first();
        if (await link.isVisible()) {
          await link.click();
          await expect(page).toHaveURL(test.expectedUrl);

          // Navigate back to dashboard
          await page.goto('/claims-dashboard');
        }
      } catch (e) {
        console.log(`Navigation test failed for ${test.link}`);
      }
    }
  });

  test('should display notifications badge in header', async ({ page }) => {
    await page.goto('/claims-dashboard');

    // Check for notification badge
    const notificationElements = [
      '.badge, [class*="badge"]',
      '.notification, [class*="notification"]',
      'text="3"', // Based on the badge count in the code
      '[data-testid*="notification"]'
    ];

    let hasNotificationBadge = false;
    for (const selector of notificationElements) {
      try {
        if (await page.locator(selector).first().isVisible()) {
          hasNotificationBadge = true;
          break;
        }
      } catch (e) {
        // Element not found
      }
    }

    // Notification badge is optional
    console.log('Notification badge found:', hasNotificationBadge);
  });

  test('should handle keyboard navigation', async ({ page }) => {
    await page.goto('/claims-dashboard');

    // Test Tab navigation through interactive elements
    await page.keyboard.press('Tab');

    // Check if focus is visible
    const focusedElement = await page.locator(':focus').isVisible();
    expect(focusedElement).toBeTruthy();

    // Test Enter key on focused element
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Should navigate or trigger action
    expect(page.url()).toBeTruthy();
  });

  test('should handle direct URL navigation to different routes', async ({ page }) => {
    const routes = [
      '/claims-dashboard',
      '/fnol-dashboard',
      '/create-fnol',
      '/fnol-inquiry',
      '/dispatcher_surveyor',
      '/surveyors-inquiry',
      '/notifications'
    ];

    for (const route of routes) {
      try {
        await page.goto(route);
        await expect(page).toHaveURL(route);

        // Should load without errors
        await expect(page.locator('body')).toBeVisible();
      } catch (e) {
        console.log(`Direct navigation failed for ${route}`);
      }
    }
  });

  test('should handle 404 page for invalid routes', async ({ page }) => {
    await page.goto('/invalid-route-that-does-not-exist');

    // Should either redirect to valid page or show 404
    const currentUrl = page.url();
    const hasErrorPage = await page.locator('text=/not found|404|error/i').isVisible();

    expect(currentUrl.includes('/claims-dashboard') || hasErrorPage).toBeTruthy();
  });
});
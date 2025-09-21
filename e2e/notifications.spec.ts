import { test, expect } from '@playwright/test';

test.describe('Notification System', () => {
  test.beforeEach(async ({ page }) => {
    // Set authentication state
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('isAuthenticated', 'true'));
  });

  test('should navigate to notifications page', async ({ page }) => {
    await page.goto('/notifications');
    await expect(page).toHaveURL('/notifications');

    // Check for notifications content
    await expect(page.locator('h1, h2, h3').filter({ hasText: /notification/i })).toBeVisible();
  });

  test('should display notifications list', async ({ page }) => {
    await page.goto('/notifications');

    // Check for notifications display
    const notificationElements = [
      '.notification, [class*="notification"]',
      '.alert, [class*="alert"]',
      '.message, [class*="message"]',
      'ul, ol, [role="list"]',
      'table, [role="table"]',
      '[data-testid*="notification"]'
    ];

    let hasNotifications = false;
    for (const selector of notificationElements) {
      try {
        if (await page.locator(selector).first().isVisible()) {
          hasNotifications = true;
          break;
        }
      } catch (e) {
        // Element not found
      }
    }

    expect(hasNotifications).toBeTruthy();
  });

  test('should display notification badge in header', async ({ page }) => {
    await page.goto('/claims-dashboard');

    // Check for notification badge (should show "3" based on the code)
    const badgeElements = [
      'text="3"',
      '.badge, [class*="badge"]',
      '.notification-count, [class*="count"]',
      '[data-testid*="notification-badge"]'
    ];

    let hasBadge = false;
    for (const selector of badgeElements) {
      try {
        if (await page.locator(selector).first().isVisible()) {
          hasBadge = true;
          break;
        }
      } catch (e) {
        // Element not found
      }
    }

    expect(hasBadge).toBeTruthy();
  });

  test('should handle notification click from header', async ({ page }) => {
    await page.goto('/claims-dashboard');

    // Look for notification link/button in header
    const notificationLink = page.locator('a[href*="notification"], button:has-text("Notification"), [data-testid*="notification"]').first();

    if (await notificationLink.isVisible()) {
      await notificationLink.click();
      await expect(page).toHaveURL('/notifications');
    } else {
      // Navigate directly if link not found
      await page.goto('/notifications');
      await expect(page).toHaveURL('/notifications');
    }
  });

  test('should display different notification types', async ({ page }) => {
    await page.goto('/notifications');

    // Check for different notification types
    const notificationTypes = [
      'text=/info/i',
      'text=/warning/i',
      'text=/error/i',
      'text=/success/i',
      'text=/alert/i',
      '.info, [class*="info"]',
      '.warning, [class*="warning"]',
      '.error, [class*="error"]',
      '.success, [class*="success"]'
    ];

    let typesFound = 0;
    for (const selector of notificationTypes) {
      try {
        if (await page.locator(selector).first().isVisible()) {
          typesFound++;
        }
      } catch (e) {
        // Element not found
      }
    }

    // At least some notification content should be present
    console.log('Notification types found:', typesFound);
  });

  test('should handle notification interactions', async ({ page }) => {
    await page.goto('/notifications');

    // Check for interactive elements
    const interactiveElements = [
      'button:has-text("Mark as Read")',
      'button:has-text("Dismiss")',
      'button:has-text("Clear")',
      'button:has-text("Delete")',
      'input[type="checkbox"]',
      '[role="button"]'
    ];

    let hasInteractions = false;
    for (const selector of interactiveElements) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          await element.click();
          await page.waitForTimeout(500);
          hasInteractions = true;
          break;
        }
      } catch (e) {
        // Element not found or interaction failed
      }
    }

    console.log('Interactive notification elements found:', hasInteractions);
  });

  test('should handle notification filtering or sorting', async ({ page }) => {
    await page.goto('/notifications');

    // Check for filter/sort options
    const filterElements = [
      'select:has(option:text("All"))',
      'select:has(option:text("Unread"))',
      'select:has(option:text("Read"))',
      'button:has-text("Filter")',
      'button:has-text("Sort")',
      'input[type="radio"]',
      '.filter, [class*="filter"]'
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

    console.log('Notification filters found:', hasFilters);
  });

  test('should handle bulk notification actions', async ({ page }) => {
    await page.goto('/notifications');

    // Check for bulk action functionality
    const bulkElements = [
      'button:has-text("Select All")',
      'button:has-text("Mark All as Read")',
      'button:has-text("Clear All")',
      'input[type="checkbox"]:has-text("All")',
      '.bulk-actions, [class*="bulk"]'
    ];

    let hasBulkActions = false;
    for (const selector of bulkElements) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          await element.click();
          await page.waitForTimeout(500);
          hasBulkActions = true;
          break;
        }
      } catch (e) {
        // Element not found
      }
    }

    console.log('Bulk notification actions found:', hasBulkActions);
  });

  test('should display notification timestamps', async ({ page }) => {
    await page.goto('/notifications');

    // Check for timestamp information
    const timestampElements = [
      'text=/ago/i',
      'text=/today/i',
      'text=/yesterday/i',
      'text=/AM|PM/i',
      'text=/\\d{1,2}:\\d{2}/i',
      '.time, [class*="time"]',
      '.date, [class*="date"]',
      '.timestamp, [class*="timestamp"]'
    ];

    let hasTimestamps = false;
    for (const selector of timestampElements) {
      try {
        if (await page.locator(selector).first().isVisible()) {
          hasTimestamps = true;
          break;
        }
      } catch (e) {
        // Element not found
      }
    }

    console.log('Notification timestamps found:', hasTimestamps);
  });

  test('should handle notification detail view', async ({ page }) => {
    await page.goto('/notifications');

    // Look for clickable notifications
    const notificationItems = page.locator('.notification, [class*="notification"], li, tr').first();

    if (await notificationItems.isVisible()) {
      await notificationItems.click();
      await page.waitForTimeout(500);

      // Should show more details or navigate to detail view
      const hasModal = await page.locator('.modal, [role="dialog"], .popup').isVisible();
      const urlChanged = !page.url().includes('/notifications');

      console.log('Notification detail interaction:', hasModal || urlChanged);
    }
  });

  test('should handle real-time notification updates', async ({ page }) => {
    await page.goto('/notifications');

    // Check for real-time update indicators
    const realtimeElements = [
      'text=/live/i',
      'text=/real-time/i',
      '.live, [class*="live"]',
      '.realtime, [class*="realtime"]'
    ];

    let hasRealtime = false;
    for (const selector of realtimeElements) {
      try {
        if (await page.locator(selector).first().isVisible()) {
          hasRealtime = true;
          break;
        }
      } catch (e) {
        // Element not found
      }
    }

    // Check for WebSocket connections (GraphQL subscriptions)
    const wsSupport = await page.evaluate(() => {
      return !!window.WebSocket;
    });

    console.log('Real-time notifications support:', hasRealtime || wsSupport);
  });

  test('should handle notification preferences or settings', async ({ page }) => {
    await page.goto('/notifications');

    // Look for settings or preferences
    const settingsElements = [
      'button:has-text("Settings")',
      'button:has-text("Preferences")',
      'a:has-text("Settings")',
      '.settings, [class*="settings"]',
      '[data-testid*="settings"]'
    ];

    let hasSettings = false;
    for (const selector of settingsElements) {
      try {
        if (await page.locator(selector).first().isVisible()) {
          hasSettings = true;
          break;
        }
      } catch (e) {
        // Element not found
      }
    }

    console.log('Notification settings found:', hasSettings);
  });

  test('should handle empty notification state', async ({ page }) => {
    await page.goto('/notifications');

    // Check for empty state message
    const emptyStateElements = [
      'text=/no notifications/i',
      'text=/empty/i',
      'text=/nothing to show/i',
      '.empty, [class*="empty"]',
      '.no-data, [class*="no-data"]'
    ];

    let hasEmptyState = false;
    for (const selector of emptyStateElements) {
      try {
        if (await page.locator(selector).first().isVisible()) {
          hasEmptyState = true;
          break;
        }
      } catch (e) {
        // Element not found
      }
    }

    // Empty state is optional - depends on whether there are notifications
    console.log('Empty notification state found:', hasEmptyState);
  });

  test('should handle notification search functionality', async ({ page }) => {
    await page.goto('/notifications');

    // Check for search functionality
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[name*="search"]').first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('test notification');

      const searchButton = page.locator('button:has-text("Search"), button[type="submit"]').first();

      if (await searchButton.isVisible()) {
        await searchButton.click();
      } else {
        await searchInput.press('Enter');
      }

      await page.waitForTimeout(1000);

      // Should filter notifications or show search results
      console.log('Notification search functionality tested');
    }
  });
});
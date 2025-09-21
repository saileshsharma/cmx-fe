import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  test('should show login form', async ({ page }) => {
    await page.goto('/login');

    // Take screenshot of login page
    await page.screenshot({ path: 'test-results/screenshots/login-page.png', fullPage: true });

    // Check for login form elements
    await expect(page.locator('input[type="email"], input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")')).toBeVisible();
  });

  test('should authenticate and redirect to dashboard', async ({ page }) => {
    await page.goto('/login');

    // Fill login form (adjust selectors based on your actual form)
    const emailInput = page.locator('input[type="email"], input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();

    await emailInput.fill('test@example.com');
    await passwordInput.fill('password123');

    // Screenshot before login attempt
    await page.screenshot({ path: 'test-results/screenshots/login-form-filled.png', fullPage: true });

    await submitButton.click();

    // Should redirect to dashboard after successful login
    await expect(page).toHaveURL('/claims-dashboard');

    // Screenshot of dashboard after successful login
    await page.screenshot({ path: 'test-results/screenshots/dashboard-after-login.png', fullPage: true });

    // Verify authentication state is set
    const isAuthenticated = await page.evaluate(() => localStorage.getItem('isAuthenticated'));
    expect(isAuthenticated).toBe('true');
  });

  test('should logout and redirect to login', async ({ page }) => {
    // Manually set authentication
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('isAuthenticated', 'true'));
    await page.goto('/claims-dashboard');

    // Find and click logout button
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out"), [data-testid="logout-button"]').first();
    await logoutButton.click();

    // Should redirect to login
    await expect(page).toHaveURL('/login');

    // Verify authentication state is cleared
    const isAuthenticated = await page.evaluate(() => localStorage.getItem('isAuthenticated'));
    expect(isAuthenticated).toBeNull();
  });

  test('should maintain authentication on page refresh', async ({ page }) => {
    // Set authentication state
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('isAuthenticated', 'true'));

    // Navigate to dashboard
    await page.goto('/claims-dashboard');
    await expect(page).toHaveURL('/claims-dashboard');

    // Refresh page
    await page.reload();

    // Should still be on dashboard
    await expect(page).toHaveURL('/claims-dashboard');
  });

  test('should handle invalid login attempts gracefully', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"], input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();

    // Try with empty credentials
    await submitButton.click();

    // Should stay on login page
    await expect(page).toHaveURL('/login');

    // Try with invalid credentials
    await emailInput.fill('invalid@example.com');
    await passwordInput.fill('wrongpassword');
    await submitButton.click();

    // Should handle error gracefully (check for error message or stay on login)
    await expect(page).toHaveURL('/login');
  });
});
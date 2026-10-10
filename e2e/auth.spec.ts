import { test, expect } from '@playwright/test';

test.describe('Authentication & Session Navigation', () => {
  test('1. Login validation displays error for incorrect credentials', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Attempt sign in with wrong password
    await page.fill('#login-email', 'priya.senior@iitb.ac.in');
    await page.fill('#login-password', 'WrongPassword999!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Verify error banner displays exact intended user-facing error message
    await expect(page.getByText('Invalid campus email or password')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('2. 1-Click Demo Login as Priya S. and authenticated navigation', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Click 1-Click demo login for Priya S.
    const priyaDemoBtn = page.getByRole('button', { name: /Priya S\./i });
    await expect(priyaDemoBtn).toBeVisible();
    await priyaDemoBtn.click();

    // Should redirect to marketplace
    await page.waitForURL(/\/marketplace/);

    // Navbar should display Priya S. with verified status
    await expect(page.locator('header').getByText('Priya S.')).toBeVisible();
    await expect(page.locator('header').getByText(/Verified/i)).toBeVisible();

    // Authenticated user can navigate to Create Listing
    await page.locator('header').getByRole('link', { name: 'Post Item' }).click();
    await page.waitForURL(/\/create-listing/);
    await expect(page.getByRole('heading', { name: 'Post an Item to Campus Exchange' })).toBeVisible();

    // Logging out clears session
    const logoutBtn = page.locator('header').getByTitle('Sign out of account');
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // Should redirect to login page
    await page.waitForURL(/\/login/);
    await expect(page.locator('header').getByRole('link', { name: 'Sign In' })).toBeVisible();
  });

  test('3. Registration enforces institutional email domain validation', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    // Fill form with unauthorized @gmail.com domain
    await page.fill('#reg-name', 'Public User');
    await page.fill('#reg-email', 'publicuser@gmail.com');
    await page.fill('#reg-phone', '+919876543210');
    await page.fill('#reg-password', 'SecurePass123!');

    await page.getByRole('button', { name: 'Register Account' }).click();

    // Should display domain authorization error
    await expect(page.getByText(/domain is not authorized|Email domain is not authorized/i)).toBeVisible();
  });
});

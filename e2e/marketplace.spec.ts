import { test, expect } from '@playwright/test';

test.describe('Marketplace Browsing, Filtering & Discovery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');
  });

  test('1. Marketplace loads and seeded products appear', async ({ page }) => {
    // Verify page heading and campus feed indicator
    await expect(page.getByText('IIT Bombay Live Loop')).toBeVisible();
    await expect(page.getByText('active listing')).toBeVisible();

    // Verify seeded products appear in the catalog
    const clrsCard = page.locator('article').filter({ hasText: 'Introduction to Algorithms' });
    await expect(clrsCard).toBeVisible();

    // Verify price formatting in INR (₹)
    await expect(clrsCard.getByText(/₹\s*\d+/).first()).toBeVisible();

    // Verify safe campus pickup landmark is displayed on card
    await expect(clrsCard.getByText('Central Library Steps')).toBeVisible();
  });

  test('2. Search by keyword and academic course code works', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search listings by title, keywords, or description...');
    await expect(searchInput).toBeVisible();

    // Search for "Algorithms"
    await searchInput.fill('Algorithms');
    await page.getByRole('button', { name: 'Search' }).click();
    await page.waitForTimeout(500);

    // Matching product should be present
    await expect(page.locator('article').filter({ hasText: 'Introduction to Algorithms' })).toBeVisible();

    // Clear search using the clear button
    const clearButton = searchInput.locator('..').getByRole('button');
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await page.waitForTimeout(500);
    }

    // Quick match by Course Code "CS201"
    const courseInput = page.getByPlaceholder('Course code (e.g. CS201)');
    if (await courseInput.isVisible()) {
      await courseInput.fill('CS201');
      await courseInput.press('Enter');
      await page.waitForTimeout(500);

      // Should find the CS201 textbook
      await expect(page.locator('article').filter({ hasText: 'Introduction to Algorithms' })).toBeVisible();
    }
  });

  test('3. Category filtering refines the listing feed', async ({ page }) => {
    // Click "Electronics & Calculators" category in sidebar
    const electronicsFilter = page.locator('aside').getByRole('button', { name: 'Electronics & Calculators' });
    await expect(electronicsFilter).toBeVisible();
    await electronicsFilter.click();
    await page.waitForTimeout(500);

    // Electronics product should be visible
    await expect(page.locator('article').filter({ hasText: 'Casio FX-991CW' })).toBeVisible();

    // Textbooks should be excluded when filtered by Electronics
    await expect(page.locator('article').filter({ hasText: 'Introduction to Algorithms' })).not.toBeVisible();

    // Clear filter or click All Categories
    await page.locator('aside').getByRole('button', { name: 'All Categories' }).click();
    await page.waitForTimeout(500);

    // Both categories should now be available again
    await expect(page.locator('article').filter({ hasText: 'Introduction to Algorithms' })).toBeVisible();
  });

  test('4. Listing type filter (Free Giveaways vs Direct Sale) works', async ({ page }) => {
    // Filter by Free Giveaways
    const freeRadio = page.getByLabel('Free Giveaways (₹0)');
    await freeRadio.check();
    await page.waitForTimeout(500);

    // Free items should display FREE (₹0)
    await expect(page.getByText('FREE (₹0)').first()).toBeVisible();

    // Reset to All Listing Types
    await page.getByLabel('All Listing Types').check();
    await page.waitForTimeout(500);
  });

  test('5. Product card opens detail page with safe pickup spot & privacy shield', async ({ page }) => {
    const clrsCard = page.locator('article').filter({ hasText: 'Introduction to Algorithms' });
    await expect(clrsCard).toBeVisible();

    // Click card to open detail view
    await clrsCard.click();
    await page.waitForURL(/\/products\/[a-f0-9]{24}/);

    // Verify detail page elements
    await expect(page.getByRole('heading', { level: 1, name: /Introduction to Algorithms/ })).toBeVisible();
    await expect(page.getByText('Designated Safe Pickup Spot:')).toBeVisible();
    await expect(page.getByText('Central Library Steps')).toBeVisible();

    // Verify Academic Course Code
    await expect(page.getByText('Academic Course Code:')).toBeVisible();
    await expect(page.getByText('CS201', { exact: true })).toBeVisible();

    // Verify Seller Privacy Shield: seller name is visible, but phone and email are masked
    await expect(page.getByText('Seller Verified Identity')).toBeVisible();
    await expect(page.getByText('Priya S.')).toBeVisible();
    await expect(page.getByText(/Seller phone and WhatsApp contact are securely masked/)).toBeVisible();
    await expect(page.locator('body')).not.toContainText('priya.senior@iitb.ac.in');
    await expect(page.locator('body')).not.toContainText('+919820123456');
  });

  test('6. Empty state and error recovery render correctly', async ({ page }) => {
    // Search for a non-existent item
    const searchInput = page.getByPlaceholder('Search listings by title, keywords, or description...');
    await searchInput.fill('NonExistentBookXYZ99999');
    await page.getByRole('button', { name: 'Search' }).click();
    await page.waitForTimeout(500);

    // Empty state should be visible
    await expect(page.getByText('No Campus Listings Match Filters')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset Filters' })).toBeVisible();

    // Click Reset Filters to recover
    await page.getByRole('button', { name: 'Reset Filters' }).click();
    await page.waitForTimeout(500);

    // Products should reappear
    await expect(page.locator('article').first()).toBeVisible();

    // Test missing product ID error page
    await page.goto('/products/000000000000000000000000');
    await expect(page.getByRole('heading', { name: 'Product Not Found' })).toBeVisible();
    const backBtn = page.getByRole('link', { name: 'Back to Marketplace' });
    await expect(backBtn).toBeVisible();
    await backBtn.click();
    await page.waitForURL(/\/marketplace/);
  });
});

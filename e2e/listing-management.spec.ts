import { test, expect } from '@playwright/test';

test.describe('Listing Creation, Ownership & Management', () => {
  test('5. Verified seller can create, pause, resume, and delete a listing', async ({ page }) => {
    // Sign in as Priya S.
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Priya S\./i }).click();
    await page.waitForURL(/\/marketplace/);

    // Navigate to Create Listing
    await page.goto('/create-listing');
    await page.waitForLoadState('networkidle');

    const testItemTitle = `[Test E2E] Foldable Desk Lamp ${Date.now()}`;

    // Fill form
    await page.fill('#product-title', testItemTitle);
    await page.selectOption('#product-category', 'Hostel Essentials');
    await page.selectOption('#product-condition', 'Like New');
    await page.fill('#selling-price', '250');
    await page.fill('#original-price', '699');
    await page.fill(
      '#product-description',
      'Rechargeable warm LED study lamp with 3 brightness modes. Perfect for hostel night study.'
    );

    // Select safe pickup landmark
    await page.locator('#pickup-location').selectOption({ index: 0 });

    // Submit listing
    await page.getByRole('button', { name: 'Publish Listing to Campus' }).click();

    // Should redirect to the newly created product's detail page
    await page.waitForURL(/\/products\/[a-f0-9]{24}/);
    await expect(page.getByRole('heading', { level: 1, name: testItemTitle })).toBeVisible();

    // Verify owner controls are present
    const pauseBtn = page.getByRole('button', { name: 'Pause Listing' });
    const deleteBtn = page.getByRole('button', { name: 'Delete' });
    await expect(pauseBtn).toBeVisible();
    await expect(deleteBtn).toBeVisible();

    // Test 1: Pause listing
    await pauseBtn.click();
    await expect(page.getByText('PAUSED')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Resume Listing' })).toBeVisible();

    // Test 2: Resume listing
    await page.getByRole('button', { name: 'Resume Listing' }).click();
    await expect(page.getByText('AVAILABLE')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pause Listing' })).toBeVisible();

    // Test 3: Delete test listing to clean up and preserve permanent records
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    await deleteBtn.click();
    await page.waitForURL(/\/marketplace/);

    // Verify the deleted test item no longer appears in marketplace
    await expect(page.locator('article').filter({ hasText: testItemTitle })).not.toBeVisible();
  });

  test("6. Different user cannot edit or delete another user's listing", async ({ page, request }) => {
    // 1. Sign in as Rahul M. (Fresher Buyer)
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Rahul M\./i }).click();
    await page.waitForURL(/\/marketplace/);

    // Confirm logged in as Rahul M.
    await expect(page.locator('header').getByText('Rahul M.')).toBeVisible();

    // Find and open Priya's seeded listing: "Introduction to Algorithms (CLRS 3rd Ed.)"
    const priyaListing = page.locator('article').filter({ hasText: 'Introduction to Algorithms' });
    await expect(priyaListing).toBeVisible();
    await priyaListing.click();
    await page.waitForURL(/\/products\/[a-f0-9]{24}/);

    const productId = page.url().split('/products/')[1];

    // 2. UI CHECK: Rahul MUST NOT see owner controls (Pause / Delete)
    await expect(page.getByRole('button', { name: 'Pause Listing' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Resume Listing' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete' })).not.toBeVisible();

    // 3. UI CHECK: Rahul sees student buyer action instead
    await expect(page.getByRole('button', { name: /Request to Buy/i })).toBeVisible();

    // 4. API SECURITY CHECK: Rahul attempts direct PUT/DELETE mutation on Priya's item
    // Extract Rahul's JWT from localStorage
    const token = await page.evaluate(() => localStorage.getItem('uniloop_token'));
    expect(token).toBeTruthy();

    // Attempt unauthorized PUT
    const putRes = await request.put(`http://localhost:5000/api/v1/products/${productId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        title: 'Hacked by Rahul',
        description: 'Unauthorized update attempt',
        price: 10,
        category: 'Textbooks & Notes',
        condition: 'Fair',
        listingType: 'sell',
        campusPickupLocation: 'Central Library Steps',
        images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600'],
      },
    });
    expect(putRes.status()).toBe(403);
    const putBody = await putRes.json();
    expect(putBody.message).toContain('permission');

    // Attempt unauthorized DELETE
    const deleteRes = await request.delete(`http://localhost:5000/api/v1/products/${productId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    expect(deleteRes.status()).toBe(403);
    const deleteBody = await deleteRes.json();
    expect(deleteBody.message).toContain('permission');
  });
});

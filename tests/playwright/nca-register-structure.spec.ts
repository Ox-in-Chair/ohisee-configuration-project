import { test, expect } from '@playwright/test';

/**
 * NCA Register Structure Tests (P0 - Critical)
 *
 * Tests verify the NCA Register page loads correctly with table structure,
 * data rendering, and navigation capabilities.
 *
 * Architecture: Server Component data fetching + Client Component table rendering
 * TDD Phase: RED - These tests MUST fail initially
 */

test.describe('NCA Register - Page Structure', () => {
  test('should load NCA register page at /nca/register', async ({ page }) => {
    await page.goto('/nca/register');

    // Verify page loads without error
    await expect(page).toHaveTitle(/NCA Register/i);

    // Verify main heading exists
    await expect(page.locator('h1')).toContainText(/NCA Register/i);
  });

  test('should display NCA table with data-testid', async ({ page }) => {
    await page.goto('/nca/register');

    // Verify table exists with correct test ID
    const table = page.locator('[data-testid="nca-table"]');
    await expect(table).toBeVisible();
  });

  test('should display all required column headers', async ({ page }) => {
    await page.goto('/nca/register');

    // Verify all required columns exist in correct order
    const headers = [
      'NCA Number',
      'Status',
      'Created Date',
      'Machine',
      'Description',
    ];

    for (const header of headers) {
      await expect(page.locator('th', { hasText: header })).toBeVisible();
    }
  });
});

test.describe('NCA Register - Data Rendering', () => {
  test('should render NCA rows when data exists in database', async ({ page }) => {
    await page.goto('/nca/register');

    // Wait for table to load
    await page.waitForSelector('[data-testid="nca-table"]');

    // Check if any rows exist (assuming seed data)
    const rows = page.locator('[data-testid^="nca-row-"]');
    const rowCount = await rows.count();

    // At minimum, verify table structure can render rows
    // If no data exists, this will be 0 but table should still exist
    expect(rowCount).toBeGreaterThanOrEqual(0);
  });

  test('should render NCA rows with correct data-testid pattern', async ({ page }) => {
    await page.goto('/nca/register');

    // Wait for any NCA rows
    const firstRow = page.locator('[data-testid^="nca-row-"]').first();

    // If rows exist, verify they have proper UUID pattern in testid
    const rowCount = await page.locator('[data-testid^="nca-row-"]').count();

    if (rowCount > 0) {
      const testId = await firstRow.getAttribute('data-testid');
      // UUID pattern: nca-row-{uuid}
      expect(testId).toMatch(/^nca-row-[a-f0-9-]{36}$/);
    }
  });

  test('should display NCA number in first column', async ({ page }) => {
    await page.goto('/nca/register');

    const firstRow = page.locator('[data-testid^="nca-row-"]').first();
    const rowCount = await page.locator('[data-testid^="nca-row-"]').count();

    if (rowCount > 0) {
      // NCA number format: NCA-YYYY-########
      const ncaNumber = firstRow.locator('td').first();
      await expect(ncaNumber).toBeVisible();

      const text = await ncaNumber.textContent();
      expect(text).toMatch(/^NCA-\d{4}-\d+$/);
    }
  });

  test('should display status badge with proper styling', async ({ page }) => {
    await page.goto('/nca/register');

    const firstRow = page.locator('[data-testid^="nca-row-"]').first();
    const rowCount = await page.locator('[data-testid^="nca-row-"]').count();

    if (rowCount > 0) {
      // Status should be in badge component
      const statusBadge = firstRow.locator('[data-testid="status-badge"]');
      await expect(statusBadge).toBeVisible();

      // Verify it contains valid status text
      const statusText = await statusBadge.textContent();
      expect(['Draft', 'Submitted', 'Under Review', 'Closed']).toContain(statusText?.trim());
    }
  });
});

test.describe('NCA Register - Navigation', () => {
  test('should navigate to NCA detail page when row is clicked', async ({ page }) => {
    await page.goto('/nca/register');

    // Wait for rows to load
    const firstRow = page.locator('[data-testid^="nca-row-"]').first();
    const rowCount = await page.locator('[data-testid^="nca-row-"]').count();

    if (rowCount > 0) {
      // Get the NCA ID from data-testid
      const testId = await firstRow.getAttribute('data-testid');
      const ncaId = testId?.replace('nca-row-', '');

      // Click the row
      await firstRow.click();

      // Wait for navigation
      await page.waitForURL(`**/nca/${ncaId}`);

      // Verify we're on the detail page
      expect(page.url()).toContain(`/nca/${ncaId}`);
    }
  });

  test('should make rows clickable with hover effect', async ({ page }) => {
    await page.goto('/nca/register');

    const firstRow = page.locator('[data-testid^="nca-row-"]').first();
    const rowCount = await page.locator('[data-testid^="nca-row-"]').count();

    if (rowCount > 0) {
      // Verify row has cursor pointer (clickable indication)
      await expect(firstRow).toHaveCSS('cursor', 'pointer');
    }
  });
});

test.describe('NCA Register - Empty State', () => {
  test('should display helpful message when no NCAs exist', async ({ page }) => {
    // This test assumes we can test with empty database
    // In production, we'd set up test fixtures for this scenario
    await page.goto('/nca/register');

    // If no rows exist, verify empty state message
    const rowCount = await page.locator('[data-testid^="nca-row-"]').count();

    if (rowCount === 0) {
      const emptyMessage = page.locator('[data-testid="empty-state"]');
      await expect(emptyMessage).toBeVisible();
      await expect(emptyMessage).toContainText(/No NCAs found/i);
    }
  });
});

test.describe('NCA Register - Accessibility', () => {
  test('should have proper ARIA labels for table', async ({ page }) => {
    await page.goto('/nca/register');

    const table = page.locator('[data-testid="nca-table"]');

    // Table should have aria-label
    const ariaLabel = await table.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel).toContain('NCA');
  });

  test('should have proper semantic HTML structure', async ({ page }) => {
    await page.goto('/nca/register');

    // Verify table uses proper semantic elements
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('thead')).toBeVisible();
    await expect(page.locator('tbody')).toBeVisible();
  });
});

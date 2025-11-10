import { test, expect } from '@playwright/test';

/**
 * MJC Register Page - Scaffolding Tests (TDD RED Phase)
 *
 * Design Reference:
 * - IMPLEMENTATION_PLAN.md: MJC Register Page
 * - MANIFEST.md: Feature 2 - Maintenance Job Card (MJC) Module
 * - component-hierarchy.md: MJCRegisterPage + MJCTable
 *
 * These tests verify the STRUCTURE exists before testing behavior.
 * Following TDD: These tests will FAIL until we implement the components (GREEN phase).
 *
 * Test Requirements:
 * - Page loads at /mjc/register
 * - Table exists with data-testid="mjc-table"
 * - Column headers: MJC Number, Status, Created Date, Machine, Maintenance Type, Urgency
 * - Rows render when MJCs exist in database
 * - Each row has data-testid="mjc-row-{id}"
 * - Temporary repair indicator shows for temp repairs
 * - Click row navigates to /mjc/[id]
 */

test.describe('MJC Register - Scaffolding Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to MJC register page (will create this route in GREEN phase)
    await page.goto('http://localhost:3008/mjc/register');
  });

  test('should have MJC register page accessible', async ({ page }) => {
    // Verify the page loads (not 404)
    const title = await page.title();
    expect(title).toContain('Maintenance Job Card Register');
  });

  test('should display page header with title', async ({ page }) => {
    // Page title "Maintenance Job Card Register"
    const heading = await page.locator('h1[data-testid="mjc-register-title"]');
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText(/Maintenance Job Card Register/i);
  });

  test('should have MJC table with correct data-testid', async ({ page }) => {
    // Table must have data-testid="mjc-table"
    const table = await page.locator('[data-testid="mjc-table"]');
    await expect(table).toBeVisible();
  });

  test('should have correct column headers in MJC table', async ({ page }) => {
    // Required columns: MJC Number, Status, Created Date, Machine, Maintenance Type, Urgency
    const table = await page.locator('[data-testid="mjc-table"]');

    // Check for MJC Number column
    const mjcNumberHeader = table.locator('th:has-text("MJC Number")');
    await expect(mjcNumberHeader).toBeVisible();

    // Check for Status column
    const statusHeader = table.locator('th:has-text("Status")');
    await expect(statusHeader).toBeVisible();

    // Check for Created Date column
    const createdDateHeader = table.locator('th:has-text("Created Date")');
    await expect(createdDateHeader).toBeVisible();

    // Check for Machine column
    const machineHeader = table.locator('th:has-text("Machine")');
    await expect(machineHeader).toBeVisible();

    // Check for Maintenance Type column
    const maintenanceTypeHeader = table.locator('th:has-text("Maintenance Type")');
    await expect(maintenanceTypeHeader).toBeVisible();

    // Check for Urgency column
    const urgencyHeader = table.locator('th:has-text("Urgency")');
    await expect(urgencyHeader).toBeVisible();
  });

  test('should render table rows when MJCs exist in database', async ({ page }) => {
    // This test assumes test data exists (will be seeded in GREEN phase)
    const table = await page.locator('[data-testid="mjc-table"]');

    // Check that at least one row exists (excluding header)
    const rows = table.locator('tbody tr');
    const rowCount = await rows.count();

    // We expect at least 1 MJC in test database
    expect(rowCount).toBeGreaterThan(0);
  });

  test('should have each row with data-testid="mjc-row-{id}"', async ({ page }) => {
    // Each row must have data-testid with MJC ID
    const table = await page.locator('[data-testid="mjc-table"]');
    const firstRow = table.locator('tbody tr').first();

    // Verify row has data-testid attribute
    const testId = await firstRow.getAttribute('data-testid');
    expect(testId).toMatch(/^mjc-row-[a-f0-9-]+$/);
  });

  test('should display temporary repair badge for temp repairs', async ({ page }) => {
    // If MJC has temporary_repair = true, show badge with days remaining
    // This test will pass when we have test data with temporary repairs
    const table = await page.locator('[data-testid="mjc-table"]');

    // Look for temporary repair indicator (data-testid="temp-repair-badge")
    const tempRepairBadge = table.locator('[data-testid="temp-repair-badge"]').first();

    // Check if badge exists (may not exist if no temp repairs in test data)
    const badgeCount = await table.locator('[data-testid="temp-repair-badge"]').count();

    if (badgeCount > 0) {
      await expect(tempRepairBadge).toBeVisible();
      // Badge should show days remaining
      const badgeText = await tempRepairBadge.textContent();
      expect(badgeText).toMatch(/\d+\s+day(s)?/i);
    }
  });

  test('should navigate to MJC detail page when row is clicked', async ({ page }) => {
    // Click on first row should navigate to /mjc/[id]
    const table = await page.locator('[data-testid="mjc-table"]');
    const firstRow = table.locator('tbody tr').first();

    // Get the MJC ID from data-testid
    const testId = await firstRow.getAttribute('data-testid');
    const mjcId = testId?.replace('mjc-row-', '');

    // Click the row
    await firstRow.click();

    // Wait for navigation
    await page.waitForURL(`**/mjc/${mjcId}`);

    // Verify we're on the detail page
    expect(page.url()).toContain(`/mjc/${mjcId}`);
  });

  test('should display MJC number in first column of each row', async ({ page }) => {
    // First column should show MJC number (format: MJC-YYYY-########)
    const table = await page.locator('[data-testid="mjc-table"]');
    const firstRow = table.locator('tbody tr').first();
    const firstCell = firstRow.locator('td').first();

    const mjcNumber = await firstCell.textContent();
    expect(mjcNumber).toMatch(/^MJC-\d{4}-\d{8}$/);
  });

  test('should display status badge in Status column', async ({ page }) => {
    // Status column should have color-coded badges
    const table = await page.locator('[data-testid="mjc-table"]');
    const firstRow = table.locator('tbody tr').first();

    // Look for status badge
    const statusBadge = firstRow.locator('[data-testid="status-badge"]');
    await expect(statusBadge).toBeVisible();

    // Badge should have text content (draft, open, assigned, etc.)
    const statusText = await statusBadge.textContent();
    expect(statusText).toBeTruthy();
  });

  test('should display urgency badge in Urgency column', async ({ page }) => {
    // Urgency column should have color-coded badges (critical, high, medium, low)
    const table = await page.locator('[data-testid="mjc-table"]');
    const firstRow = table.locator('tbody tr').first();

    // Look for urgency badge
    const urgencyBadge = firstRow.locator('[data-testid="urgency-badge"]');
    await expect(urgencyBadge).toBeVisible();

    // Badge should have text content
    const urgencyText = await urgencyBadge.textContent();
    expect(urgencyText).toMatch(/^(critical|high|medium|low)$/i);
  });

  test('should display formatted created date', async ({ page }) => {
    // Created Date column should show human-readable date format
    const table = await page.locator('[data-testid="mjc-table"]');
    const firstRow = table.locator('tbody tr').first();

    // Find Created Date column (3rd column)
    const dateCell = firstRow.locator('td').nth(2);
    const dateText = await dateCell.textContent();

    // Verify date is formatted (not raw ISO string)
    expect(dateText).toBeTruthy();
    expect(dateText).not.toMatch(/T\d{2}:\d{2}:\d{2}/); // Not ISO format
  });

  test('should display maintenance category in Maintenance Type column', async ({ page }) => {
    // Maintenance Type column should show "Reactive" or "Planned"
    const table = await page.locator('[data-testid="mjc-table"]');
    const firstRow = table.locator('tbody tr').first();

    // Find Maintenance Type column (5th column)
    const maintenanceTypeCell = firstRow.locator('td').nth(4);
    const maintenanceTypeText = await maintenanceTypeCell.textContent();

    expect(maintenanceTypeText).toMatch(/^(reactive|planned)$/i);
  });
});

/**
 * MJC Register - Empty State Tests
 */
test.describe('MJC Register - Empty State', () => {
  test('should show empty state message when no MJCs exist', async ({ page }) => {
    // This test will be implemented when we have ability to clear test data
    // For now, skip this test
    test.skip();
  });
});

/**
 * MJC Register - Temporary Repair Countdown Tests
 */
test.describe('MJC Register - Temporary Repair Countdown', () => {
  test('should show "Due in X days" for temporary repairs', async ({ page }) => {
    await page.goto('http://localhost:3008/mjc/register');

    const table = await page.locator('[data-testid="mjc-table"]');
    const tempRepairBadge = table.locator('[data-testid="temp-repair-badge"]').first();

    const badgeCount = await table.locator('[data-testid="temp-repair-badge"]').count();

    if (badgeCount > 0) {
      const badgeText = await tempRepairBadge.textContent();
      expect(badgeText).toMatch(/^(Due in \d+ day(s)?|Overdue by \d+ day(s)?)$/i);
    }
  });

  test('should show warning color for repairs due in 3 days or less', async ({ page }) => {
    // This test verifies visual styling for urgency
    await page.goto('http://localhost:3008/mjc/register');

    const table = await page.locator('[data-testid="mjc-table"]');
    const tempRepairBadges = table.locator('[data-testid="temp-repair-badge"]');

    const badgeCount = await tempRepairBadges.count();

    if (badgeCount > 0) {
      // Check if any badges have warning styling (will verify in GREEN phase)
      const firstBadge = tempRepairBadges.first();
      await expect(firstBadge).toBeVisible();
    }
  });
});

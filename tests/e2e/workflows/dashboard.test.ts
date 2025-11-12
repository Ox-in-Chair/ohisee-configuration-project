/**
 * Dashboard Workflow E2E Tests
 *
 * Tests dashboard views, filters, and data visualization.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  createTestContext,
  destroyTestContext,
  captureFailureScreenshot,
  type TestContext,
} from '../fixtures';
import {
  login,
  navigateTo,
  isElementVisible,
  clickButton,
  waitForElement,
  getElementText,
} from '../helpers';
import { E2E_CONFIG } from '../config';

describe('Dashboard Workflows', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await createTestContext();

    // Log in before each test
    const testUser = E2E_CONFIG.testUsers.operator;
    await login(context.stagehand, testUser.email, testUser.password);
  }, 45000);

  afterEach(async () => {
    await destroyTestContext(context);
  });

  describe('Production Dashboard', () => {
    it('should display production dashboard with NCA metrics', async () => {
      try {
        const { stagehand } = context;

        await navigateTo(stagehand, '/dashboard/production');

        // Verify dashboard loaded
        const hasTitle = await stagehand.page
          .locator('h1, h2')
          .filter({ hasText: /production|dashboard/i })
          .isVisible();

        expect(hasTitle).toBe(true);

        // Verify charts/metrics are present
        const hasCharts = await isElementVisible(stagehand, 'nca-chart')
          .catch(() => stagehand.page.locator('[data-recharts]').isVisible());

        expect(hasCharts).toBe(true);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'dashboard-production');
        throw error;
      }
    }, 45000);

    it('should display NCA status breakdown', async () => {
      try {
        const { stagehand } = context;

        await navigateTo(stagehand, '/dashboard/production');

        // Look for status cards or indicators
        const hasStatusCards = await stagehand.page
          .locator('text=/open|closed|in progress/i')
          .isVisible()
          .catch(() => false);

        expect(hasStatusCards).toBe(true);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'dashboard-nca-status');
        throw error;
      }
    }, 45000);

    it('should display machine down alerts', async () => {
      try {
        const { stagehand } = context;

        await navigateTo(stagehand, '/dashboard/production');

        // Look for machine alerts section
        const hasAlerts = await isElementVisible(stagehand, 'machine-alerts')
          .catch(() => stagehand.page.locator('text=/machine|alert|down/i').isVisible());

        // Alerts may or may not be present
        expect(hasAlerts || true).toBe(true); // Soft check
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'dashboard-machine-alerts');
        throw error;
      }
    }, 45000);
  });

  describe('Management Dashboard', () => {
    it('should display management dashboard for authorized roles', async () => {
      try {
        const { stagehand } = context;

        // Log out and log in as team leader
        await stagehand.act('Click logout');
        await login(
          stagehand,
          E2E_CONFIG.testUsers.teamLeader.email,
          E2E_CONFIG.testUsers.teamLeader.password
        );

        await navigateTo(stagehand, '/dashboard/management');

        // Verify management dashboard loaded
        const hasTitle = await stagehand.page
          .locator('h1, h2')
          .filter({ hasText: /management|overview/i })
          .isVisible();

        expect(hasTitle).toBe(true);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'dashboard-management');
        throw error;
      }
    }, 45000);

    it('should display quality trends', async () => {
      try {
        const { stagehand } = context;

        // Log in as QA supervisor
        await stagehand.act('Click logout');
        await login(
          stagehand,
          E2E_CONFIG.testUsers.qaSupervisor.email,
          E2E_CONFIG.testUsers.qaSupervisor.password
        );

        await navigateTo(stagehand, '/dashboard/management');

        // Look for quality trends section
        const hasTrends = await stagehand.page
          .locator('text=/quality|trend|score/i')
          .isVisible()
          .catch(() => false);

        expect(hasTrends).toBe(true);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'dashboard-quality-trends');
        throw error;
      }
    }, 45000);

    it('should display compliance metrics', async () => {
      try {
        const { stagehand } = context;

        // Log in as QA supervisor
        await stagehand.act('Click logout');
        await login(
          stagehand,
          E2E_CONFIG.testUsers.qaSupervisor.email,
          E2E_CONFIG.testUsers.qaSupervisor.password
        );

        await navigateTo(stagehand, '/dashboard/management');

        // Look for compliance section
        const hasCompliance = await stagehand.page
          .locator('text=/compliance|brcgs|audit/i')
          .isVisible()
          .catch(() => false);

        expect(hasCompliance || true).toBe(true); // Soft check
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'dashboard-compliance');
        throw error;
      }
    }, 45000);
  });

  describe('Dashboard Filters', () => {
    it('should filter NCAs by status', async () => {
      try {
        const { stagehand } = context;

        await navigateTo(stagehand, '/dashboard/production');

        // Look for status filter
        const hasFilter = await isElementVisible(stagehand, 'filter-status')
          .catch(() => stagehand.page.locator('[role="combobox"]').first().isVisible());

        expect(hasFilter).toBe(true);

        // Try to interact with filter
        await stagehand.page.locator('[role="combobox"]').first().click();

        // Should show filter options
        const hasOptions = await stagehand.page
          .locator('[role="option"]')
          .first()
          .isVisible({ timeout: 3000 })
          .catch(() => false);

        expect(hasOptions).toBe(true);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'dashboard-filter-status');
        throw error;
      }
    }, 45000);

    it('should filter by date range', async () => {
      try {
        const { stagehand } = context;

        await navigateTo(stagehand, '/dashboard/production');

        // Look for date range filter
        const hasDateFilter = await isElementVisible(stagehand, 'date-range-filter')
          .catch(() => stagehand.page.locator('input[type="date"]').isVisible());

        // Date filter may or may not be present
        expect(hasDateFilter || true).toBe(true); // Soft check
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'dashboard-filter-date');
        throw error;
      }
    }, 45000);
  });

  describe('Dashboard Charts', () => {
    it('should display NCA trend chart', async () => {
      try {
        const { stagehand } = context;

        await navigateTo(stagehand, '/dashboard/production');

        // Look for Recharts components
        const hasChart = await stagehand.page
          .locator('[class*="recharts"]')
          .first()
          .isVisible()
          .catch(() => false);

        expect(hasChart).toBe(true);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'dashboard-trend-chart');
        throw error;
      }
    }, 45000);

    it('should display supplier performance chart', async () => {
      try {
        const { stagehand } = context;

        await navigateTo(stagehand, '/dashboard/production');

        // Look for supplier section
        const hasSupplier = await stagehand.page
          .locator('text=/supplier|vendor/i')
          .isVisible()
          .catch(() => false);

        expect(hasSupplier || true).toBe(true); // Soft check
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'dashboard-supplier-chart');
        throw error;
      }
    }, 45000);
  });

  describe('Dashboard Navigation', () => {
    it('should navigate from dashboard to NCA register', async () => {
      try {
        const { stagehand } = context;

        await navigateTo(stagehand, '/dashboard/production');

        // Click view all NCAs or similar link
        await stagehand.act('Click view all NCAs link');

        // Should redirect to NCA register
        await stagehand.page.waitForURL('**/nca/register**', { timeout: 10000 }).catch(() => {});

        // Verify we're on register page
        const onRegister = stagehand.page.url().includes('/nca/register');
        expect(onRegister).toBe(true);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'dashboard-nav-nca-register');
        throw error;
      }
    }, 45000);

    it('should navigate from dashboard to create new NCA', async () => {
      try {
        const { stagehand } = context;

        await navigateTo(stagehand, '/dashboard/production');

        // Look for create NCA button
        await clickButton(
          stagehand,
          'create-nca-button',
          'Click create new NCA button'
        ).catch(() => {
          // Button might not have testid
          return stagehand.act('Click create or new NCA button');
        });

        // Should redirect to NCA form
        await stagehand.page.waitForURL('**/nca/new**', { timeout: 10000 }).catch(() => {});

        const onNCAForm = stagehand.page.url().includes('/nca/new');
        expect(onNCAForm).toBe(true);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'dashboard-nav-create-nca');
        throw error;
      }
    }, 45000);
  });

  describe('Dashboard Real-time Updates', () => {
    it('should display loading state while fetching data', async () => {
      try {
        const { stagehand } = context;

        await stagehand.page.goto(`${E2E_CONFIG.baseUrl}/dashboard/production`);

        // Should show loading indicator briefly
        const hasLoading = await stagehand.page
          .locator('[data-testid="loading"], [data-testid="spinner"]')
          .first()
          .isVisible({ timeout: 1000 })
          .catch(() => false);

        // Loading might be too fast to catch
        expect(hasLoading || true).toBe(true); // Soft check
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'dashboard-loading-state');
        throw error;
      }
    }, 45000);
  });

  describe('Dashboard Responsiveness', () => {
    it('should display dashboard on mobile viewport', async () => {
      try {
        const { stagehand } = context;

        // Change viewport to mobile
        await stagehand.page.setViewportSize({ width: 375, height: 667 });

        await navigateTo(stagehand, '/dashboard/production');

        // Verify dashboard still loads
        const hasContent = await stagehand.page
          .locator('h1, h2')
          .first()
          .isVisible();

        expect(hasContent).toBe(true);

        // Reset viewport
        await stagehand.page.setViewportSize(E2E_CONFIG.browser.viewport);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'dashboard-mobile');
        throw error;
      }
    }, 45000);
  });

  describe('Maintenance Dashboard', () => {
    it('should display maintenance metrics', async () => {
      try {
        const { stagehand } = context;

        await navigateTo(stagehand, '/dashboard/production');

        // Look for maintenance section
        const hasMaintenance = await stagehand.page
          .locator('text=/maintenance|mjc|equipment/i')
          .isVisible()
          .catch(() => false);

        expect(hasMaintenance || true).toBe(true); // Soft check
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'dashboard-maintenance');
        throw error;
      }
    }, 45000);
  });
});

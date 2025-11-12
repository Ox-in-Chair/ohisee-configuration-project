/**
 * Authentication Workflow E2E Tests
 *
 * Tests login, logout, session persistence, and unauthorized access handling.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createTestContext, destroyTestContext, setupTestUser, captureFailureScreenshot, type TestContext } from '../fixtures';
import { login, logout, navigateTo, isElementVisible } from '../helpers';
import { E2E_CONFIG } from '../config';

describe('Authentication Workflows', () => {
  let context: TestContext;

  beforeEach(async () => {
    context = await createTestContext();
  });

  afterEach(async () => {
    await destroyTestContext(context);
  });

  describe('Login Flow', () => {
    it('should successfully log in with valid credentials', async () => {
      try {
        const { stagehand } = context;

        // Use test operator credentials
        const testUser = E2E_CONFIG.testUsers.operator;

        await login(stagehand, testUser.email, testUser.password);

        // Verify redirect to dashboard
        expect(stagehand.page.url()).toContain('/dashboard');

        // Verify user is logged in (check for user menu or logout button)
        const isLoggedIn = await isElementVisible(stagehand, 'user-menu')
          .catch(() => isElementVisible(stagehand, 'logout-button'));

        expect(isLoggedIn).toBe(true);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'login-success');
        throw error;
      }
    }, 30000);

    it('should show error message with invalid credentials', async () => {
      try {
        const { stagehand } = context;

        await navigateTo(stagehand, '/login');

        // Attempt login with invalid credentials
        await login(stagehand, 'invalid@example.com', 'wrongpassword');

        // Should still be on login page
        expect(stagehand.page.url()).toContain('/login');

        // Check for error message
        const hasError = await isElementVisible(stagehand, 'error-message')
          .catch(() => stagehand.page.locator('text=/invalid|error|incorrect/i').isVisible());

        expect(hasError).toBe(true);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'login-invalid-credentials');
        throw error;
      }
    }, 30000);

    it('should require both email and password', async () => {
      try {
        const { stagehand } = context;

        await navigateTo(stagehand, '/login');

        // Try to submit empty form
        await stagehand.act('Click the login button');

        // Should show validation errors
        const hasValidationError = await stagehand.page
          .locator('text=/required|fill|enter/i')
          .isVisible()
          .catch(() => false);

        expect(hasValidationError).toBe(true);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'login-validation');
        throw error;
      }
    }, 30000);
  });

  describe('Logout Flow', () => {
    it('should successfully log out and redirect to login page', async () => {
      try {
        const { stagehand } = context;

        // First log in
        const testUser = E2E_CONFIG.testUsers.operator;
        await login(stagehand, testUser.email, testUser.password);

        // Then log out
        await logout(stagehand);

        // Verify redirect to login page
        expect(stagehand.page.url()).toContain('/login');

        // Verify logout was successful (user menu should not be visible)
        const isLoggedIn = await isElementVisible(stagehand, 'user-menu').catch(() => false);
        expect(isLoggedIn).toBe(false);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'logout-success');
        throw error;
      }
    }, 30000);
  });

  describe('Session Persistence', () => {
    it('should maintain session after page reload', async () => {
      try {
        const { stagehand } = context;

        // Log in
        const testUser = E2E_CONFIG.testUsers.operator;
        await login(stagehand, testUser.email, testUser.password);

        // Reload page
        await stagehand.page.reload();

        // Should still be logged in
        expect(stagehand.page.url()).not.toContain('/login');

        const isLoggedIn = await isElementVisible(stagehand, 'user-menu')
          .catch(() => isElementVisible(stagehand, 'logout-button'));

        expect(isLoggedIn).toBe(true);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'session-persistence');
        throw error;
      }
    }, 30000);

    it('should maintain session across navigation', async () => {
      try {
        const { stagehand } = context;

        // Log in
        const testUser = E2E_CONFIG.testUsers.operator;
        await login(stagehand, testUser.email, testUser.password);

        // Navigate to different pages
        await navigateTo(stagehand, '/nca/register');
        await navigateTo(stagehand, '/mjc/register');
        await navigateTo(stagehand, '/dashboard/production');

        // Should still be logged in on each page
        const isLoggedIn = await isElementVisible(stagehand, 'user-menu')
          .catch(() => isElementVisible(stagehand, 'logout-button'));

        expect(isLoggedIn).toBe(true);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'session-navigation');
        throw error;
      }
    }, 45000);
  });

  describe('Unauthorized Access', () => {
    it('should redirect to login when accessing protected routes without auth', async () => {
      try {
        const { stagehand } = context;

        // Try to access protected route without logging in
        await navigateTo(stagehand, '/nca/new');

        // Should redirect to login
        await stagehand.page.waitForURL('**/login**', { timeout: 10000 });
        expect(stagehand.page.url()).toContain('/login');
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'unauthorized-redirect');
        throw error;
      }
    }, 30000);

    it('should restrict access based on user role', async () => {
      try {
        const { stagehand } = context;

        // Log in as operator (limited permissions)
        const testUser = E2E_CONFIG.testUsers.operator;
        await login(stagehand, testUser.email, testUser.password);

        // Try to access management dashboard (requires higher role)
        await navigateTo(stagehand, '/dashboard/management');

        // Should show access denied or redirect
        const hasAccessDenied = await stagehand.page
          .locator('text=/access denied|unauthorized|permission/i')
          .isVisible()
          .catch(() => false);

        const redirectedAway = !stagehand.page.url().includes('/dashboard/management');

        expect(hasAccessDenied || redirectedAway).toBe(true);
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'role-based-access');
        throw error;
      }
    }, 30000);
  });

  describe('Role-Based Login', () => {
    it('should log in as team leader and access appropriate features', async () => {
      try {
        const { stagehand } = context;

        const testUser = E2E_CONFIG.testUsers.teamLeader;
        await login(stagehand, testUser.email, testUser.password);

        // Team leader should access concession approval
        await navigateTo(stagehand, '/nca/register');

        // Verify page loaded successfully
        expect(stagehand.page.url()).toContain('/nca/register');
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'team-leader-login');
        throw error;
      }
    }, 30000);

    it('should log in as QA supervisor and access quality features', async () => {
      try {
        const { stagehand } = context;

        const testUser = E2E_CONFIG.testUsers.qaSupervisor;
        await login(stagehand, testUser.email, testUser.password);

        // QA supervisor should access quality dashboards
        await navigateTo(stagehand, '/dashboard/production');

        // Verify page loaded successfully
        expect(stagehand.page.url()).toContain('/dashboard');
      } catch (error) {
        await captureFailureScreenshot(context.stagehand, 'qa-supervisor-login');
        throw error;
      }
    }, 30000);
  });
});

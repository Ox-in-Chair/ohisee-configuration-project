/**
 * E2E Test Helpers
 *
 * Shared utilities for Stagehand browser automation tests.
 * Implements hybrid selector strategy: data-testid → AI fallback
 */

import { Stagehand } from '@browserbasehq/stagehand';
import { E2E_CONFIG, SELECTOR_STRATEGY } from './config';
import type { TestUser } from './fixtures';

/**
 * Navigate to a route
 */
export async function navigateTo(stagehand: Stagehand, path: string): Promise<void> {
  const url = `${E2E_CONFIG.baseUrl}${path}`;
  await stagehand.page.goto(url);
  await waitForLoadingComplete(stagehand);
}

/**
 * Wait for loading spinners/skeletons to disappear
 */
export async function waitForLoadingComplete(stagehand: Stagehand): Promise<void> {
  // Wait for common loading indicators to disappear
  await stagehand.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
    // Ignore timeout - page might be ready even if not network idle
  });

  // Wait for any loading spinners to disappear
  const loadingSelectors = [
    '[data-testid="loading"]',
    '[data-testid="spinner"]',
    '.loading',
    '.spinner',
  ];

  for (const selector of loadingSelectors) {
    const element = await stagehand.page.locator(selector).first();
    if (await element.isVisible().catch(() => false)) {
      await element.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {
        // Ignore timeout
      });
    }
  }
}

/**
 * Find element by data-testid with AI fallback
 *
 * Strategy:
 * 1. Try data-testid first (fast, reliable)
 * 2. If not found after timeout, use AI-powered detection
 */
export async function findElementBy(
  stagehand: Stagehand,
  testId: string,
  aiDescription?: string
) {
  if (SELECTOR_STRATEGY.preferTestId) {
    // Try data-testid first
    const selector = `[data-testid="${testId}"]`;
    const element = stagehand.page.locator(selector).first();

    try {
      await element.waitFor({
        state: 'visible',
        timeout: SELECTOR_STRATEGY.aiAfterTimeout,
      });
      return element;
    } catch (error) {
      // Element not found by testid, try AI fallback
      if (aiDescription && E2E_CONFIG.stagehand.enableAI) {
        console.log(
          `data-testid="${testId}" not found, using AI fallback: "${aiDescription}"`
        );
        // Stagehand will use AI to find the element
        await stagehand.act(aiDescription);
        return null; // Act performs action directly
      }
      throw error;
    }
  }

  // If AI-first strategy (not recommended)
  if (aiDescription && E2E_CONFIG.stagehand.enableAI) {
    await stagehand.act(aiDescription);
    return null;
  }

  throw new Error(`Element not found: ${testId}`);
}

/**
 * Type text into input field with AI fallback
 */
export async function typeIntoField(
  stagehand: Stagehand,
  testId: string,
  value: string,
  aiDescription?: string
): Promise<void> {
  const element = await findElementBy(stagehand, testId, aiDescription);

  if (element) {
    await element.click();
    await element.fill(value);
  } else {
    // AI already performed the action
    await stagehand.page.keyboard.type(value);
  }
}

/**
 * Click button with AI fallback
 */
export async function clickButton(
  stagehand: Stagehand,
  testId: string,
  aiDescription?: string
): Promise<void> {
  const element = await findElementBy(stagehand, testId, aiDescription);

  if (element) {
    await element.click();
  }
  // If AI fallback was used, act() already clicked
}

/**
 * Select radio button option
 */
export async function selectRadio(
  stagehand: Stagehand,
  testId: string,
  aiDescription?: string
): Promise<void> {
  const element = await findElementBy(stagehand, testId, aiDescription);

  if (element) {
    await element.click();
  }
}

/**
 * Check/uncheck checkbox
 */
export async function toggleCheckbox(
  stagehand: Stagehand,
  testId: string,
  checked: boolean,
  aiDescription?: string
): Promise<void> {
  const element = await findElementBy(stagehand, testId, aiDescription);

  if (element) {
    const isChecked = await element.isChecked();
    if (isChecked !== checked) {
      await element.click();
    }
  }
}

/**
 * Select option from dropdown
 */
export async function selectFromDropdown(
  stagehand: Stagehand,
  testId: string,
  value: string,
  aiDescription?: string
): Promise<void> {
  const element = await findElementBy(stagehand, testId, aiDescription);

  if (element) {
    await element.click();
    // Wait for dropdown to open
    await stagehand.page.waitForTimeout(500);

    // Find and click the option
    const optionSelector = `[role="option"][data-value="${value}"]`;
    await stagehand.page.locator(optionSelector).click();
  }
}

/**
 * Wait for element to be visible
 */
export async function waitForElement(
  stagehand: Stagehand,
  testId: string,
  timeout: number = SELECTOR_STRATEGY.elementTimeout
): Promise<void> {
  const selector = `[data-testid="${testId}"]`;
  await stagehand.page.locator(selector).waitFor({
    state: 'visible',
    timeout,
  });
}

/**
 * Check if element exists and is visible
 */
export async function isElementVisible(
  stagehand: Stagehand,
  testId: string
): Promise<boolean> {
  const selector = `[data-testid="${testId}"]`;
  const element = stagehand.page.locator(selector).first();
  return await element.isVisible().catch(() => false);
}

/**
 * Get text content from element
 */
export async function getElementText(
  stagehand: Stagehand,
  testId: string
): Promise<string> {
  const selector = `[data-testid="${testId}"]`;
  const element = stagehand.page.locator(selector).first();
  return (await element.textContent()) || '';
}

/**
 * Login workflow
 */
export async function login(
  stagehand: Stagehand,
  email: string,
  password: string
): Promise<void> {
  // Navigate to login page
  await navigateTo(stagehand, '/login');

  // Fill in credentials
  await typeIntoField(
    stagehand,
    'email-input',
    email,
    'Type email in the email field'
  );

  await typeIntoField(
    stagehand,
    'password-input',
    password,
    'Type password in the password field'
  );

  // Click login button
  await clickButton(
    stagehand,
    'login-button',
    'Click the login button'
  );

  // Wait for redirect to dashboard
  await stagehand.page.waitForURL('**/dashboard/**', { timeout: 10000 });
  await waitForLoadingComplete(stagehand);
}

/**
 * Logout workflow
 */
export async function logout(stagehand: Stagehand): Promise<void> {
  // Try to find logout button
  await clickButton(
    stagehand,
    'logout-button',
    'Click the logout button'
  );

  // Wait for redirect to login
  await stagehand.page.waitForURL('**/login', { timeout: 5000 }).catch(() => {
    // Might already be on login page
  });
}

/**
 * Create NCA workflow helper
 */
export async function createNCA(
  stagehand: Stagehand,
  ncaData: {
    supplierName?: string;
    productDescription?: string;
    ncDescription: string;
    ncType?: string;
    origin?: string;
  }
): Promise<string> {
  // Navigate to NCA form
  await navigateTo(stagehand, '/nca/new');

  // Fill Section 2: NC Details
  if (ncaData.ncType) {
    await selectRadio(
      stagehand,
      `nc-type-${ncaData.ncType}`,
      `Select ${ncaData.ncType} as non-conformance type`
    );
  }

  if (ncaData.origin) {
    await selectRadio(
      stagehand,
      `nc-origin-${ncaData.origin}`,
      `Select ${ncaData.origin} as origin`
    );
  }

  // Fill Section 3: Product/Supplier Details
  if (ncaData.supplierName) {
    await typeIntoField(
      stagehand,
      'supplier-name',
      ncaData.supplierName,
      'Type supplier name'
    );
  }

  if (ncaData.productDescription) {
    await typeIntoField(
      stagehand,
      'nc-product-description',
      ncaData.productDescription,
      'Type product description'
    );
  }

  // Fill Section 4: NC Description (required)
  await typeIntoField(
    stagehand,
    'nc-description',
    ncaData.ncDescription,
    'Type non-conformance description'
  );

  // Wait for AI quality analysis
  await stagehand.page.waitForTimeout(6000);

  // Submit form
  await clickButton(
    stagehand,
    'btn-submit',
    'Click the submit button'
  );

  // Wait for success and redirect
  await stagehand.page.waitForURL('**/nca/**', { timeout: 15000 });

  // Extract NCA ID from URL
  const url = stagehand.page.url();
  const match = url.match(/\/nca\/([a-f0-9-]+)/);
  return match ? match[1] : '';
}

/**
 * Create MJC workflow helper
 */
export async function createMJC(
  stagehand: Stagehand,
  mjcData: {
    machineId?: string;
    description: string;
    workPerformed?: string;
  }
): Promise<string> {
  // Navigate to MJC form
  await navigateTo(stagehand, '/mjc/new');

  // Fill machine selection if provided
  if (mjcData.machineId) {
    await selectFromDropdown(
      stagehand,
      'machine-select',
      mjcData.machineId,
      'Select machine from dropdown'
    );
  }

  // Fill description
  await typeIntoField(
    stagehand,
    'mjc-description',
    mjcData.description,
    'Type maintenance job description'
  );

  if (mjcData.workPerformed) {
    await typeIntoField(
      stagehand,
      'work-performed',
      mjcData.workPerformed,
      'Type work performed details'
    );
  }

  // Submit form
  await clickButton(
    stagehand,
    'btn-submit',
    'Click the submit button'
  );

  // Wait for success and redirect
  await stagehand.page.waitForURL('**/mjc/**', { timeout: 15000 });

  // Extract MJC ID from URL
  const url = stagehand.page.url();
  const match = url.match(/\/mjc\/([a-f0-9-]+)/);
  return match ? match[1] : '';
}

/**
 * Verify element contains text
 */
export async function verifyTextContent(
  stagehand: Stagehand,
  testId: string,
  expectedText: string
): Promise<boolean> {
  const text = await getElementText(stagehand, testId);
  return text.includes(expectedText);
}

/**
 * Wait for toast notification
 */
export async function waitForToast(
  stagehand: Stagehand,
  expectedMessage?: string
): Promise<void> {
  const toastSelector = '[data-testid="toast"], [role="status"], .toast';
  await stagehand.page.locator(toastSelector).first().waitFor({
    state: 'visible',
    timeout: 5000,
  });

  if (expectedMessage) {
    const text = await stagehand.page.locator(toastSelector).first().textContent();
    if (!text?.includes(expectedMessage)) {
      throw new Error(`Toast message "${text}" does not contain "${expectedMessage}"`);
    }
  }
}

/**
 * Stagehand E2E Tests for MJC Register Interactions
 * Tests filtering, sorting, and search functionality using natural language
 *
 * TDD Approach: These tests are written FIRST and should FAIL initially
 * until the filtering/sorting/search features are implemented.
 */

import { test, expect } from '@playwright/test';
import Stagehand from '@browserbasehq/stagehand';
import { z } from 'zod';

// Test data setup - mock MJCs for testing
const mockMJCs = [
  {
    mjc_number: 'MJC-2025-001',
    machine_equipment_id: 'BAGGING-LINE-01',
    maintenance_description: 'Conveyor belt slipping causing production delays',
    urgency_level: 'high',
    machine_status: 'operational',
    maintenance_type: 'mechanical',
    temporary_repair: 'no',
    status: 'open',
    created_at: '2025-01-10T10:30:00',
  },
  {
    mjc_number: 'MJC-2025-002',
    machine_equipment_id: 'FILLING-MACHINE-03',
    maintenance_description: 'Preventive maintenance for hydraulic system',
    urgency_level: 'low',
    machine_status: 'operational',
    maintenance_type: 'pneumatical',
    temporary_repair: 'no',
    status: 'in_progress',
    created_at: '2025-01-11T14:15:00',
  },
  {
    mjc_number: 'MJC-2025-003',
    machine_equipment_id: 'SEALING-UNIT-02',
    maintenance_description: 'Emergency repair - seal broken, temporary fix applied',
    urgency_level: 'critical',
    machine_status: 'down',
    maintenance_type: 'mechanical',
    temporary_repair: 'yes',
    status: 'completed',
    created_at: '2025-01-12T08:45:00',
  },
];

test.describe('MJC Register Interactions - Stagehand E2E', () => {
  let stagehand: any;

  test.beforeEach(async ({ page }) => {
    // Initialize Stagehand with LOCAL environment
    stagehand = new Stagehand({
      env: 'LOCAL',
      verbose: 1,
      debugDom: true,
    });

    await stagehand.init();
    const stagehandPage = stagehand.page;

    // Navigate to MJC register page
    await stagehandPage.goto('http://localhost:3008/mjc/register');

    // Wait for page to load
    await stagehandPage.act('wait for the MJC register table to load');
  });

  test.afterEach(async () => {
    await stagehand.close();
  });

  test('filter MJCs to show only high urgency items', async () => {
    const page = stagehand.page;

    // Use natural language to interact with urgency filter
    await page.act('filter MJCs to show only those with high urgency');

    // Extract filtered results to verify
    const filteredData = await page.extract({
      instruction: 'get all visible MJC entries with their urgency levels',
      schema: z.object({
        mjcs: z.array(
          z.object({
            mjc_number: z.string(),
            urgency_level: z.string(),
          })
        ),
      }),
    });

    // Verify all visible MJCs have high urgency
    expect(filteredData.mjcs.every((mjc) => mjc.urgency_level === 'high')).toBe(true);
    expect(filteredData.mjcs.length).toBeGreaterThan(0);
  });

  test('search for specific MJC number', async () => {
    const page = stagehand.page;

    // Use natural language to search
    await page.act('search for MJC number MJC-2025-001');

    // Verify search results
    const searchResults = await page.extract({
      instruction: 'get the MJC number displayed in the search results',
      schema: z.object({
        mjc_number: z.string(),
      }),
    });

    expect(searchResults.mjc_number).toContain('MJC-2025-001');
  });

  test('show only preventive maintenance jobs', async () => {
    const page = stagehand.page;

    // Filter by maintenance type
    await page.act('show only preventive maintenance jobs');

    // Verify results
    const results = await page.extract({
      instruction: 'get all visible MJC descriptions',
      schema: z.object({
        descriptions: z.array(z.string()),
      }),
    });

    // Check that results contain preventive maintenance
    expect(
      results.descriptions.some((desc) => desc.toLowerCase().includes('preventive'))
    ).toBe(true);
  });

  test('filter to show only temporary repairs', async () => {
    const page = stagehand.page;

    // Use natural language to filter temporary repairs
    await page.act('filter to show only temporary repairs');

    // Verify all visible items are temporary repairs
    const filteredData = await page.extract({
      instruction: 'get all visible MJC entries and check if they are temporary repairs',
      schema: z.object({
        mjcs: z.array(
          z.object({
            mjc_number: z.string(),
            temporary_repair: z.boolean(),
          })
        ),
      }),
    });

    expect(filteredData.mjcs.every((mjc) => mjc.temporary_repair === true)).toBe(true);
    expect(filteredData.mjcs.length).toBeGreaterThan(0);
  });

  test('sort MJCs by urgency level', async () => {
    const page = stagehand.page;

    // Sort by urgency
    await page.act('sort MJCs by urgency level from highest to lowest');

    // Extract sorted data
    const sortedData = await page.extract({
      instruction: 'get all MJC entries with their urgency levels in order',
      schema: z.object({
        mjcs: z.array(
          z.object({
            mjc_number: z.string(),
            urgency_level: z.string(),
          })
        ),
      }),
    });

    // Verify sort order (critical > high > medium > low)
    const urgencyOrder = ['critical', 'high', 'medium', 'low'];
    let lastIndex = -1;

    for (const mjc of sortedData.mjcs) {
      const currentIndex = urgencyOrder.indexOf(mjc.urgency_level);
      expect(currentIndex).toBeGreaterThanOrEqual(lastIndex);
      lastIndex = currentIndex;
    }
  });

  test('clear all filters and show all MJCs', async () => {
    const page = stagehand.page;

    // Apply multiple filters first
    await page.act('filter to show only high urgency MJCs');
    await page.act('filter to show only temporary repairs');

    // Extract filtered count
    const filteredData = await page.extract({
      instruction: 'count how many MJCs are visible',
      schema: z.object({
        count: z.number(),
      }),
    });

    // Clear all filters
    await page.act('clear all filters');

    // Extract total count after clearing
    const allData = await page.extract({
      instruction: 'count how many MJCs are visible now',
      schema: z.object({
        count: z.number(),
      }),
    });

    // Verify more items visible after clearing filters
    expect(allData.count).toBeGreaterThan(filteredData.count);
  });

  test('combine multiple filters - status and urgency', async () => {
    const page = stagehand.page;

    // Apply multiple filters using natural language
    await page.act('show only open MJCs with critical urgency');

    // Verify combined filters work
    const results = await page.extract({
      instruction: 'get all visible MJC entries with their status and urgency',
      schema: z.object({
        mjcs: z.array(
          z.object({
            mjc_number: z.string(),
            status: z.string(),
            urgency_level: z.string(),
          })
        ),
      }),
    });

    // All results should match both criteria
    expect(
      results.mjcs.every((mjc) => mjc.status === 'open' && mjc.urgency_level === 'critical')
    ).toBe(true);
  });

  test('search across multiple fields - machine and description', async () => {
    const page = stagehand.page;

    // Search for text that could be in machine ID or description
    await page.act('search for "conveyor"');

    // Verify search works across fields
    const results = await page.extract({
      instruction: 'get all visible MJC entries with machine ID and description',
      schema: z.object({
        mjcs: z.array(
          z.object({
            mjc_number: z.string(),
            machine_equipment_id: z.string(),
            maintenance_description: z.string(),
          })
        ),
      }),
    });

    // At least one result should contain "conveyor" in machine ID or description
    expect(
      results.mjcs.some(
        (mjc) =>
          mjc.machine_equipment_id.toLowerCase().includes('conveyor') ||
          mjc.maintenance_description.toLowerCase().includes('conveyor')
      )
    ).toBe(true);
  });

  test('filter by machine status - show only machines down', async () => {
    const page = stagehand.page;

    // Filter by machine status
    await page.act('show only MJCs where the machine is down');

    // Verify results
    const results = await page.extract({
      instruction: 'get all visible MJC entries with their machine status',
      schema: z.object({
        mjcs: z.array(
          z.object({
            mjc_number: z.string(),
            machine_status: z.string(),
          })
        ),
      }),
    });

    expect(results.mjcs.every((mjc) => mjc.machine_status === 'down')).toBe(true);
  });

  test('sort by date - newest first', async () => {
    const page = stagehand.page;

    // Sort by creation date
    await page.act('sort MJCs to show newest first');

    // Extract sorted dates
    const results = await page.extract({
      instruction: 'get all MJC entries with their creation dates in order',
      schema: z.object({
        mjcs: z.array(
          z.object({
            mjc_number: z.string(),
            created_at: z.string(),
          })
        ),
      }),
    });

    // Verify dates are in descending order
    for (let i = 0; i < results.mjcs.length - 1; i++) {
      const date1 = new Date(results.mjcs[i].created_at);
      const date2 = new Date(results.mjcs[i + 1].created_at);
      expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
    }
  });

  test('debounced search - verify search waits for user to finish typing', async () => {
    const page = stagehand.page;

    // Type slowly to test debouncing
    await page.act('type "MJC" in the search box and wait 100 milliseconds');

    // Search should not have executed yet (300ms debounce)
    await page.observe('search has not executed yet');

    // Wait for debounce to complete
    await page.act('wait for 300 milliseconds');

    // Now search should execute
    const results = await page.extract({
      instruction: 'check if search results are now visible',
      schema: z.object({
        hasResults: z.boolean(),
      }),
    });

    expect(results.hasResults).toBe(true);
  });

  test('filter persistence - filters remain after page interactions', async () => {
    const page = stagehand.page;

    // Apply filter
    await page.act('filter to show only high urgency MJCs');

    // Click on an MJC to view details (if implemented)
    await page.act('click on the first MJC in the list');

    // Go back to register
    await page.act('navigate back to the MJC register');

    // Verify filter is still applied
    const results = await page.extract({
      instruction: 'get all visible MJC entries with their urgency levels',
      schema: z.object({
        mjcs: z.array(
          z.object({
            urgency_level: z.string(),
          })
        ),
      }),
    });

    expect(results.mjcs.every((mjc) => mjc.urgency_level === 'high')).toBe(true);
  });

  test('empty state - show appropriate message when no results', async () => {
    const page = stagehand.page;

    // Apply very restrictive filters that should return no results
    await page.act('filter to show MJCs with critical urgency and completed status and temporary repair yes');

    // Check for empty state message
    const emptyState = await page.extract({
      instruction: 'check if there is a "no results" or "no MJCs found" message',
      schema: z.object({
        hasEmptyMessage: z.boolean(),
        message: z.string().optional(),
      }),
    });

    expect(emptyState.hasEmptyMessage).toBe(true);
  });

  test('accessibility - filters are keyboard navigable', async () => {
    const page = stagehand.page;

    // Test keyboard navigation
    await page.act('use tab key to navigate to the urgency filter dropdown');
    await page.act('press enter to open the dropdown');
    await page.act('use arrow keys to select "high" urgency');
    await page.act('press enter to confirm selection');

    // Verify filter was applied via keyboard
    const results = await page.extract({
      instruction: 'get the current urgency filter value',
      schema: z.object({
        urgency: z.string(),
      }),
    });

    expect(results.urgency).toBe('high');
  });
});

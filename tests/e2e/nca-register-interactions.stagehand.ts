/**
 * NCA Register Interactions - Stagehand E2E Tests
 *
 * Tests filtering, sorting, and search interactions using natural language
 * Following strict TDD: These tests MUST fail until implementation exists
 *
 * @requires @browserbasehq/stagehand v3.0.1+
 * @requires OpenAI API key in OPENAI_API_KEY environment variable
 */

import { test, expect } from '@playwright/test';
import Stagehand from '@browserbasehq/stagehand';
import { z } from 'zod';

// Test configuration
const TEST_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3008';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required for Stagehand tests');
}

/**
 * Schema for extracting NCA table data
 */
const NCATableDataSchema = z.object({
  totalRows: z.number(),
  visibleRows: z.number(),
  firstNCANumber: z.string().optional(),
  statuses: z.array(z.string()),
});

const NCARowSchema = z.object({
  ncaNumber: z.string(),
  status: z.string(),
  ncType: z.string(),
  description: z.string(),
  createdAt: z.string(),
});

/**
 * Test Suite: NCA Register Filter Interactions
 */
test.describe('NCA Register - Filter Interactions', () => {
  let stagehand: any;

  test.beforeEach(async () => {
    stagehand = new Stagehand({
      env: 'LOCAL',
      modelName: 'gpt-4o',
      modelClientOptions: {
        apiKey: OPENAI_API_KEY,
      },
      verbose: 1,
    });

    await stagehand.init();
    const page = stagehand.page;
    await page.goto(`${TEST_URL}/nca-register`);
  });

  test.afterEach(async () => {
    if (stagehand) {
      await stagehand.close();
    }
  });

  test('should filter NCAs by status - Open', async () => {
    const page = stagehand.page;

    // Natural language interaction - filter by Open status
    await page.act('Filter the NCAs to show only open status');

    // Extract table data to verify filtering
    const tableData = await page.extract({
      instruction: 'Extract the NCA table data including total rows, visible rows, and statuses',
      schema: NCATableDataSchema,
    });

    // Verify only "open" status NCAs are shown
    expect(tableData.statuses.every((status: string) =>
      status.toLowerCase() === 'open'
    )).toBe(true);

    expect(tableData.visibleRows).toBeGreaterThan(0);
  });

  test('should filter NCAs by status - Closed', async () => {
    const page = stagehand.page;

    await page.act('Filter the NCAs to show only closed status');

    const tableData = await page.extract({
      instruction: 'Get the statuses of all visible NCAs in the table',
      schema: z.object({
        statuses: z.array(z.string()),
      }),
    });

    expect(tableData.statuses.every((status: string) =>
      status.toLowerCase() === 'closed'
    )).toBe(true);
  });

  test('should filter NCAs by status - Investigation', async () => {
    const page = stagehand.page;

    await page.act('Filter the NCAs to show only investigation status');

    const tableData = await page.extract({
      instruction: 'Get the statuses shown in the NCA table',
      schema: z.object({
        statuses: z.array(z.string()),
        count: z.number(),
      }),
    });

    expect(tableData.statuses.every((status: string) =>
      status.toLowerCase() === 'investigation'
    )).toBe(true);
  });

  test('should show all NCAs when filter is set to "All"', async () => {
    const page = stagehand.page;

    // First apply a filter
    await page.act('Filter the NCAs to show only open status');

    // Then clear to show all
    await page.act('Change the filter to show all NCAs');

    const tableData = await page.extract({
      instruction: 'Get the total number of NCAs and their statuses',
      schema: z.object({
        totalRows: z.number(),
        statuses: z.array(z.string()),
      }),
    });

    // Should have multiple different statuses (not filtered)
    const uniqueStatuses = [...new Set(tableData.statuses.map(s => s.toLowerCase()))];
    expect(uniqueStatuses.length).toBeGreaterThan(1);
  });

  test('should clear all filters using clear filters button', async () => {
    const page = stagehand.page;

    // Apply filter and search
    await page.act('Filter the NCAs to show only open status');
    await page.act('Search for NCA with number NCA-2025');

    // Clear all filters
    await page.act('Clear all filters and show all NCAs');

    const tableData = await page.extract({
      instruction: 'Get the search input value and filter selection',
      schema: z.object({
        searchValue: z.string(),
        filterValue: z.string(),
      }),
    });

    expect(tableData.searchValue).toBe('');
    expect(tableData.filterValue.toLowerCase()).toContain('all');
  });
});

/**
 * Test Suite: NCA Register Search Interactions
 */
test.describe('NCA Register - Search Interactions', () => {
  let stagehand: any;

  test.beforeEach(async () => {
    stagehand = new Stagehand({
      env: 'LOCAL',
      modelName: 'gpt-4o',
      modelClientOptions: {
        apiKey: OPENAI_API_KEY,
      },
      verbose: 1,
    });

    await stagehand.init();
    const page = stagehand.page;
    await page.goto(`${TEST_URL}/nca-register`);
  });

  test.afterEach(async () => {
    if (stagehand) {
      await stagehand.close();
    }
  });

  test('should search for NCA by number', async () => {
    const page = stagehand.page;

    await page.act('Search for NCA number NCA-2025-001');

    const tableData = await page.extract({
      instruction: 'Get the NCA numbers visible in the table',
      schema: z.object({
        ncaNumbers: z.array(z.string()),
        count: z.number(),
      }),
    });

    // Should filter to matching NCA numbers
    expect(tableData.ncaNumbers.some((num: string) =>
      num.includes('NCA-2025-001')
    )).toBe(true);

    // Should have fewer rows than total
    expect(tableData.count).toBeLessThanOrEqual(10);
  });

  test('should search across NCA description', async () => {
    const page = stagehand.page;

    await page.act('Search for NCAs with "defect" in the description');

    const tableData = await page.extract({
      instruction: 'Get the descriptions of visible NCAs',
      schema: z.object({
        descriptions: z.array(z.string()),
      }),
    });

    // At least one description should contain "defect"
    expect(tableData.descriptions.some((desc: string) =>
      desc.toLowerCase().includes('defect')
    )).toBe(true);
  });

  test('should handle search with no results', async () => {
    const page = stagehand.page;

    await page.act('Search for NCA number NONEXISTENT-9999');

    const tableData = await page.extract({
      instruction: 'Get the count of visible NCAs and any no results message',
      schema: z.object({
        rowCount: z.number(),
        noResultsMessage: z.string().optional(),
      }),
    });

    expect(tableData.rowCount).toBe(0);
    expect(tableData.noResultsMessage).toBeDefined();
  });

  test('should debounce search input (performance)', async () => {
    const page = stagehand.page;

    // Type quickly (should debounce)
    await page.act('Type "NCA" in the search box');

    // Wait a moment
    await page.waitForTimeout(400); // Debounce is 300ms

    const tableData = await page.extract({
      instruction: 'Get the search input value',
      schema: z.object({
        searchValue: z.string(),
      }),
    });

    expect(tableData.searchValue).toBe('NCA');
  });
});

/**
 * Test Suite: NCA Register Sort Interactions
 */
test.describe('NCA Register - Sort Interactions', () => {
  let stagehand: any;

  test.beforeEach(async () => {
    stagehand = new Stagehand({
      env: 'LOCAL',
      modelName: 'gpt-4o',
      modelClientOptions: {
        apiKey: OPENAI_API_KEY,
      },
      verbose: 1,
    });

    await stagehand.init();
    const page = stagehand.page;
    await page.goto(`${TEST_URL}/nca-register`);
  });

  test.afterEach(async () => {
    if (stagehand) {
      await stagehand.close();
    }
  });

  test('should sort table by created date descending', async () => {
    const page = stagehand.page;

    await page.act('Sort the table by created date descending (newest first)');

    const tableData = await page.extract({
      instruction: 'Get the created dates of the first 5 NCAs in order',
      schema: z.object({
        dates: z.array(z.string()),
      }),
    });

    // Verify dates are in descending order
    const parsedDates = tableData.dates.map((d: string) => new Date(d).getTime());
    for (let i = 0; i < parsedDates.length - 1; i++) {
      expect(parsedDates[i]).toBeGreaterThanOrEqual(parsedDates[i + 1]);
    }
  });

  test('should sort table by created date ascending', async () => {
    const page = stagehand.page;

    await page.act('Sort the table by created date ascending (oldest first)');

    const tableData = await page.extract({
      instruction: 'Get the created dates of the first 5 NCAs',
      schema: z.object({
        dates: z.array(z.string()),
      }),
    });

    // Verify dates are in ascending order
    const parsedDates = tableData.dates.map((d: string) => new Date(d).getTime());
    for (let i = 0; i < parsedDates.length - 1; i++) {
      expect(parsedDates[i]).toBeLessThanOrEqual(parsedDates[i + 1]);
    }
  });

  test('should sort table by NCA number', async () => {
    const page = stagehand.page;

    await page.act('Sort the table by NCA number');

    const tableData = await page.extract({
      instruction: 'Get the NCA numbers of the first 5 NCAs',
      schema: z.object({
        ncaNumbers: z.array(z.string()),
      }),
    });

    // Verify NCA numbers are sorted
    const sortedNumbers = [...tableData.ncaNumbers].sort();
    expect(tableData.ncaNumbers).toEqual(sortedNumbers);
  });

  test('should sort table by status', async () => {
    const page = stagehand.page;

    await page.act('Sort the table by status');

    const tableData = await page.extract({
      instruction: 'Get the statuses of the first 5 NCAs',
      schema: z.object({
        statuses: z.array(z.string()),
      }),
    });

    // Verify statuses are sorted alphabetically
    const sortedStatuses = [...tableData.statuses].sort();
    expect(tableData.statuses).toEqual(sortedStatuses);
  });

  test('should toggle sort direction when clicking same column', async () => {
    const page = stagehand.page;

    // Sort by created date (should be descending by default)
    await page.act('Sort the table by created date');

    const firstSort = await page.extract({
      instruction: 'Get the first NCA created date',
      schema: z.object({
        firstDate: z.string(),
      }),
    });

    // Click again to reverse
    await page.act('Sort the table by created date again to reverse the order');

    const secondSort = await page.extract({
      instruction: 'Get the first NCA created date',
      schema: z.object({
        firstDate: z.string(),
      }),
    });

    // First date should be different after reversing
    expect(firstSort.firstDate).not.toBe(secondSort.firstDate);
  });
});

/**
 * Test Suite: NCA Register Row Navigation
 */
test.describe('NCA Register - Row Navigation', () => {
  let stagehand: any;

  test.beforeEach(async () => {
    stagehand = new Stagehand({
      env: 'LOCAL',
      modelName: 'gpt-4o',
      modelClientOptions: {
        apiKey: OPENAI_API_KEY,
      },
      verbose: 1,
    });

    await stagehand.init();
    const page = stagehand.page;
    await page.goto(`${TEST_URL}/nca-register`);
  });

  test.afterEach(async () => {
    if (stagehand) {
      await stagehand.close();
    }
  });

  test('should navigate to NCA detail when clicking row', async () => {
    const page = stagehand.page;

    // Get the first NCA number
    const firstNCA = await page.extract({
      instruction: 'Get the NCA number from the first row',
      schema: z.object({
        ncaNumber: z.string(),
      }),
    });

    // Click the first row
    await page.act('Click the first NCA row to view details');

    // Verify navigation occurred
    const currentUrl = page.url();
    expect(currentUrl).toContain('/nca-register/');
    expect(currentUrl).toContain(firstNCA.ncaNumber.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase());
  });

  test('should highlight row on hover', async () => {
    const page = stagehand.page;

    await page.act('Hover over the first NCA row');

    const rowState = await page.extract({
      instruction: 'Check if the first row is highlighted or has hover state',
      schema: z.object({
        isHighlighted: z.boolean(),
      }),
    });

    expect(rowState.isHighlighted).toBe(true);
  });
});

/**
 * Test Suite: Combined Filter, Search, and Sort
 */
test.describe('NCA Register - Combined Interactions', () => {
  let stagehand: any;

  test.beforeEach(async () => {
    stagehand = new Stagehand({
      env: 'LOCAL',
      modelName: 'gpt-4o',
      modelClientOptions: {
        apiKey: OPENAI_API_KEY,
      },
      verbose: 1,
    });

    await stagehand.init();
    const page = stagehand.page;
    await page.goto(`${TEST_URL}/nca-register`);
  });

  test.afterEach(async () => {
    if (stagehand) {
      await stagehand.close();
    }
  });

  test('should apply filter and search together', async () => {
    const page = stagehand.page;

    // Apply both filter and search
    await page.act('Filter to show only open NCAs');
    await page.act('Search for NCAs containing "material"');

    const results = await page.extract({
      instruction: 'Get all visible NCA statuses and descriptions',
      schema: z.object({
        statuses: z.array(z.string()),
        descriptions: z.array(z.string()),
      }),
    });

    // All should be open
    expect(results.statuses.every((s: string) => s.toLowerCase() === 'open')).toBe(true);

    // At least one should contain "material"
    expect(results.descriptions.some((d: string) =>
      d.toLowerCase().includes('material')
    )).toBe(true);
  });

  test('should apply filter, search, and sort together', async () => {
    const page = stagehand.page;

    // Apply filter, search, and sort
    await page.act('Filter to show only open NCAs');
    await page.act('Search for NCAs with "defect"');
    await page.act('Sort by created date descending');

    const results = await page.extract({
      instruction: 'Get the first 3 NCAs with status, description, and created date',
      schema: z.object({
        ncas: z.array(z.object({
          status: z.string(),
          description: z.string(),
          createdAt: z.string(),
        })),
      }),
    });

    // Verify filter: all open
    expect(results.ncas.every((nca: any) =>
      nca.status.toLowerCase() === 'open'
    )).toBe(true);

    // Verify search: contains "defect"
    expect(results.ncas.some((nca: any) =>
      nca.description.toLowerCase().includes('defect')
    )).toBe(true);

    // Verify sort: descending dates
    if (results.ncas.length > 1) {
      const dates = results.ncas.map((nca: any) => new Date(nca.createdAt).getTime());
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
      }
    }
  });

  test('should persist filter/search state during sort', async () => {
    const page = stagehand.page;

    // Apply filter and search
    await page.act('Filter to show only open NCAs');
    await page.act('Search for "2025"');

    const beforeSort = await page.extract({
      instruction: 'Get the filter and search values',
      schema: z.object({
        filterValue: z.string(),
        searchValue: z.string(),
      }),
    });

    // Sort
    await page.act('Sort by NCA number');

    const afterSort = await page.extract({
      instruction: 'Get the filter and search values',
      schema: z.object({
        filterValue: z.string(),
        searchValue: z.string(),
      }),
    });

    // Filter and search should persist
    expect(afterSort.filterValue).toBe(beforeSort.filterValue);
    expect(afterSort.searchValue).toBe(beforeSort.searchValue);
  });
});

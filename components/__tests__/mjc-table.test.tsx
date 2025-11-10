/**
 * Unit Tests for MJC Table Component
 * Tests filtering, sorting, and search logic
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MJCTable } from '../mjc-table';
import { type MJCTableData } from '@/lib/types/mjc-filter';

// Mock data for testing
const mockMJCData: MJCTableData[] = [
  {
    id: '1',
    mjc_number: 'MJC-2025-001',
    machine_equipment_id: 'BAGGING-LINE-01',
    maintenance_description: 'Conveyor belt slipping causing production delays',
    urgency_level: 'high',
    machine_status: 'operational',
    maintenance_type: 'mechanical',
    temporary_repair: 'no',
    status: 'open',
    created_at: '2025-01-10T10:30:00',
    updated_at: '2025-01-10T10:30:00',
  },
  {
    id: '2',
    mjc_number: 'MJC-2025-002',
    machine_equipment_id: 'FILLING-MACHINE-03',
    maintenance_description: 'Preventive maintenance for hydraulic system',
    urgency_level: 'low',
    machine_status: 'operational',
    maintenance_type: 'pneumatical',
    temporary_repair: 'no',
    status: 'in_progress',
    created_at: '2025-01-11T14:15:00',
    updated_at: '2025-01-11T14:15:00',
  },
  {
    id: '3',
    mjc_number: 'MJC-2025-003',
    machine_equipment_id: 'SEALING-UNIT-02',
    maintenance_description: 'Emergency repair - seal broken, temporary fix applied',
    urgency_level: 'critical',
    machine_status: 'down',
    maintenance_type: 'mechanical',
    temporary_repair: 'yes',
    status: 'completed',
    created_at: '2025-01-12T08:45:00',
    updated_at: '2025-01-12T08:45:00',
  },
];

describe('MJCTable Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders table with all MJC data', () => {
      render(<MJCTable data={mockMJCData} />);

      expect(screen.getByText('MJC-2025-001')).toBeInTheDocument();
      expect(screen.getByText('MJC-2025-002')).toBeInTheDocument();
      expect(screen.getByText('MJC-2025-003')).toBeInTheDocument();
    });

    it('displays loading state', () => {
      render(<MJCTable data={[]} isLoading={true} />);
      expect(screen.getByText('Loading MJCs...')).toBeInTheDocument();
    });

    it('displays empty state when no data', () => {
      render(<MJCTable data={[]} isLoading={false} />);
      expect(screen.getByText('No MJCs found')).toBeInTheDocument();
    });

    it('shows correct result count', () => {
      render(<MJCTable data={mockMJCData} />);
      expect(screen.getByText(/Showing 3 of 3 MJCs/i)).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('filters by MJC number', async () => {
      render(<MJCTable data={mockMJCData} />);

      const searchInput = screen.getByTestId('mjc-search-input');
      fireEvent.change(searchInput, { target: { value: 'MJC-2025-001' } });

      // Wait for debounce
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('MJC-2025-001')).toBeInTheDocument();
        expect(screen.queryByText('MJC-2025-002')).not.toBeInTheDocument();
      });
    });

    it('filters by machine ID', async () => {
      render(<MJCTable data={mockMJCData} />);

      const searchInput = screen.getByTestId('mjc-search-input');
      fireEvent.change(searchInput, { target: { value: 'BAGGING' } });

      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('BAGGING-LINE-01')).toBeInTheDocument();
        expect(screen.queryByText('FILLING-MACHINE-03')).not.toBeInTheDocument();
      });
    });

    it('filters by description', async () => {
      render(<MJCTable data={mockMJCData} />);

      const searchInput = screen.getByTestId('mjc-search-input');
      fireEvent.change(searchInput, { target: { value: 'preventive' } });

      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText(/Preventive maintenance/i)).toBeInTheDocument();
        expect(screen.queryByText('MJC-2025-001')).not.toBeInTheDocument();
      });
    });

    it('debounces search input', async () => {
      render(<MJCTable data={mockMJCData} />);

      const searchInput = screen.getByTestId('mjc-search-input');

      // Type multiple characters quickly
      fireEvent.change(searchInput, { target: { value: 'M' } });
      jest.advanceTimersByTime(100);
      fireEvent.change(searchInput, { target: { value: 'MJ' } });
      jest.advanceTimersByTime(100);
      fireEvent.change(searchInput, { target: { value: 'MJC' } });

      // Should not filter yet (total < 300ms)
      expect(screen.getByText('MJC-2025-001')).toBeInTheDocument();
      expect(screen.getByText('MJC-2025-002')).toBeInTheDocument();

      // Now complete the debounce
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('MJC-2025-001')).toBeInTheDocument();
      });
    });
  });

  describe('Status Filter', () => {
    it('filters by status - open', async () => {
      render(<MJCTable data={mockMJCData} />);

      const statusFilter = screen.getByTestId('mjc-status-filter');
      fireEvent.click(statusFilter);

      const openOption = screen.getByText('Open');
      fireEvent.click(openOption);

      await waitFor(() => {
        expect(screen.getByText('MJC-2025-001')).toBeInTheDocument();
        expect(screen.queryByText('MJC-2025-002')).not.toBeInTheDocument();
      });
    });

    it('filters by status - completed', async () => {
      render(<MJCTable data={mockMJCData} />);

      const statusFilter = screen.getByTestId('mjc-status-filter');
      fireEvent.click(statusFilter);

      const completedOption = screen.getByText('Completed');
      fireEvent.click(completedOption);

      await waitFor(() => {
        expect(screen.getByText('MJC-2025-003')).toBeInTheDocument();
        expect(screen.queryByText('MJC-2025-001')).not.toBeInTheDocument();
      });
    });
  });

  describe('Urgency Filter', () => {
    it('filters by urgency - high', async () => {
      render(<MJCTable data={mockMJCData} />);

      const urgencyFilter = screen.getByTestId('mjc-urgency-filter');
      fireEvent.click(urgencyFilter);

      const highOption = screen.getByText(/High \(<4hrs\)/i);
      fireEvent.click(highOption);

      await waitFor(() => {
        expect(screen.getByText('MJC-2025-001')).toBeInTheDocument();
        expect(screen.queryByText('MJC-2025-002')).not.toBeInTheDocument();
      });
    });

    it('filters by urgency - critical', async () => {
      render(<MJCTable data={mockMJCData} />);

      const urgencyFilter = screen.getByTestId('mjc-urgency-filter');
      fireEvent.click(urgencyFilter);

      const criticalOption = screen.getByText(/Critical \(<1hr\)/i);
      fireEvent.click(criticalOption);

      await waitFor(() => {
        expect(screen.getByText('MJC-2025-003')).toBeInTheDocument();
        expect(screen.queryByText('MJC-2025-001')).not.toBeInTheDocument();
      });
    });
  });

  describe('Maintenance Type Filter', () => {
    it('filters by maintenance type - mechanical', async () => {
      render(<MJCTable data={mockMJCData} />);

      const typeFilter = screen.getByTestId('mjc-type-filter');
      fireEvent.click(typeFilter);

      const mechanicalOption = screen.getByText('Mechanical');
      fireEvent.click(mechanicalOption);

      await waitFor(() => {
        expect(screen.getByText('MJC-2025-001')).toBeInTheDocument();
        expect(screen.getByText('MJC-2025-003')).toBeInTheDocument();
        expect(screen.queryByText('MJC-2025-002')).not.toBeInTheDocument();
      });
    });
  });

  describe('Temporary Repair Filter', () => {
    it('filters to show only temporary repairs', async () => {
      render(<MJCTable data={mockMJCData} />);

      const tempRepairToggle = screen.getByTestId('mjc-temp-repair-toggle');
      fireEvent.click(tempRepairToggle);

      await waitFor(() => {
        expect(screen.getByText('MJC-2025-003')).toBeInTheDocument();
        expect(screen.queryByText('MJC-2025-001')).not.toBeInTheDocument();
        expect(screen.queryByText('MJC-2025-002')).not.toBeInTheDocument();
      });
    });
  });

  describe('Combined Filters', () => {
    it('applies multiple filters simultaneously', async () => {
      render(<MJCTable data={mockMJCData} />);

      // Apply urgency filter
      const urgencyFilter = screen.getByTestId('mjc-urgency-filter');
      fireEvent.click(urgencyFilter);
      const criticalOption = screen.getByText(/Critical \(<1hr\)/i);
      fireEvent.click(criticalOption);

      // Apply temporary repair filter
      const tempRepairToggle = screen.getByTestId('mjc-temp-repair-toggle');
      fireEvent.click(tempRepairToggle);

      await waitFor(() => {
        // Only MJC-2025-003 matches both criteria
        expect(screen.getByText('MJC-2025-003')).toBeInTheDocument();
        expect(screen.queryByText('MJC-2025-001')).not.toBeInTheDocument();
        expect(screen.queryByText('MJC-2025-002')).not.toBeInTheDocument();
      });
    });
  });

  describe('Clear Filters', () => {
    it('clears all active filters', async () => {
      render(<MJCTable data={mockMJCData} />);

      // Apply filters
      const urgencyFilter = screen.getByTestId('mjc-urgency-filter');
      fireEvent.click(urgencyFilter);
      const highOption = screen.getByText(/High \(<4hrs\)/i);
      fireEvent.click(highOption);

      // Verify filter applied
      await waitFor(() => {
        expect(screen.queryByText('MJC-2025-002')).not.toBeInTheDocument();
      });

      // Clear filters
      const clearButton = screen.getByTestId('mjc-clear-filters');
      fireEvent.click(clearButton);

      // Verify all MJCs visible again
      await waitFor(() => {
        expect(screen.getByText('MJC-2025-001')).toBeInTheDocument();
        expect(screen.getByText('MJC-2025-002')).toBeInTheDocument();
        expect(screen.getByText('MJC-2025-003')).toBeInTheDocument();
      });
    });
  });

  describe('Sorting', () => {
    it('sorts by urgency level', async () => {
      render(<MJCTable data={mockMJCData} />);

      const urgencyHeader = screen.getByText(/Urgency/);
      fireEvent.click(urgencyHeader);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        // Critical should be first (MJC-2025-003)
        expect(rows[1]).toHaveTextContent('MJC-2025-003');
      });
    });

    it('toggles sort direction', async () => {
      render(<MJCTable data={mockMJCData} />);

      const mjcNumberHeader = screen.getByText(/MJC Number/);

      // First click - ascending
      fireEvent.click(mjcNumberHeader);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(rows[1]).toHaveTextContent('MJC-2025-001');
      });

      // Second click - descending
      fireEvent.click(mjcNumberHeader);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(rows[1]).toHaveTextContent('MJC-2025-003');
      });
    });
  });

  describe('Active Filter Indicator', () => {
    it('shows active filter count', async () => {
      render(<MJCTable data={mockMJCData} />);

      // No filters initially
      expect(screen.queryByText(/active filter/i)).not.toBeInTheDocument();

      // Apply one filter
      const urgencyFilter = screen.getByTestId('mjc-urgency-filter');
      fireEvent.click(urgencyFilter);
      const highOption = screen.getByText(/High \(<4hrs\)/i);
      fireEvent.click(highOption);

      await waitFor(() => {
        expect(screen.getByText('1 active filter')).toBeInTheDocument();
      });

      // Apply second filter
      const tempRepairToggle = screen.getByTestId('mjc-temp-repair-toggle');
      fireEvent.click(tempRepairToggle);

      await waitFor(() => {
        expect(screen.getByText('2 active filters')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('shows appropriate message when filters return no results', async () => {
      render(<MJCTable data={mockMJCData} />);

      // Apply filter that returns no results
      const searchInput = screen.getByTestId('mjc-search-input');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('No MJCs found')).toBeInTheDocument();
        expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
      });
    });
  });
});

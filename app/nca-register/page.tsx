/**
 * NCA Register Page
 *
 * Main page for viewing and filtering NCAs
 * Features interactive table with filtering, sorting, and search
 */

'use client';

import { useEffect, useState } from 'react';
import { NCATable } from '@/components/nca-table';
import type { NCAData } from '@/lib/types/nca-filter';

/**
 * Mock NCA data for MVP testing
 * In production, this will be fetched from Supabase
 */
const mockNCAs: NCAData[] = [
  {
    id: '1',
    nca_number: 'NCA-2025-001',
    status: 'open',
    nc_type: 'Raw Material',
    product_description: 'Wheat flour 25kg bags',
    nc_description: 'Foreign material detected - metal fragments in batch WF-2025-0123',
    created_at: '2025-01-15T08:30:00Z',
    updated_at: '2025-01-15T08:30:00Z',
    created_by: 'mike@kangopak.com',
    section_3: {
      supplier_name: 'ABC Flour Mills',
      supplier_batch: 'FM-2025-0045',
      carton_numbers: 'C001-C050',
    },
  },
  {
    id: '2',
    nca_number: 'NCA-2025-002',
    status: 'investigation',
    nc_type: 'Finished Goods',
    product_description: 'Biscuits - Chocolate Chip 200g',
    nc_description: 'Packaging defect - torn wrappers affecting seal integrity',
    created_at: '2025-01-16T10:15:00Z',
    updated_at: '2025-01-16T14:22:00Z',
    created_by: 'vernon@kangopak.com',
  },
  {
    id: '3',
    nca_number: 'NCA-2025-003',
    status: 'closed',
    nc_type: 'Work in Progress',
    product_description: 'Cookie dough batch',
    nc_description: 'Temperature excursion during storage - exceeded 5°C for 45 minutes',
    created_at: '2025-01-10T14:20:00Z',
    updated_at: '2025-01-18T09:10:00Z',
    created_by: 'mike@kangopak.com',
    section_4: {
      root_cause: 'Refrigeration unit malfunction',
      corrective_action: 'Unit repaired and calibrated. Batch destroyed per procedure 5.7.',
    },
  },
  {
    id: '4',
    nca_number: 'NCA-2025-004',
    status: 'open',
    nc_type: 'Raw Material',
    product_description: 'Sugar granulated 50kg bags',
    nc_description: 'Moisture content exceeds specification - 0.08% vs 0.05% max',
    created_at: '2025-01-18T11:45:00Z',
    updated_at: '2025-01-18T11:45:00Z',
    created_by: 'vernon@kangopak.com',
  },
  {
    id: '5',
    nca_number: 'NCA-2025-005',
    status: 'pending_approval',
    nc_type: 'Finished Goods',
    product_description: 'Crackers - Salted 150g',
    nc_description: 'Undeclared allergen risk - possible cross-contamination with peanuts',
    created_at: '2025-01-19T09:30:00Z',
    updated_at: '2025-01-19T15:20:00Z',
    created_by: 'mike@kangopak.com',
  },
  {
    id: '6',
    nca_number: 'NCA-2025-006',
    status: 'open',
    nc_type: 'Work in Progress',
    product_description: 'Bread dough mixing',
    nc_description: 'Incorrect ingredient ratio - yeast quantity 20% below specification',
    created_at: '2025-01-20T07:15:00Z',
    updated_at: '2025-01-20T07:15:00Z',
    created_by: 'vernon@kangopak.com',
  },
  {
    id: '7',
    nca_number: 'NCA-2025-007',
    status: 'investigation',
    nc_type: 'Raw Material',
    product_description: 'Chocolate chips 10kg bags',
    nc_description: 'Visual defect - white bloom on chocolate surface indicating temperature abuse',
    created_at: '2025-01-21T13:40:00Z',
    updated_at: '2025-01-21T16:50:00Z',
    created_by: 'mike@kangopak.com',
  },
  {
    id: '8',
    nca_number: 'NCA-2025-008',
    status: 'closed',
    nc_type: 'Finished Goods',
    product_description: 'Cake mix 500g boxes',
    nc_description: 'Labeling error - incorrect storage instructions printed on packaging',
    created_at: '2025-01-12T10:20:00Z',
    updated_at: '2025-01-22T11:30:00Z',
    created_by: 'vernon@kangopak.com',
    section_4: {
      root_cause: 'Printing template not updated after procedure revision',
      corrective_action: 'Affected batch relabeled. Template management procedure updated.',
    },
  },
  {
    id: '9',
    nca_number: 'NCA-2025-009',
    status: 'open',
    nc_type: 'Work in Progress',
    product_description: 'Pastry production line',
    nc_description: 'Equipment malfunction - metal detector failing calibration check',
    created_at: '2025-01-22T08:00:00Z',
    updated_at: '2025-01-22T08:00:00Z',
    created_by: 'mike@kangopak.com',
  },
  {
    id: '10',
    nca_number: 'NCA-2025-010',
    status: 'investigation',
    nc_type: 'Finished Goods',
    product_description: 'Granola bars 40g individual',
    nc_description: 'Weight variance - average weight 38.2g vs 40g ± 2g specification',
    created_at: '2025-01-23T14:10:00Z',
    updated_at: '2025-01-23T16:45:00Z',
    created_by: 'vernon@kangopak.com',
  },
];

export default function NCARegisterPage() {
  const [ncas, setNcas] = useState<NCAData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch delay
    const timer = setTimeout(() => {
      setNcas(mockNCAs);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            NCA Register
          </h1>
          <p className="text-lg text-gray-600">
            Non-Conformance Actions - Filter, search, and manage quality issues
          </p>
        </div>

        {/* NCA Table with Interactive Features */}
        <NCATable ncas={ncas} loading={loading} />
      </div>
    </div>
  );
}

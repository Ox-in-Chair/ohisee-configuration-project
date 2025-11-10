/**
 * MJC Register Page
 * Displays all Maintenance Job Cards with filtering, sorting, and search
 */

'use client';

import { useState, useEffect } from 'react';
import { MJCTable } from '@/components/mjc-table';
import { type MJCTableData } from '@/lib/types/mjc-filter';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Mock data for development and testing
// TODO: Replace with actual Supabase query
const mockMJCData: MJCTableData[] = [
  {
    id: '1',
    mjc_number: 'MJC-2025-001',
    machine_equipment_id: 'BAGGING-LINE-01',
    maintenance_description: 'Conveyor belt slipping causing production delays. Requires tension adjustment and inspection of drive motor.',
    urgency_level: 'high',
    machine_status: 'operational',
    maintenance_type: 'mechanical',
    temporary_repair: 'no',
    status: 'open',
    created_at: '2025-01-10T10:30:00',
    updated_at: '2025-01-10T10:30:00',
    maintenance_category: 'reactive',
    raised_by: 'John Smith',
    department: 'Production',
  },
  {
    id: '2',
    mjc_number: 'MJC-2025-002',
    machine_equipment_id: 'FILLING-MACHINE-03',
    maintenance_description: 'Preventive maintenance for hydraulic system. Scheduled inspection and fluid replacement as per maintenance schedule.',
    urgency_level: 'low',
    machine_status: 'operational',
    maintenance_type: 'pneumatical',
    temporary_repair: 'no',
    status: 'in_progress',
    created_at: '2025-01-11T14:15:00',
    updated_at: '2025-01-11T14:15:00',
    maintenance_category: 'planned',
    raised_by: 'Sarah Johnson',
    department: 'Maintenance',
  },
  {
    id: '3',
    mjc_number: 'MJC-2025-003',
    machine_equipment_id: 'SEALING-UNIT-02',
    maintenance_description: 'Emergency repair - seal broken during operation. Temporary fix applied to resume production. Permanent replacement required.',
    urgency_level: 'critical',
    machine_status: 'down',
    maintenance_type: 'mechanical',
    temporary_repair: 'yes',
    status: 'completed',
    created_at: '2025-01-12T08:45:00',
    updated_at: '2025-01-12T08:45:00',
    maintenance_category: 'reactive',
    raised_by: 'Mike Wilson',
    department: 'Production',
  },
  {
    id: '4',
    mjc_number: 'MJC-2025-004',
    machine_equipment_id: 'LABELING-MACHINE-01',
    maintenance_description: 'Electrical fault in control panel. Emergency stop not functioning correctly. Requires immediate attention for safety compliance.',
    urgency_level: 'critical',
    machine_status: 'down',
    maintenance_type: 'electrical',
    temporary_repair: 'no',
    status: 'open',
    created_at: '2025-01-13T09:20:00',
    updated_at: '2025-01-13T09:20:00',
    maintenance_category: 'reactive',
    raised_by: 'David Brown',
    department: 'Production',
  },
  {
    id: '5',
    mjc_number: 'MJC-2025-005',
    machine_equipment_id: 'PALLETIZER-01',
    maintenance_description: 'Routine lubrication and bearing inspection. Standard preventive maintenance as per quarterly schedule.',
    urgency_level: 'medium',
    machine_status: 'operational',
    maintenance_type: 'mechanical',
    temporary_repair: 'no',
    status: 'completed',
    created_at: '2025-01-14T13:00:00',
    updated_at: '2025-01-14T13:00:00',
    maintenance_category: 'planned',
    raised_by: 'Tom Anderson',
    department: 'Maintenance',
  },
  {
    id: '6',
    mjc_number: 'MJC-2025-006',
    machine_equipment_id: 'CONVEYOR-SYSTEM-A',
    maintenance_description: 'Pneumatic cylinder leaking air. Temporary seal replacement completed. Full cylinder replacement scheduled for next maintenance window.',
    urgency_level: 'high',
    machine_status: 'operational',
    maintenance_type: 'pneumatical',
    temporary_repair: 'yes',
    status: 'open',
    created_at: '2025-01-15T11:45:00',
    updated_at: '2025-01-15T11:45:00',
    maintenance_category: 'reactive',
    raised_by: 'Lisa Martinez',
    department: 'Production',
  },
];

export default function MJCRegisterPage() {
  const [mjcData, setMjcData] = useState<MJCTableData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setMjcData(mockMJCData);
      setIsLoading(false);
    }, 500);
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <title>Maintenance Job Card Register | OHiSee</title>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="mjc-register-title">
            Maintenance Job Card Register
          </h1>
          <p className="text-gray-600">
            View and manage all Maintenance Job Cards with advanced filtering and search
          </p>
        </div>
        <Link href="/mjc/new">
          <Button size="lg">Create New MJC</Button>
        </Link>
      </div>

      <MJCTable data={mjcData} isLoading={isLoading} />
    </div>
  );
}

import { Metadata } from 'next';
import { createServerClient } from '@/lib/database/client';
import { MJCTable } from '@/components/mjc-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { MJCTableData } from '@/lib/types/mjc-filter';

/**
 * MJC Register Page (Server Component)
 *
 * Responsibilities:
 * - Fetch MJCs from Supabase with server-side pagination and filtering
 * - Handle URL search parameters for filters and pagination
 * - Pass data to client component for rendering
 * - TypeScript strict mode compliance
 * - NO static method calls (dependency injection pattern)
 *
 * Architecture: Server Component → Client Component data flow
 */

export const metadata: Metadata = {
  title: 'MJC Register | OHiSee',
  description: 'Maintenance Job Card register with full traceability',
};

interface MJCRegisterPageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    urgency?: string;
    search?: string;
    sort?: string;
    sortDir?: string;
  }>;
}

/**
 * Fetch MJCs from database with server-side pagination and filtering
 * Dependency-injected function (no static calls)
 */
async function fetchMJCs(
  page: number = 1,
  status?: string,
  urgency?: string,
  search?: string,
  sort?: string,
  sortDir: 'asc' | 'desc' = 'desc'
): Promise<{ data: MJCTableData[]; total: number; page: number; totalPages: number }> {
  const supabase = createServerClient();
  const itemsPerPage = 25;
  const offset = (page - 1) * itemsPerPage;

  // Build query
  let query = supabase
    .from('mjcs')
    .select(
      `
      id,
      job_card_number,
      status,
      urgency,
      machine_equipment,
      maintenance_description,
      machine_status,
      temporary_repair,
      created_at,
      updated_at,
      maintenance_category,
      raised_by_user_id
    `,
      { count: 'exact' }
    );

  // Apply status filter
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  // Apply urgency filter
  if (urgency && urgency !== 'all') {
    query = query.eq('urgency', urgency);
  }

  // Apply search filter
  if (search && search.trim()) {
    query = query.or(
      `job_card_number.ilike.%${search}%,machine_equipment.ilike.%${search}%,maintenance_description.ilike.%${search}%`
    );
  }

  // Apply sorting
  const sortColumn = sort || 'created_at';
  query = query.order(sortColumn, { ascending: sortDir === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + itemsPerPage - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching MJCs:', error);
    return { data: [], total: 0, page, totalPages: 0 };
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / itemsPerPage);

  // Transform data to MJCTableData format
  const transformedData: MJCTableData[] = (data || []).map((mjc: any) => ({
    id: mjc.id,
    mjc_number: mjc.job_card_number,
    machine_equipment_id: mjc.machine_equipment || '',
    maintenance_description: mjc.maintenance_description || '',
    urgency_level: mjc.urgency || 'low',
    machine_status: mjc.machine_status || 'operational',
    maintenance_type: 'mechanical', // TODO: Map from maintenance_type fields
    temporary_repair: mjc.temporary_repair ? 'yes' : 'no',
    status: mjc.status || 'open',
    created_at: mjc.created_at,
    updated_at: mjc.updated_at,
    maintenance_category: mjc.maintenance_category || 'reactive',
    raised_by: 'Operator', // TODO: Get from user profile
    department: 'Maintenance', // TODO: Get from user profile
  }));

  return {
    data: transformedData,
    total,
    page,
    totalPages,
  };
}

/**
 * MJC Register Page Component
 */
export default async function MJCRegisterPage({ searchParams }: MJCRegisterPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const status = params.status || 'all';
  const urgency = params.urgency || 'all';
  const search = params.search || '';
  const sort = params.sort || 'created_at';
  const sortDir = (params.sortDir as 'asc' | 'desc') || 'desc';

  // Fetch MJCs server-side with pagination and filters
  const { data: mjcs, total, totalPages } = await fetchMJCs(page, status, urgency, search, sort, sortDir);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
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

      <MJCTable
        data={mjcs}
        isLoading={false}
        total={total}
        currentPage={page}
        totalPages={totalPages}
        initialStatus={status}
        initialUrgency={urgency}
        initialSearch={search}
        initialSort={sort}
        initialSortDir={sortDir}
      />
    </div>
  );
}

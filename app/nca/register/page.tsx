import { Metadata } from 'next';
import { createServerClient } from '@/lib/database/client';
import { NCATable } from '@/components/nca-table';
import type { NCATableRow } from '@/lib/types/nca';

/**
 * NCA Register Page (Server Component)
 *
 * Responsibilities:
 * - Fetch NCAs from Supabase with server-side pagination and filtering
 * - Handle URL search parameters for filters and pagination
 * - Pass data to client component for rendering
 * - TypeScript strict mode compliance
 * - NO static method calls (dependency injection pattern)
 *
 * Architecture: Server Component → Client Component data flow
 */

export const metadata: Metadata = {
  title: 'NCA Register | OHiSee',
  description: 'Non-Conformance Advice register with full traceability',
};

interface NCARegisterPageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    search?: string;
    sort?: string;
    sortDir?: string;
  }>;
}

/**
 * Fetch NCAs from database with server-side pagination and filtering
 * Dependency-injected function (no static calls)
 *
 * @returns Promise<{ data: NCATableRow[]; total: number; page: number; totalPages: number }>
 */
async function fetchNCAs(
  page: number = 1,
  status?: string,
  search?: string,
  sort?: string,
  sortDir: 'asc' | 'desc' = 'desc'
): Promise<{ data: NCATableRow[]; total: number; page: number; totalPages: number }> {
  const supabase = createServerClient();
  const itemsPerPage = 25;
  const offset = (page - 1) * itemsPerPage;

  // Build query
  let query = supabase
    .from('ncas')
    .select(
      `
      id,
      nca_number,
      status,
      created_at,
      machine_status,
      nc_product_description,
      nc_description,
      wo_id
    `,
      { count: 'exact' }
    );

  // Apply status filter
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  // Apply search filter
  if (search && search.trim()) {
    query = query.or(
      `nca_number.ilike.%${search}%,nc_product_description.ilike.%${search}%,nc_description.ilike.%${search}%`
    );
  }

  // Apply sorting
  const sortColumn = sort || 'created_at';
  query = query.order(sortColumn, { ascending: sortDir === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + itemsPerPage - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching NCAs:', error);
    return { data: [], total: 0, page, totalPages: 0 };
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / itemsPerPage);

  return {
    data: (data || []) as NCATableRow[],
    total,
    page,
    totalPages,
  };
}

/**
 * NCA Register Page Component
 */
export default async function NCARegisterPage({ searchParams }: NCARegisterPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const status = params.status || 'all';
  const search = params.search || '';
  const sort = params.sort || 'created_at';
  const sortDir = (params.sortDir as 'asc' | 'desc') || 'desc';

  // Fetch NCAs server-side with pagination and filters
  const { data: ncas, total, totalPages } = await fetchNCAs(page, status, search, sort, sortDir);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">NCA Register</h1>
        <p className="text-gray-600 mt-2">
          Non-Conformance Advice register with full BRCGS traceability
        </p>
      </div>

      {/* Pass data to client component with pagination info */}
      <NCATable
        ncas={ncas as any}
        total={total}
        currentPage={page}
        totalPages={totalPages}
        initialStatus={status}
        initialSearch={search}
        initialSort={sort}
        initialSortDir={sortDir}
      />
    </div>
  );
}

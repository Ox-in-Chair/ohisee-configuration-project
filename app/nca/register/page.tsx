import { Metadata } from 'next';
import { createServerClient } from '@/lib/database/client';
import { NCATable } from '@/components/nca-table';
import type { NCATableRow } from '@/lib/types/nca';

/**
 * NCA Register Page (Server Component)
 *
 * Responsibilities:
 * - Fetch all NCAs from Supabase (ordered by created_at DESC)
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

/**
 * Fetch all NCAs from database
 * Dependency-injected function (no static calls)
 *
 * @returns Promise<NCATableRow[]> - Array of NCAs for table display
 */
async function fetchNCAs(): Promise<NCATableRow[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
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
    `
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching NCAs:', error);
    return [];
  }

  return (data || []) as NCATableRow[];
}

/**
 * NCA Register Page Component
 */
export default async function NCARegisterPage() {
  // Fetch NCAs server-side
  const ncas = await fetchNCAs();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">NCA Register</h1>
        <p className="text-gray-600 mt-2">
          Non-Conformance Advice register with full BRCGS traceability
        </p>
      </div>

      {/* Pass data to client component */}
      <NCATable ncas={ncas as any} />
    </div>
  );
}

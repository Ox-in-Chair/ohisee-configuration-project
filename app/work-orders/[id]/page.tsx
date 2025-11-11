import { notFound } from 'next/navigation';
import { getWorkOrderById, getLinkedNCAs, getLinkedMJCs } from '@/app/actions/work-order-actions';
import { WorkOrderDetail } from '@/components/work-orders/work-order-detail';
import { RelatedIssuesTable } from '@/components/work-orders/related-issues-table';
import { CloseWorkOrderButton } from '@/components/work-orders/close-work-order-button';

interface WorkOrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkOrderDetailPage({ params }: WorkOrderDetailPageProps) {
  const { id } = await params;

  // Fetch work order and related data in parallel
  const [woResult, ncasResult, mjcsResult] = await Promise.all([
    getWorkOrderById(id),
    getLinkedNCAs(id),
    getLinkedMJCs(id),
  ]);

  if (!woResult.success || !woResult.data) {
    notFound();
  }

  const workOrder = woResult.data as any;
  const ncas = (ncasResult.data || []) as any[];
  const mjcs = (mjcsResult.data || []) as any[];

  // Check if there are open issues
  const openNCAs = ncas.filter((nca) => ['open', 'under-review'].includes(nca.status));
  const openMJCs = mjcs.filter((mjc) =>
    ['open', 'assigned', 'in-progress', 'awaiting-clearance'].includes(mjc.status)
  );
  const hasOpenIssues = openNCAs.length > 0 || openMJCs.length > 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Work Order Details</h1>
            <p className="text-sm text-gray-600 mt-1">
              View work order information and linked issues
            </p>
          </div>
          {workOrder.status !== 'completed' && (
            <CloseWorkOrderButton
              woId={id}
              hasOpenIssues={hasOpenIssues}
              openNCAsCount={openNCAs.length}
              openMJCsCount={openMJCs.length}
            />
          )}
        </div>

        {/* Work Order Information */}
        <WorkOrderDetail workOrder={workOrder} />

        {/* Related Issues */}
        <RelatedIssuesTable ncas={ncas} mjcs={mjcs} />

        {/* Warning if open issues exist */}
        {hasOpenIssues && workOrder.status !== 'completed' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> This work order has {openNCAs.length} open NCA(s) and{' '}
              {openMJCs.length} open MJC(s). Please resolve all issues before closing the work order.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


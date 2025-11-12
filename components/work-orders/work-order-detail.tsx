/**
 * Work Order Detail Component
 * Displays work order information
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icons';
import { ICONS } from '@/lib/config/icons';

interface WorkOrder {
  id: string;
  wo_number: string;
  product: string;
  machine_id: string;
  operator_id: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

interface WorkOrderDetailProps {
  workOrder: WorkOrder;
}

export function WorkOrderDetail({ workOrder }: WorkOrderDetailProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Work Order Details</span>
          <Badge className={getStatusColor(workOrder.status)}>
            {workOrder.status.toUpperCase()}
          </Badge>
        </CardTitle>
        <CardDescription>Work Order Information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Icon name={ICONS.PACKAGE} size="sm" className="text-gray-500" />
            <div>
              <p className="text-sm text-gray-600">Work Order Number</p>
              <p className="font-semibold">{workOrder.wo_number}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Icon name={ICONS.PACKAGE} size="sm" className="text-gray-500" />
            <div>
              <p className="text-sm text-gray-600">Product</p>
              <p className="font-semibold">{workOrder.product || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Icon name={ICONS.WRENCH} size="sm" className="text-gray-500" />
            <div>
              <p className="text-sm text-gray-600">Machine ID</p>
              <p className="font-semibold">{workOrder.machine_id || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Icon name={ICONS.USER} size="sm" className="text-gray-500" />
            <div>
              <p className="text-sm text-gray-600">Operator ID</p>
              <p className="font-semibold">{workOrder.operator_id || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Icon name={ICONS.CALENDAR} size="sm" className="text-gray-500" />
            <div>
              <p className="text-sm text-gray-600">Created At</p>
              <p className="font-semibold">
                {new Date(workOrder.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Icon name={ICONS.CALENDAR} size="sm" className="text-gray-500" />
            <div>
              <p className="text-sm text-gray-600">Last Updated</p>
              <p className="font-semibold">
                {new Date(workOrder.updated_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


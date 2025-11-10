/**
 * Work Order type definition
 * BRCGS Compliance: Section 3.9 Traceability
 */
export interface WorkOrder {
  id: string;
  wo_number: string;
  product: string;
  machine_id: string;
  operator_id: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

/**
 * Work Order Service Interface
 * Defines contract for work order operations with dependency injection
 */
export interface IWorkOrderService {
  getActiveWorkOrder(userId: string): Promise<WorkOrder | null>;
}

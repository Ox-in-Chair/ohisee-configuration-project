/**
 * OHiSee Notification System - Type Definitions
 * Architecture: Interface-based dependency injection
 * Email-only notifications (SMS removed per requirements)
 */

export interface NotificationPayload {
  nca_number: string;
  machine_name: string;
  operator_name: string;
  timestamp: string;
}

export interface MJCMachineDownPayload {
  mjc_number: string;
  machine_name: string;
  technician_name: string;
  urgency: string;
  timestamp: string;
}

export interface HygieneClearancePayload {
  mjc_number: string;
  machine_equipment: string;
  technician_name: string;
  timestamp: string;
}

export interface TemporaryRepairReminderPayload {
  mjc_number: string;
  machine_equipment: string;
  due_date: string;
  days_remaining: number;
}

export interface EndOfDaySummaryPayload {
  operator_name: string;
  date: string;
  work_orders_count: number;
  ncas_count: number;
  mjcs_count: number;
  shift_notes?: string;
  ncas_list?: string[];
  mjcs_list?: string[];
}

export interface SupplierNCANotificationPayload {
  nca_number: string;
  supplier_name: string;
  supplier_email: string;
  date: string;
  product_description: string;
  supplier_wo_batch?: string;
  supplier_reel_box?: string;
  quantity?: number;
  quantity_unit?: string;
  nc_description: string;
}

export interface OverdueNCAPayload {
  overdue_count: number;
  overdue_ncas: Array<{
    nca_number: string;
    date: string;
    close_out_due_date: string;
    days_overdue: number;
    nc_type: string;
    supplier_name: string | null;
    nc_product_description: string;
  }>;
}

export interface DailyNCAReminderPayload {
  new_nca_count: number;
  new_ncas: Array<{
    nca_number: string;
    date: string;
    nc_type: string;
    supplier_name: string | null;
    nc_product_description: string;
    created_at: string;
  }>;
}

export interface WeeklyNCAReviewPayload {
  total_ncas: number;
  overdue_count: number;
  approaching_due_count: number;
  overdue_ncas: Array<{
    nca_number: string;
    date: string;
    close_out_due_date: string;
    days_overdue: number;
    nc_type: string;
    supplier_name: string | null;
  }>;
  approaching_due_ncas: Array<{
    nca_number: string;
    date: string;
    close_out_due_date: string;
    days_remaining: number;
    nc_type: string;
    supplier_name: string | null;
  }>;
}

export interface IEmailClient {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

export interface INotificationService {
  sendMachineDownAlert(payload: NotificationPayload): Promise<void>;
  sendMJCMachineDownAlert(payload: MJCMachineDownPayload): Promise<void>;
  sendHygieneClearanceRequest(payload: HygieneClearancePayload): Promise<void>;
  sendTemporaryRepairReminder(payload: TemporaryRepairReminderPayload): Promise<void>;
  sendEndOfDaySummary(payload: EndOfDaySummaryPayload): Promise<void>;
  sendSupplierNCANotification(payload: SupplierNCANotificationPayload): Promise<void>;
  sendOverdueNCAAlert(payload: OverdueNCAPayload): Promise<void>;
  sendDailyNCAReminder(payload: DailyNCAReminderPayload): Promise<void>;
  sendWeeklyNCAReview(payload: WeeklyNCAReviewPayload): Promise<void>;
}

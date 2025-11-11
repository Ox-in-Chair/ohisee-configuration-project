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

export interface IEmailClient {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

export interface INotificationService {
  sendMachineDownAlert(payload: NotificationPayload): Promise<void>;
  sendMJCMachineDownAlert(payload: MJCMachineDownPayload): Promise<void>;
  sendHygieneClearanceRequest(payload: HygieneClearancePayload): Promise<void>;
  sendTemporaryRepairReminder(payload: TemporaryRepairReminderPayload): Promise<void>;
  sendEndOfDaySummary(payload: EndOfDaySummaryPayload): Promise<void>;
}

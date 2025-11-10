/**
 * OHiSee Notification System - Type Definitions
 * Architecture: Interface-based dependency injection
 */

export interface NotificationPayload {
  nca_number: string;
  machine_name: string;
  operator_name: string;
  timestamp: string;
}

export interface ISMSClient {
  sendSMS(to: string, message: string): Promise<void>;
}

export interface IEmailClient {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

export interface INotificationService {
  sendMachineDownAlert(payload: NotificationPayload): Promise<void>;
}

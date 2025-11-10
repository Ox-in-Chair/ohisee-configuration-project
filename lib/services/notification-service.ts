/**
 * OHiSee Notification Service
 * Architecture: Dependency injection - NO static calls
 * BRCGS Critical: Machine down alerts <5 seconds
 */

import type {
  NotificationPayload,
  ISMSClient,
  IEmailClient,
  INotificationService,
} from '@/lib/types/notification';

/**
 * Operations Manager Contact (hardcoded for MVP - move to DB later)
 */
const OPERATIONS_MANAGER_PHONE = '+27821234567'; // TODO: Load from user_profiles table
const OPERATIONS_MANAGER_EMAIL = 'ops.manager@kangopak.co.za'; // TODO: Load from user_profiles table

/**
 * NotificationService Implementation
 * Uses dependency injection for SMS and Email clients
 */
class NotificationService implements INotificationService {
  constructor(
    private readonly smsClient: ISMSClient,
    private readonly emailClient: IEmailClient
  ) {}

  /**
   * Send Machine Down alert to Operations Manager
   * Sends both SMS and Email in parallel for redundancy
   * Errors are logged but don't throw - notification failure shouldn't block NCA creation
   */
  async sendMachineDownAlert(payload: NotificationPayload): Promise<void> {
    // Format timestamp for human readability
    const formattedTime = this.formatTimestamp(payload.timestamp);

    // Build SMS message (keep under 160 chars for single SMS)
    const smsMessage = `MACHINE DOWN: ${payload.machine_name}\nNCA: ${payload.nca_number}\nOperator: ${payload.operator_name}\nTime: ${formattedTime}`;

    // Build Email subject and body
    const emailSubject = `URGENT: Machine Down Alert - ${payload.machine_name}`;
    const emailBody = this.buildEmailBody(payload, formattedTime);

    // Send both in parallel for speed (BRCGS <5s requirement)
    await Promise.allSettled([
      this.sendSMS(smsMessage),
      this.sendEmail(emailSubject, emailBody),
    ]);
  }

  /**
   * Send SMS with error handling
   */
  private async sendSMS(message: string): Promise<void> {
    try {
      await this.smsClient.sendSMS(OPERATIONS_MANAGER_PHONE, message);
    } catch (error) {
      console.error('Failed to send SMS notification:', error);
      // Don't throw - graceful degradation
    }
  }

  /**
   * Send Email with error handling
   */
  private async sendEmail(subject: string, body: string): Promise<void> {
    try {
      await this.emailClient.sendEmail(OPERATIONS_MANAGER_EMAIL, subject, body);
    } catch (error) {
      console.error('Failed to send Email notification:', error);
      // Don't throw - graceful degradation
    }
  }

  /**
   * Format ISO timestamp to readable format
   */
  private formatTimestamp(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString('en-ZA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  /**
   * Build HTML email body
   */
  private buildEmailBody(payload: NotificationPayload, formattedTime: string): string {
    return `
<html>
<body>
  <h2 style="color: #d32f2f;">URGENT: Machine Down Alert</h2>
  <p><strong>NCA Number:</strong> ${payload.nca_number}</p>
  <p><strong>Machine:</strong> ${payload.machine_name}</p>
  <p><strong>Operator:</strong> ${payload.operator_name}</p>
  <p><strong>Time:</strong> ${formattedTime}</p>
  <hr />
  <p style="color: #666; font-size: 12px;">
    This is an automated alert from the OHiSee NCA system.
    Please investigate immediately.
  </p>
</body>
</html>
    `.trim();
  }
}

/**
 * Factory function for creating NotificationService
 * Use this in production code for clean dependency injection
 */
export function createNotificationService(
  smsClient: ISMSClient,
  emailClient: IEmailClient
): INotificationService {
  return new NotificationService(smsClient, emailClient);
}

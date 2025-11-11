/**
 * OHiSee Notification Service
 * Architecture: Dependency injection - NO static calls
 * BRCGS Critical: Machine down alerts <5 seconds
 * Email-only notifications (SMS removed per requirements)
 */

import type {
  NotificationPayload,
  MJCMachineDownPayload,
  HygieneClearancePayload,
  TemporaryRepairReminderPayload,
  EndOfDaySummaryPayload,
  IEmailClient,
  INotificationService,
} from '@/lib/types/notification';

/**
 * Operations Manager Contact (hardcoded for MVP - move to DB later)
 */
const OPERATIONS_MANAGER_EMAIL = 'ops.manager@kangopak.co.za'; // TODO: Load from user_profiles table
const MAINTENANCE_MANAGER_EMAIL = 'maintenance.manager@kangopak.co.za'; // TODO: Load from user_profiles table
const QA_SUPERVISOR_EMAIL = 'qa.supervisor@kangopak.co.za'; // TODO: Load from user_profiles table
const MANAGEMENT_EMAIL = 'management@kangopak.co.za'; // TODO: Load from user_profiles table

/**
 * NotificationService Implementation
 * Uses dependency injection for Email client only
 */
class NotificationService implements INotificationService {
  constructor(
    private readonly emailClient: IEmailClient
  ) {}

  /**
   * Send Machine Down alert to Operations Manager
   * Sends email notification
   * Errors are logged but don't throw - notification failure shouldn't block NCA creation
   */
  async sendMachineDownAlert(payload: NotificationPayload): Promise<void> {
    // Format timestamp for human readability
    const formattedTime = this.formatTimestamp(payload.timestamp);

    // Build Email subject and body
    const emailSubject = `URGENT: Machine Down Alert - ${payload.machine_name}`;
    const emailBody = this.buildEmailBody(payload, formattedTime);

    // Send email (BRCGS <5s requirement)
    await this.sendEmail(emailSubject, emailBody);
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
   * Send MJC Machine Down + Critical alert to Maintenance Manager
   */
  async sendMJCMachineDownAlert(payload: MJCMachineDownPayload): Promise<void> {
    const formattedTime = this.formatTimestamp(payload.timestamp);
    const emailSubject = `URGENT: Machine Down - Critical MJC - ${payload.machine_name}`;
    const emailBody = this.buildMJCMachineDownEmailBody(payload, formattedTime);
    await this.sendEmailTo(MAINTENANCE_MANAGER_EMAIL, emailSubject, emailBody);
  }

  /**
   * Send Hygiene Clearance Request to QA Supervisors
   */
  async sendHygieneClearanceRequest(payload: HygieneClearancePayload): Promise<void> {
    const formattedTime = this.formatTimestamp(payload.timestamp);
    const emailSubject = `BRCGS Critical: Hygiene Clearance Request - ${payload.mjc_number}`;
    const emailBody = this.buildHygieneClearanceEmailBody(payload, formattedTime);
    await this.sendEmailTo(QA_SUPERVISOR_EMAIL, emailSubject, emailBody);
  }

  /**
   * Send Temporary Repair Reminder to Maintenance Manager
   */
  async sendTemporaryRepairReminder(payload: TemporaryRepairReminderPayload): Promise<void> {
    const emailSubject = `Temporary Repair Reminder - ${payload.mjc_number} (${payload.days_remaining} days remaining)`;
    const emailBody = this.buildTemporaryRepairReminderEmailBody(payload);
    await this.sendEmailTo(MAINTENANCE_MANAGER_EMAIL, emailSubject, emailBody);
  }

  /**
   * Send End-of-Day Summary to Management
   */
  async sendEndOfDaySummary(payload: EndOfDaySummaryPayload): Promise<void> {
    const emailSubject = `End-of-Day Summary - ${payload.date} - ${payload.operator_name}`;
    const emailBody = this.buildEndOfDaySummaryEmailBody(payload);
    await this.sendEmailTo(MANAGEMENT_EMAIL, emailSubject, emailBody);
  }

  /**
   * Send Email with error handling (to specific recipient)
   */
  private async sendEmailTo(to: string, subject: string, body: string): Promise<void> {
    try {
      await this.emailClient.sendEmail(to, subject, body);
    } catch (error) {
      console.error(`Failed to send Email notification to ${to}:`, error);
      // Don't throw - graceful degradation
    }
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

  /**
   * Build MJC Machine Down email body
   */
  private buildMJCMachineDownEmailBody(payload: MJCMachineDownPayload, formattedTime: string): string {
    return `
<html>
<body>
  <h2 style="color: #dc2626;">URGENT: Machine Down - Critical MJC</h2>
  <p><strong>MJC Number:</strong> ${payload.mjc_number}</p>
  <p><strong>Machine:</strong> ${payload.machine_name}</p>
  <p><strong>Technician:</strong> ${payload.technician_name}</p>
  <p><strong>Urgency:</strong> ${payload.urgency}</p>
  <p><strong>Time:</strong> ${formattedTime}</p>
  <hr />
  <p style="color: #666; font-size: 12px;">
    This is an automated alert from the OHiSee MJC system.
    Please investigate immediately.
  </p>
</body>
</html>
    `.trim();
  }

  /**
   * Build Hygiene Clearance Request email body
   */
  private buildHygieneClearanceEmailBody(payload: HygieneClearancePayload, formattedTime: string): string {
    return `
<html>
<body>
  <h2 style="color: #ea580c;">BRCGS Critical: Hygiene Clearance Request</h2>
  <p><strong>MJC Number:</strong> ${payload.mjc_number}</p>
  <p><strong>Machine/Equipment:</strong> ${payload.machine_equipment}</p>
  <p><strong>Technician:</strong> ${payload.technician_name}</p>
  <p><strong>Date:</strong> ${formattedTime}</p>
  <hr />
  <p style="color: #92400e; font-size: 14px;">
    <strong>BRCGS Compliance Required:</strong> Maintenance work has been completed.
    Please verify all 10 hygiene checklist items before granting clearance for production to resume.
  </p>
</body>
</html>
    `.trim();
  }

  /**
   * Build Temporary Repair Reminder email body
   */
  private buildTemporaryRepairReminderEmailBody(payload: TemporaryRepairReminderPayload): string {
    const urgencyColor = payload.days_remaining <= 3 ? '#dc2626' : payload.days_remaining <= 7 ? '#ea580c' : '#f59e0b';
    return `
<html>
<body>
  <h2 style="color: ${urgencyColor};">Temporary Repair Reminder</h2>
  <p><strong>MJC Number:</strong> ${payload.mjc_number}</p>
  <p><strong>Machine/Equipment:</strong> ${payload.machine_equipment}</p>
  <p><strong>Due Date:</strong> ${payload.due_date}</p>
  <p><strong>Days Remaining:</strong> ${payload.days_remaining} day(s)</p>
  <hr />
  <p style="color: #92400e; font-size: 14px;">
    <strong>BRCGS Compliance:</strong> Temporary repairs must be permanently resolved within 14 days.
    A permanent solution must be scheduled and implemented before the due date.
  </p>
</body>
</html>
    `.trim();
  }

  /**
   * Build End-of-Day Summary email body
   */
  private buildEndOfDaySummaryEmailBody(payload: EndOfDaySummaryPayload): string {
    const ncasList = payload.ncas_list && payload.ncas_list.length > 0
      ? `<ul>${payload.ncas_list.map(nca => `<li>${nca}</li>`).join('')}</ul>`
      : '<p>No NCAs created today</p>';
    
    const mjcsList = payload.mjcs_list && payload.mjcs_list.length > 0
      ? `<ul>${payload.mjcs_list.map(mjc => `<li>${mjc}</li>`).join('')}</ul>`
      : '<p>No MJCs created today</p>';

    return `
<html>
<body>
  <h2 style="color: #1e40af;">End of Day Summary Report</h2>
  <p><strong>Shift Summary - ${payload.date}</strong></p>
  <hr />
  <h3>Summary Statistics</h3>
  <p><strong>Work Orders:</strong> ${payload.work_orders_count}</p>
  <p><strong>NCAs Created:</strong> ${payload.ncas_count}</p>
  <p><strong>MJCs Created:</strong> ${payload.mjcs_count}</p>
  <p><strong>Operator:</strong> ${payload.operator_name}</p>
  <hr />
  <h3>NCAs Created Today</h3>
  ${ncasList}
  <h3>MJCs Created Today</h3>
  ${mjcsList}
  ${payload.shift_notes ? `<hr /><h3>Shift Notes</h3><p>${payload.shift_notes}</p>` : ''}
  <hr />
  <p style="color: #666; font-size: 12px;">
    This is an automated end-of-day summary from the OHiSee system.
    A detailed PDF report is attached to this email.
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
  emailClient: IEmailClient
): INotificationService {
  return new NotificationService(emailClient);
}

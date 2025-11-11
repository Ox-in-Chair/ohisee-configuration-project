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
  SupplierNCANotificationPayload,
  OverdueNCAPayload,
  DailyNCAReminderPayload,
  WeeklyNCAReviewPayload,
  IEmailClient,
  INotificationService,
} from '@/lib/types/notification';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Operations Manager Contact (hardcoded for MVP - move to DB later)
 */
const OPERATIONS_MANAGER_EMAIL = 'ops.manager@kangopak.co.za'; // TODO: Load from user_profiles table
const MAINTENANCE_MANAGER_EMAIL = 'maintenance.manager@kangopak.co.za'; // TODO: Load from user_profiles table
const QA_SUPERVISOR_EMAIL = 'qa.supervisor@kangopak.co.za'; // TODO: Load from user_profiles table
const MANAGEMENT_EMAIL = 'management@kangopak.co.za'; // TODO: Load from user_profiles table
const WAREHOUSE_TEAM_LEADER_EMAIL = 'warehouse.teamleader@kangopak.co.za'; // TODO: Load from user_profiles table
const COMMERCIAL_MANAGER_EMAIL = 'commercial.manager@kangopak.co.za'; // TODO: Load from user_profiles table

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
   * Send Supplier NCA Notification
   * Procedure 5.7: NCA is emailed to the material supplier if applicable
   */
  async sendSupplierNCANotification(payload: SupplierNCANotificationPayload): Promise<void> {
    const emailSubject = `Non-Conformance Advice (NCA) - ${payload.nca_number}`;
    const emailBody = this.buildSupplierNCANotificationEmailBody(payload);
    await this.sendEmailTo(payload.supplier_email, emailSubject, emailBody);
  }

  /**
   * Send Overdue NCA Alert
   * Procedure 5.7: Weekly review - alert Commercial Manager of overdue NCAs
   */
  async sendOverdueNCAAlert(payload: OverdueNCAPayload): Promise<void> {
    const emailSubject = `⚠️ Overdue NCA Alert - ${payload.overdue_count} NCA(s) Exceeding 20 Working Days`;
    const emailBody = this.buildOverdueNCAAlertEmailBody(payload);
    await this.sendEmailTo(COMMERCIAL_MANAGER_EMAIL, emailSubject, emailBody);
  }

  /**
   * Send Daily NCA Reminder
   * Procedure 5.7: Daily reminder to Warehouse Team Leader for new NCAs
   */
  async sendDailyNCAReminder(payload: DailyNCAReminderPayload): Promise<void> {
    const emailSubject = `Daily NCA Check Reminder - ${payload.new_nca_count} New NCA(s)`;
    const emailBody = this.buildDailyNCAReminderEmailBody(payload);
    await this.sendEmailTo(WAREHOUSE_TEAM_LEADER_EMAIL, emailSubject, emailBody);
  }

  /**
   * Send Weekly NCA Review
   * Procedure 5.7: Weekly NCA Register review for Commercial Manager
   */
  async sendWeeklyNCAReview(payload: WeeklyNCAReviewPayload): Promise<void> {
    const emailSubject = `Weekly NCA Register Review - ${payload.overdue_count} Overdue, ${payload.approaching_due_count} Approaching Due`;
    const emailBody = this.buildWeeklyNCAReviewEmailBody(payload);
    await this.sendEmailTo(COMMERCIAL_MANAGER_EMAIL, emailSubject, emailBody);
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
   * Build Supplier NCA Notification email body
   */
  private buildSupplierNCANotificationEmailBody(payload: SupplierNCANotificationPayload): string {
    try {
      // Load email template
      const templatePath = join(process.cwd(), 'lib', 'templates', 'email', 'supplier-nca-notification.html');
      let template = readFileSync(templatePath, 'utf-8');

      // Replace template variables
      template = template.replace(/\{\{SUPPLIER_NAME\}\}/g, payload.supplier_name || 'Supplier');
      template = template.replace(/\{\{NCA_NUMBER\}\}/g, payload.nca_number);
      template = template.replace(/\{\{DATE\}\}/g, payload.date);
      template = template.replace(/\{\{PRODUCT_DESCRIPTION\}\}/g, payload.product_description || 'N/A');
      template = template.replace(/\{\{SUPPLIER_WO_BATCH\}\}/g, payload.supplier_wo_batch || 'N/A');
      template = template.replace(/\{\{SUPPLIER_REEL_BOX\}\}/g, payload.supplier_reel_box || 'N/A');
      template = template.replace(/\{\{QUANTITY\}\}/g, payload.quantity?.toString() || 'N/A');
      template = template.replace(/\{\{QUANTITY_UNIT\}\}/g, payload.quantity_unit || '');
      template = template.replace(/\{\{NC_DESCRIPTION\}\}/g, payload.nc_description || 'No description provided');

      return template;
    } catch (error) {
      console.error('Failed to load supplier NCA notification template:', error);
      // Fallback to simple text email
      return this.buildSupplierNCANotificationEmailBodyFallback(payload);
    }
  }

  /**
   * Fallback supplier NCA notification email body (if template fails to load)
   */
  private buildSupplierNCANotificationEmailBodyFallback(payload: SupplierNCANotificationPayload): string {
    return `
<html>
<body>
  <h2>Non-Conformance Advice (NCA)</h2>
  <p>Dear ${payload.supplier_name},</p>
  <p>This email is to notify you of a Non-Conformance Advice (NCA) that has been raised for raw material supplied by your company.</p>
  <hr />
  <p><strong>NCA Number:</strong> ${payload.nca_number}</p>
  <p><strong>Date:</strong> ${payload.date}</p>
  <p><strong>Product Description:</strong> ${payload.product_description}</p>
  <p><strong>Supplier WO/Batch:</strong> ${payload.supplier_wo_batch || 'N/A'}</p>
  <p><strong>Supplier Reel/Box:</strong> ${payload.supplier_reel_box || 'N/A'}</p>
  <p><strong>Quantity:</strong> ${payload.quantity || 'N/A'} ${payload.quantity_unit || ''}</p>
  <hr />
  <p><strong>Non-Conformance Description:</strong></p>
  <p>${payload.nc_description}</p>
  <hr />
  <p style="color: #666; font-size: 12px;">
    This is an automated notification from the OHiSee NCA system.<br>
    Procedure 5.7 - Control of Non-Conforming Product<br>
    Please do not reply to this email. Contact the Warehouse Team Leader for inquiries.
  </p>
</body>
</html>
    `.trim();
  }

  /**
   * Build Overdue NCA Alert email body
   */
  private buildOverdueNCAAlertEmailBody(payload: OverdueNCAPayload): string {
    try {
      const templatePath = join(process.cwd(), 'lib', 'templates', 'email', 'nca-overdue-alert.html');
      let template = readFileSync(templatePath, 'utf-8');

      // Build NCA list HTML
      const ncaListHtml = payload.overdue_ncas.map((nca) => {
        return `
        <div style="padding: 10px; margin: 10px 0; border-left: 3px solid #dc2626; background-color: #fef2f2;">
          <p style="margin: 0; font-weight: bold;">${nca.nca_number}</p>
          <p style="margin: 5px 0; font-size: 14px; color: #666;">
            Type: ${nca.nc_type} | Supplier: ${nca.supplier_name || 'N/A'} | 
            Days Overdue: <strong style="color: #dc2626;">${nca.days_overdue}</strong>
          </p>
          <p style="margin: 5px 0; font-size: 12px; color: #666;">
            Due Date: ${nca.close_out_due_date} | Created: ${nca.date}
          </p>
        </div>
        `;
      }).join('');

      template = template.replace(/\{\{OVERDUE_COUNT\}\}/g, payload.overdue_count.toString());
      template = template.replace(/\{\{OVERDUE_NCA_LIST\}\}/g, ncaListHtml || '<p>No overdue NCAs</p>');

      return template;
    } catch (error) {
      console.error('Failed to load overdue NCA alert template:', error);
      return this.buildOverdueNCAAlertEmailBodyFallback(payload);
    }
  }

  /**
   * Fallback overdue NCA alert email body
   */
  private buildOverdueNCAAlertEmailBodyFallback(payload: OverdueNCAPayload): string {
    const ncaList = payload.overdue_ncas.map((nca) => 
      `- ${nca.nca_number} (${nca.nc_type}) - ${nca.days_overdue} days overdue`
    ).join('\n');

    return `
<html>
<body>
  <h2>⚠️ Overdue NCA Alert</h2>
  <p>Dear Commercial Manager,</p>
  <p>This email is to notify you that <strong>${payload.overdue_count}</strong> NCA(s) have exceeded the 20 working day close-out requirement.</p>
  <hr />
  <h3>Overdue NCAs:</h3>
  <pre>${ncaList}</pre>
  <hr />
  <p style="color: #666; font-size: 12px;">
    This is an automated alert from the OHiSee NCA system.<br>
    Procedure 5.7 - Control of Non-Conforming Product
  </p>
</body>
</html>
    `.trim();
  }

  /**
   * Build Daily NCA Reminder email body
   */
  private buildDailyNCAReminderEmailBody(payload: DailyNCAReminderPayload): string {
    try {
      const templatePath = join(process.cwd(), 'lib', 'templates', 'email', 'nca-daily-reminder.html');
      let template = readFileSync(templatePath, 'utf-8');

      // Build NCA list HTML
      const ncaListHtml = payload.new_ncas.map((nca) => {
        return `
        <div style="padding: 10px; margin: 10px 0; border-left: 3px solid #1e40af; background-color: #eff6ff;">
          <p style="margin: 0; font-weight: bold;">${nca.nca_number}</p>
          <p style="margin: 5px 0; font-size: 14px; color: #666;">
            Type: ${nca.nc_type} | Supplier: ${nca.supplier_name || 'N/A'} | 
            Product: ${nca.nc_product_description}
          </p>
          <p style="margin: 5px 0; font-size: 12px; color: #666;">
            Created: ${new Date(nca.created_at).toLocaleString('en-GB')}
          </p>
        </div>
        `;
      }).join('');

      template = template.replace(/\{\{NEW_NCA_COUNT\}\}/g, payload.new_nca_count.toString());
      template = template.replace(/\{\{NEW_NCA_LIST\}\}/g, ncaListHtml || '<p>No new NCAs</p>');

      return template;
    } catch (error) {
      console.error('Failed to load daily NCA reminder template:', error);
      return this.buildDailyNCAReminderEmailBodyFallback(payload);
    }
  }

  /**
   * Fallback daily NCA reminder email body
   */
  private buildDailyNCAReminderEmailBodyFallback(payload: DailyNCAReminderPayload): string {
    const ncaList = payload.new_ncas.map((nca) => 
      `- ${nca.nca_number} (${nca.nc_type}) - ${nca.nc_product_description}`
    ).join('\n');

    return `
<html>
<body>
  <h2>Daily NCA Check Reminder</h2>
  <p>Dear Warehouse Team Leader,</p>
  <p>This is your daily reminder to check the NCA book for any new NCAs that may have been raised during the previous shifts.</p>
  <hr />
  <h3>New NCAs Created Today:</h3>
  <p><strong>${payload.new_nca_count} new NCA(s)</strong></p>
  <pre>${ncaList}</pre>
  <hr />
  <p style="color: #666; font-size: 12px;">
    This is an automated daily reminder from the OHiSee NCA system.<br>
    Procedure 5.7 - Control of Non-Conforming Product
  </p>
</body>
</html>
    `.trim();
  }

  /**
   * Build Weekly NCA Review email body
   */
  private buildWeeklyNCAReviewEmailBody(payload: WeeklyNCAReviewPayload): string {
    const overdueList = payload.overdue_ncas.map((nca) => 
      `- ${nca.nca_number} (${nca.nc_type}) - ${nca.days_overdue} days overdue - Due: ${nca.close_out_due_date}`
    ).join('\n');

    const approachingList = payload.approaching_due_ncas.map((nca) => 
      `- ${nca.nca_number} (${nca.nc_type}) - ${nca.days_remaining} days remaining - Due: ${nca.close_out_due_date}`
    ).join('\n');

    return `
<html>
<body>
  <h2>Weekly NCA Register Review</h2>
  <p>Dear Commercial Manager,</p>
  <p>This is your weekly NCA Register review summary.</p>
  <hr />
  <h3>Summary Statistics</h3>
  <p><strong>Total NCAs:</strong> ${payload.total_ncas}</p>
  <p><strong>Overdue NCAs:</strong> ${payload.overdue_count}</p>
  <p><strong>Approaching Due Date (within 3 days):</strong> ${payload.approaching_due_count}</p>
  <hr />
  <h3>Overdue NCAs (Action Required)</h3>
  <pre>${overdueList || 'No overdue NCAs'}</pre>
  <hr />
  <h3>NCAs Approaching Due Date</h3>
  <pre>${approachingList || 'No NCAs approaching due date'}</pre>
  <hr />
  <p style="color: #666; font-size: 12px;">
    This is an automated weekly review from the OHiSee NCA system.<br>
    Procedure 5.7 - Control of Non-Conforming Product<br>
    Weekly NCA Register Review - Commercial Manager
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

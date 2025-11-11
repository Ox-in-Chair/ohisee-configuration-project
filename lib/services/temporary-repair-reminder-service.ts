/**
 * Temporary Repair Reminder Service
 * Sends reminders for temporary repairs approaching 14-day BRCGS limit
 * Schedule: Day 10, Day 13, Day 14 before close_out_due_date
 */

import { createServerClient } from '@/lib/database/client';
import { createProductionNotificationService } from './create-notification-service';
import type { TemporaryRepairReminderPayload } from '@/lib/types/notification';

/**
 * Get temporary repairs due for reminders
 * Returns MJCs with temporary repairs that need reminders sent
 */
export async function getTemporaryRepairsDueForReminders(): Promise<
  Array<{
    id: string;
    job_card_number: string;
    machine_equipment: string;
    close_out_due_date: string;
    days_remaining: number;
  }>
> {
  const supabase = createServerClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate reminder dates (10, 13, 14 days before due date)
  const day10 = new Date(today);
  day10.setDate(today.getDate() + 10);
  const day13 = new Date(today);
  day13.setDate(today.getDate() + 13);
  const day14 = new Date(today);
  day14.setDate(today.getDate() + 14);

  // Fetch MJCs with temporary repairs due in 10, 13, or 14 days
  const { data, error } = await supabase
    .from('mjcs')
    .select('id, job_card_number, machine_equipment, close_out_due_date')
    .eq('temporary_repair', true)
    .not('close_out_due_date', 'is', null)
    .neq('status', 'closed')
    .in('close_out_due_date', [
      day10.toISOString().split('T')[0],
      day13.toISOString().split('T')[0],
      day14.toISOString().split('T')[0],
    ]);

  if (error || !data) {
    return [];
  }

  // Calculate days remaining for each MJC
  return data.map((mjc: any) => {
    const dueDate = new Date(mjc.close_out_due_date);
    const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return {
      id: mjc.id,
      job_card_number: mjc.job_card_number,
      machine_equipment: mjc.machine_equipment || 'Unknown',
      close_out_due_date: mjc.close_out_due_date,
      days_remaining: daysRemaining,
    };
  });
}

/**
 * Send temporary repair reminders
 * Called by cron job or scheduled task
 */
export async function sendTemporaryRepairReminders(): Promise<{
  sent: number;
  failed: number;
}> {
  const repairs = await getTemporaryRepairsDueForReminders();
  const notificationService = createProductionNotificationService();
  let sent = 0;
  let failed = 0;

  for (const repair of repairs) {
    try {
      const payload: TemporaryRepairReminderPayload = {
        mjc_number: repair.job_card_number,
        machine_equipment: repair.machine_equipment,
        due_date: repair.close_out_due_date,
        days_remaining: repair.days_remaining,
      };

      await notificationService.sendTemporaryRepairReminder(payload);
      sent++;
    } catch (error) {
      console.error(`Failed to send reminder for MJC ${repair.job_card_number}:`, error);
      failed++;
    }
  }

  return { sent, failed };
}


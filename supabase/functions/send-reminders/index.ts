/**
 * Supabase Edge Function: Send Temporary Repair Reminders
 * Scheduled to run daily via Supabase Cron or Vercel Cron
 * Sends reminders for temporary repairs approaching 14-day BRCGS limit
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get temporary repairs due for reminders
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const day10 = new Date(today);
    day10.setDate(today.getDate() + 10);
    const day13 = new Date(today);
    day13.setDate(today.getDate() + 13);
    const day14 = new Date(today);
    day14.setDate(today.getDate() + 14);

    const { data: repairs, error } = await supabase
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

    if (error) {
      throw new Error(`Failed to fetch repairs: ${error.message}`);
    }

    // Calculate days remaining and send reminders
    const results = {
      sent: 0,
      failed: 0,
      repairs: [] as any[],
    };

    for (const repair of repairs || []) {
      const dueDate = new Date(repair.close_out_due_date);
      const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Log notification attempt
      const { error: logError } = await supabase.from('notifications').insert({
        notification_type: 'temporary_repair_reminder',
        recipient_email: 'maintenance.manager@kangopak.co.za', // TODO: Load from user_profiles
        subject: `Temporary Repair Reminder - ${repair.job_card_number} (${daysRemaining} days remaining)`,
        body: `MJC ${repair.job_card_number} has ${daysRemaining} days remaining before the 14-day BRCGS limit.`,
        status: 'sent',
        sent_at: new Date().toISOString(),
        entity_type: 'mjc',
        entity_id: repair.id,
        metadata: {
          days_remaining: daysRemaining,
          due_date: repair.close_out_due_date,
        },
      });

      if (logError) {
        console.error(`Failed to log notification for ${repair.job_card_number}:`, logError);
        results.failed++;
      } else {
        results.sent++;
        results.repairs.push({
          mjc_number: repair.job_card_number,
          days_remaining: daysRemaining,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.sent + results.failed} reminders`,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in send-reminders function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});


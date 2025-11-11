/**
 * Supabase Edge Function: Send Weekly NCA Review
 * Procedure 5.7: Weekly NCA Register review for Commercial Manager
 * Runs weekly via cron job to send review report
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get total NCA count (excluding closed)
    const { count: totalCount, error: totalError } = await supabase
      .from('ncas')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'closed');

    if (totalError) {
      console.error('Error counting total NCAs:', totalError);
    }

    // Get overdue NCAs
    const today = new Date().toISOString().split('T')[0];
    const { data: overdueNCAs, error: overdueError } = await supabase
      .from('ncas')
      .select('nca_number, date, close_out_due_date, nc_type, supplier_name')
      .neq('status', 'closed')
      .lt('close_out_due_date', today)
      .order('close_out_due_date', { ascending: true });

    if (overdueError) {
      console.error('Error fetching overdue NCAs:', overdueError);
    }

    // Get NCAs approaching due date (within 3 days)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const threeDaysFromNowStr = threeDaysFromNow.toISOString().split('T')[0];

    const { data: approachingNCAs, error: approachingError } = await supabase
      .from('ncas')
      .select('nca_number, date, close_out_due_date, nc_type, supplier_name')
      .neq('status', 'closed')
      .gte('close_out_due_date', today)
      .lte('close_out_due_date', threeDaysFromNowStr)
      .order('close_out_due_date', { ascending: true });

    if (approachingError) {
      console.error('Error fetching approaching due NCAs:', approachingError);
    }

    // Calculate days overdue/remaining
    const overdueFormatted = (overdueNCAs || []).map((nca) => {
      const dueDate = new Date(nca.close_out_due_date);
      const todayDate = new Date(today);
      const daysOverdue = Math.floor((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        ...nca,
        days_overdue: daysOverdue,
      };
    });

    const approachingFormatted = (approachingNCAs || []).map((nca) => {
      const dueDate = new Date(nca.close_out_due_date);
      const todayDate = new Date(today);
      const daysRemaining = Math.ceil((dueDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        ...nca,
        days_remaining: daysRemaining,
      };
    });

    const reviewPayload = {
      total_ncas: totalCount || 0,
      overdue_count: overdueFormatted.length,
      approaching_due_count: approachingFormatted.length,
      overdue_ncas: overdueFormatted,
      approaching_due_ncas: approachingFormatted,
    };

    // TODO: Send email notification to Commercial Manager
    // For now, just log the review data
    console.log('Weekly NCA Review:', reviewPayload);

    return new Response(
      JSON.stringify({
        success: true,
        review: reviewPayload,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});


/**
 * Supabase Edge Function: Send NCA Daily Reminder
 * Procedure 5.7: Daily reminder to Warehouse Team Leader for new NCAs
 * Sends email notification with list of new NCAs that need review
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

    // Get new NCAs created in the last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sinceISO = since.toISOString();

    const { data: newNCAs, error: ncaError } = await supabase
      .from('ncas')
      .select('nca_number, date, nc_type, supplier_name, nc_product_description, status, created_at')
      .gte('created_at', sinceISO)
      .in('status', ['submitted', 'under-review'])
      .order('created_at', { ascending: false });

    if (ncaError) {
      console.error('Error fetching new NCAs:', ncaError);
      return new Response(
        JSON.stringify({ error: ncaError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const ncaCount = newNCAs?.length || 0;

    // If no new NCAs, return success with count 0
    if (ncaCount === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          nca_count: 0,
          message: 'No new NCAs to review',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // TODO: Send email notification to Warehouse Team Leader
    // For now, just log the NCAs
    console.log(`Found ${ncaCount} new NCAs for daily reminder:`, newNCAs);

    // Format NCA list for email
    const ncaList = newNCAs?.map((nca) => {
      return `- ${nca.nca_number} (${nca.nc_type}) - ${nca.nc_product_description || 'N/A'}`;
    }).join('\n') || '';

    // TODO: Integrate with notification service to send email
    // This would call the notification service to send email to Warehouse Team Leader
    // For now, we'll return the data and the actual email sending can be done
    // via a separate service or integrated here

    return new Response(
      JSON.stringify({
        success: true,
        nca_count: ncaCount,
        ncas: newNCAs,
        message: `Found ${ncaCount} new NCA(s) for review`,
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


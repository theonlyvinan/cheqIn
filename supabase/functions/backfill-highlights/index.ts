import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Starting backfill process...');

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Fetch all check-ins with empty highlights or concerns
    const { data: checkIns, error: fetchError } = await supabaseClient
      .from('check_ins')
      .select('id, transcript, highlights, concerns')
      .or('highlights.eq.[],concerns.eq.[]');

    if (fetchError) {
      console.error('Error fetching check-ins:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${checkIns?.length || 0} check-ins to process`);

    if (!checkIns || checkIns.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No check-ins need backfilling', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processed = 0;
    let failed = 0;

    // Process each check-in
    for (const checkIn of checkIns) {
      try {
        console.log(`Processing check-in ${checkIn.id}...`);

        // Re-analyze the transcript
        const analysisResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze-sentiment`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            },
            body: JSON.stringify({ text: checkIn.transcript }),
          }
        );

        if (!analysisResponse.ok) {
          console.error(`Failed to analyze check-in ${checkIn.id}`);
          failed++;
          continue;
        }

        const sentimentData = await analysisResponse.json();
        console.log(`Analysis complete for ${checkIn.id}:`, {
          highlights: sentimentData.highlights?.length || 0,
          concerns: sentimentData.concerns?.length || 0
        });

        // Update the check-in with new highlights and concerns
        const { error: updateError } = await supabaseClient
          .from('check_ins')
          .update({
            highlights: sentimentData.highlights || [],
            concerns: sentimentData.concerns || [],
          })
          .eq('id', checkIn.id);

        if (updateError) {
          console.error(`Error updating check-in ${checkIn.id}:`, updateError);
          failed++;
        } else {
          processed++;
          console.log(`Successfully updated check-in ${checkIn.id}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error processing check-in ${checkIn.id}:`, error);
        failed++;
      }
    }

    console.log(`Backfill complete. Processed: ${processed}, Failed: ${failed}`);

    return new Response(
      JSON.stringify({ 
        message: 'Backfill complete', 
        processed, 
        failed,
        total: checkIns.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in backfill-highlights:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
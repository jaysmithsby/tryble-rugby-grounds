import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { score } = await req.json();

    // Validate score
    if (typeof score !== 'number' || score < 0) {
      console.error('Invalid score:', score);
      return new Response(
        JSON.stringify({ error: 'Invalid score. Must be a non-negative number.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current time in South Africa timezone (SAST - UTC+2)
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Africa/Johannesburg',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    };
    
    const formatter = new Intl.DateTimeFormat('en-ZA', options);
    const parts = formatter.formatToParts(now);
    
    const getPartValue = (type: string) => 
      parts.find(part => part.type === type)?.value || '';
    
    const year = parseInt(getPartValue('year'));
    const month = parseInt(getPartValue('month'));
    const day = parseInt(getPartValue('day'));
    const hour = parseInt(getPartValue('hour'));
    const minute = parseInt(getPartValue('minute'));
    
    // Create date in SAST
    const sastNow = new Date(year, month - 1, day, hour, minute);
    const dayOfWeek = sastNow.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
    
    console.log('Current SAST time:', sastNow.toISOString());
    console.log('Day of week:', dayOfWeek, 'Hour:', hour);

    // Check if it's within the allowed window:
    // Friday 5 PM (17:00) through Sunday 11:59 PM (23:59)
    let isWithinWindow = false;

    if (dayOfWeek === 5) {
      // Friday - must be 5 PM or later
      isWithinWindow = hour >= 17;
    } else if (dayOfWeek === 6) {
      // Saturday - any time
      isWithinWindow = true;
    } else if (dayOfWeek === 0) {
      // Sunday - must be before midnight
      isWithinWindow = hour < 24;
    }

    console.log('Is within submission window:', isWithinWindow);

    if (!isWithinWindow) {
      return new Response(
        JSON.stringify({
          error: 'Submissions are only allowed Friday 5 PM through Sunday 11:59 PM (SAST)',
          allowed: false,
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already submitted a score this weekend
    const startOfWeekend = new Date(sastNow);
    startOfWeekend.setDate(sastNow.getDate() - ((dayOfWeek + 7 - 5) % 7)); // Go back to Friday
    startOfWeekend.setHours(17, 0, 0, 0);

    const { data: existingScore, error: checkError } = await supabaseClient
      .from('game_scores')
      .select('id')
      .eq('user_id', user.id)
      .gte('submitted_at', startOfWeekend.toISOString())
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing score:', checkError);
      return new Response(
        JSON.stringify({ error: 'Failed to check existing submissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingScore) {
      return new Response(
        JSON.stringify({
          error: 'You have already submitted a score for this weekend',
          allowed: false,
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert the score
    const { data: insertedScore, error: insertError } = await supabaseClient
      .from('game_scores')
      .insert({
        user_id: user.id,
        score: score,
        status: 'pending_review',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting score:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to submit score' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Score submitted successfully:', insertedScore);

    return new Response(
      JSON.stringify({
        success: true,
        data: insertedScore,
        message: 'Score submitted successfully and pending review',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

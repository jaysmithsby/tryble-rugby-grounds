import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit: 20 requests per hour per admin
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MINUTES = 60;

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with auth context
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
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is an admin
    const { data: roles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (rolesError || !roles) {
      console.error('Authorization error: User is not an admin');
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create service role client for rate limiting
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check rate limit
    const { data: rateLimitResult, error: rateLimitError } = await supabaseService
      .rpc("check_rate_limit", {
        p_identifier: user.id,
        p_endpoint: "automate-school",
        p_max_requests: RATE_LIMIT_MAX,
        p_window_minutes: RATE_LIMIT_WINDOW_MINUTES
      });

    if (rateLimitError) {
      console.error("Rate limit check failed:", rateLimitError);
      // Continue anyway - don't block on rate limit errors
    } else if (rateLimitResult && rateLimitResult[0] && !rateLimitResult[0].allowed) {
      const resetAt = new Date(rateLimitResult[0].reset_at).toLocaleTimeString();
      return new Response(
        JSON.stringify({ 
          error: `Too many automation requests. Please try again after ${resetAt}`,
          remaining: 0 
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { school_name } = await req.json();

    if (!school_name) {
      return new Response(
        JSON.stringify({ error: "school_name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and sanitize school_name input
    const sanitizedSchoolName = String(school_name).trim().slice(0, 200);
    if (!sanitizedSchoolName) {
      return new Response(
        JSON.stringify({ error: "Invalid school_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Admin ${user.id} fetching data for school: ${sanitizedSchoolName}`);

    const webhookUrl = Deno.env.get('N8N_SCHOOL_WEBHOOK_URL');
    if (!webhookUrl) {
      console.error('N8N_SCHOOL_WEBHOOK_URL secret is not configured');
      return new Response(
        JSON.stringify({ error: 'School automation service not configured' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ school_name: sanitizedSchoolName }),
    });

    if (!response.ok) {
      console.error(`Webhook returned status: ${response.status}`);
      return new Response(
        JSON.stringify({ error: `Webhook error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("Webhook response received successfully");
    
    // If the webhook returns an array, extract the first item to simplify client handling
    const responseData = Array.isArray(data) && data.length > 0 ? data[0] : data;

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in automate-school function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

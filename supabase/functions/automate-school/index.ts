/**
 * School Automation Edge Function
 * 
 * DATA FLOW DISCLOSURE:
 * This function sends school names to an external n8n webhook for automated data enrichment.
 * - Data sent: School name only (public, non-PII data)
 * - Third-party: n8n Cloud (user-controlled workflow)
 * - Purpose: Fetch publicly available school information (motto, colors, etc.)
 * - Retention: Data processed transiently, not stored by the webhook
 * 
 * SECURITY CONTROLS:
 * - Admin-only access (role verified)
 * - Rate limited (20 requests/hour)
 * - Input sanitization applied
 * - Audit logging of admin actions
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit: 20 requests per hour per admin
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MINUTES = 60;

// ============= Structured Logger with PII Sanitization =============
type LogLevel = "debug" | "info" | "warn" | "error";

const PII_PATTERNS = [
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: "[EMAIL_REDACTED]" },
  { pattern: /\b\d{10,15}\b/g, replacement: "[PHONE_REDACTED]" },
  { pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, replacement: "[UUID_REDACTED]" },
  { pattern: /Bearer\s+[A-Za-z0-9\-._~+\/]+=*/g, replacement: "Bearer [TOKEN_REDACTED]" },
  { pattern: /\b(sk_live_|pk_live_|sk_test_|pk_test_)[A-Za-z0-9]+/g, replacement: "[API_KEY_REDACTED]" },
];

function sanitizePII(value: unknown): string {
  let str = typeof value === "string" ? value : JSON.stringify(value);
  for (const { pattern, replacement } of PII_PATTERNS) {
    str = str.replace(pattern, replacement);
  }
  return str;
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    function: "automate-school",
    message: sanitizePII(message),
    ...(context ? { context: JSON.parse(sanitizePII(context)) } : {}),
  };
  
  const logFn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  logFn(JSON.stringify(entry));
}
// ============= End Logger =============

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
      log("warn", "Authentication failed", { error: userError?.message });
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
      log("warn", "Authorization failed - user is not admin", { userId: user.id });
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
      log("error", "Rate limit check failed", { error: rateLimitError.message });
      // Continue anyway - don't block on rate limit errors
    } else if (rateLimitResult && rateLimitResult[0] && !rateLimitResult[0].allowed) {
      const resetAt = new Date(rateLimitResult[0].reset_at).toLocaleTimeString();
      log("info", "Rate limit exceeded", { userId: user.id, resetAt });
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

    log("info", "Fetching school data", { schoolName: sanitizedSchoolName, adminId: user.id });

    const webhookUrl = Deno.env.get('N8N_SCHOOL_WEBHOOK_URL');
    if (!webhookUrl) {
      log("error", "N8N_SCHOOL_WEBHOOK_URL secret is not configured");
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
      log("error", "Webhook request failed", { status: response.status });
      return new Response(
        JSON.stringify({ error: `Webhook error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    log("info", "Webhook response received successfully", { schoolName: sanitizedSchoolName });
    
    // If the webhook returns an array, extract the first item to simplify client handling
    const responseData = Array.isArray(data) && data.length > 0 ? data[0] : data;

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    log("error", "Unexpected error in automate-school function", { 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

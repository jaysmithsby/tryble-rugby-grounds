/**
 * Verify Parental Consent Edge Function
 * 
 * PUBLIC ENDPOINT - No authentication required
 * Parents verify consent via token in email link.
 * Supports dryRun mode to check token validity without verifying.
 * 
 * SECURITY CONTROLS:
 * - Token-based verification
 * - Token expiry validation
 * - PII redacted from logs
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============= Structured Logger with PII Sanitization =============
type LogLevel = "debug" | "info" | "warn" | "error";

const PII_PATTERNS = [
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: "[EMAIL_REDACTED]" },
  { pattern: /\b\d{10,15}\b/g, replacement: "[PHONE_REDACTED]" },
  { pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, replacement: "[UUID_REDACTED]" },
  { pattern: /Bearer\s+[A-Za-z0-9\-._~+\/]+=*/g, replacement: "Bearer [TOKEN_REDACTED]" },
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
    function: "verify-parental-consent",
    message: sanitizePII(message),
    ...(context ? { context: JSON.parse(sanitizePII(context)) } : {}),
  };
  
  const logFn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  logFn(JSON.stringify(entry));
}
// ============= End Logger =============

interface VerifyRequest {
  token: string;
  dryRun?: boolean;
}

async function getChildName(supabase: any, childUserId: string): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name")
    .eq("id", childUserId)
    .single();
  return profile?.first_name || "Your child";
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { token, dryRun }: VerifyRequest = await req.json();

    if (!token) {
      throw new Error("Missing consent token");
    }

    log("info", `Processing consent verification (dryRun: ${!!dryRun})`);

    // Look up the consent request (no join - query profiles separately)
    const { data: consentRequest, error: lookupError } = await supabase
      .from("parental_consent_requests")
      .select("*")
      .eq("consent_token", token)
      .maybeSingle();

    if (lookupError) {
      log("error", "Error looking up consent request", { error: lookupError.message });
      throw new Error("Failed to verify consent token");
    }

    if (!consentRequest) {
      log("warn", "Invalid consent token provided");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid or expired consent link",
          code: "INVALID_TOKEN",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const childFirstName = await getChildName(supabase, consentRequest.child_user_id);

    // Check if already verified
    if (consentRequest.status === "verified") {
      log("info", "Consent already verified");
      return new Response(
        JSON.stringify({
          success: true,
          alreadyVerified: true,
          childFirstName,
          message: "Consent has already been verified",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if expired
    if (consentRequest.status === "expired" || 
        (consentRequest.expires_at && new Date(consentRequest.expires_at) < new Date())) {
      log("warn", "Expired consent token used");
      return new Response(
        JSON.stringify({
          success: false,
          error: "This consent link has expired",
          code: "TOKEN_EXPIRED",
          childFirstName,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if revoked
    if (consentRequest.status === "revoked") {
      log("warn", "Revoked consent token used");
      return new Response(
        JSON.stringify({
          success: false,
          error: "This consent request has been revoked",
          code: "TOKEN_REVOKED",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // If dry run, return token info without verifying
    if (dryRun) {
      log("info", "Dry run - token is valid");
      return new Response(
        JSON.stringify({
          success: true,
          alreadyVerified: false,
          childFirstName,
          message: "Token is valid",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Update the consent request to verified
    const { error: updateConsentError } = await supabase
      .from("parental_consent_requests")
      .update({
        status: "verified",
        verified_at: new Date().toISOString(),
      })
      .eq("id", consentRequest.id);

    if (updateConsentError) {
      log("error", "Error updating consent request", { error: updateConsentError.message });
      throw new Error("Failed to verify consent");
    }

    // Update the child's profile
    const { error: updateProfileError } = await supabase
      .from("profiles")
      .update({
        consent_status: "verified",
      })
      .eq("id", consentRequest.child_user_id);

    if (updateProfileError) {
      log("error", "Error updating profile", { error: updateProfileError.message });
    }

    log("info", "Parental consent verified successfully");

    return new Response(
      JSON.stringify({
        success: true,
        alreadyVerified: false,
        childFirstName,
        message: "Consent verified successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    log("error", "Error in verify-parental-consent", { 
      error: error.message || "Internal server error" 
    });
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

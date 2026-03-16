/**
 * Confirm Email Verification Edge Function
 * 
 * Validates a verification token and marks the user's email as confirmed.
 * This is called when user clicks the verification link.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      throw new Error("Missing verification token");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // ── Rate limiting ──────────────────────────────────────────
    const forwarded = req.headers.get("x-forwarded-for");
    const clientIp = forwarded ? forwarded.split(",")[0].trim() : "unknown";

    const { data: rlData } = await supabase.rpc("check_rate_limit", {
      p_identifier: clientIp,
      p_endpoint: "confirm-email-verification",
      p_max_requests: 5,
      p_window_minutes: 15,
    });

    if (rlData && rlData.length > 0 && !rlData[0].allowed) {
      const resetAt = rlData[0].reset_at;
      const retryAfter = Math.max(1, Math.ceil((new Date(resetAt).getTime() - Date.now()) / 1000));
      return new Response(
        JSON.stringify({ error: "Too many attempts. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
            ...corsHeaders,
          },
        }
      );
    }

    // ── Token lookup ───────────────────────────────────────────
    const { data: tokenRecord, error: tokenError } = await supabase
      .from("email_verification_tokens")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (tokenError) {
      console.error("Error fetching token:", tokenError.message);
      throw new Error("Failed to verify token");
    }

    if (!tokenRecord) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid or expired verification link",
          code: "INVALID_TOKEN"
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if token is expired
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ 
          error: "Verification link has expired. Please request a new one.",
          code: "TOKEN_EXPIRED"
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if token was already used
    if (tokenRecord.used_at) {
      return new Response(
        JSON.stringify({ 
          error: "This verification link has already been used.",
          code: "TOKEN_USED"
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark the token as used
    const { error: updateTokenError } = await supabase
      .from("email_verification_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenRecord.id);

    if (updateTokenError) {
      console.error("Error updating token:", updateTokenError.message);
    }

    // Update the user's email_confirmed_at using admin API
    const { error: updateUserError } = await supabase.auth.admin.updateUserById(
      tokenRecord.user_id,
      { email_confirm: true }
    );

    if (updateUserError) {
      console.error("Error confirming user email:", updateUserError.message);
      throw new Error("Failed to confirm email");
    }

    console.log("Email verified successfully for user:", tokenRecord.user_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email verified successfully",
        userId: tokenRecord.user_id,
        email: tokenRecord.email,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in confirm-email-verification:", error.message);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

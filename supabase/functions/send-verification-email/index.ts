/**
 * Send Verification Email Edge Function
 * 
 * Accepts { email } in request body (no JWT required since unconfirmed users have no session).
 * Looks up user via admin API, generates a verification token, and sends a branded email via Resend.
 * Returns a generic success response on all code paths to prevent user enumeration.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GENERIC_SUCCESS = {
  success: true,
  message: "If an account exists, a verification email has been sent.",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

async function sendEmailWithRetry(
  emailConfig: Parameters<typeof resend.emails.send>[0],
  attempt = 1
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await resend.emails.send(emailConfig);
    if (response.error) {
      throw new Error(response.error.message || "Resend API error");
    }
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    if (attempt < MAX_RETRIES) {
      const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`Email send attempt ${attempt} failed, retrying in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return sendEmailWithRetry(emailConfig, attempt + 1);
    }
    console.error(`Email send failed after ${MAX_RETRIES} attempts:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate email from request body
    let email: string;
    try {
      const body = await req.json();
      email = (body.email || "").trim().toLowerCase();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Rate limit: 1 request per 60 seconds per email
    const { data: rateLimitData, error: rateLimitError } = await supabase.rpc("check_rate_limit", {
      p_identifier: email,
      p_endpoint: "send-verification-email",
      p_max_requests: 1,
      p_window_minutes: 1,
    });

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError.message);
      // Fail open but log — don't block the user on a rate limit DB error
    } else if (rateLimitData && rateLimitData.length > 0 && !rateLimitData[0].allowed) {
      // Rate limited — still return generic success to prevent enumeration
      console.log("Rate limited for email:", email.substring(0, 3) + "***");
      return new Response(
        JSON.stringify(GENERIC_SUCCESS),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Look up user by email: query profiles table (contact_value stores email),
    // then verify auth status via admin API
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("contact_value", email)
      .limit(1)
      .maybeSingle();

    if (profileError) {
      console.error("Profile lookup error:", profileError.message);
      return new Response(
        JSON.stringify(GENERIC_SUCCESS),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!profileData) {
      // No user found — return generic success (no enumeration)
      console.log("No profile found for email, returning generic success");
      return new Response(
        JSON.stringify(GENERIC_SUCCESS),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify auth user exists and check confirmation status
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(profileData.id);

    if (authError || !authData?.user) {
      console.error("Auth user lookup error:", authError?.message);
      return new Response(
        JSON.stringify(GENERIC_SUCCESS),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const targetUser = authData.user;

    // Check if already verified
    if (targetUser.email_confirmed_at) {
      console.log("User already verified, returning generic success");
      return new Response(
        JSON.stringify(GENERIC_SUCCESS),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Invalidate any existing tokens for this user
    await supabase
      .from("email_verification_tokens")
      .delete()
      .eq("user_id", targetUser.id);

    // Generate new verification token
    const verificationToken = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const { error: insertError } = await supabase
      .from("email_verification_tokens")
      .insert({
        user_id: targetUser.id,
        token: verificationToken,
        email: email,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Error storing token:", insertError.message);
      return new Response(
        JSON.stringify(GENERIC_SUCCESS),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build verification link
    const origin = req.headers.get("origin") || "https://tryble-rugby-grounds.lovable.app";
    const verificationLink = `${origin}/auth?token=${verificationToken}`;

    // Send email via Resend
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px; margin: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; }
    .header { background: #1B4332; padding: 30px; text-align: center; }
    .header h1 { color: #FFD60A; margin: 0; font-size: 28px; }
    .header p { color: #95D5B2; margin-top: 10px; margin-bottom: 0; }
    .content { padding: 30px; }
    .content p { color: #333; line-height: 1.6; margin: 16px 0; }
    .cta-button { display: block; background: #1B4332; color: #ffffff !important; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; text-align: center; margin: 30px auto; max-width: 250px; }
    .cta-button:hover { background: #2d5a47; }
    .expiry-note { text-align: center; font-size: 14px; color: #666; margin-top: 10px; }
    .link-fallback { font-size: 12px; color: #666; word-break: break-all; margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px; }
    .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏉 TRYBAL</h1>
      <p>Verify Your Email</p>
    </div>
    
    <div class="content">
      <p>Welcome to Trybal! 🎉</p>
      
      <p>Thanks for signing up. Click the button below to verify your email address and get started with South Africa's #1 schoolboy rugby predictions app.</p>
      
      <a href="${verificationLink}" class="cta-button">Verify My Email</a>
      
      <p class="expiry-note">This link expires in 24 hours.</p>
      
      <div class="link-fallback">
        <strong>Can't click the button?</strong> Copy and paste this link into your browser:<br><br>
        ${verificationLink}
      </div>
    </div>
    
    <div class="footer">
      <p>Trybal — Where School Pride Meets Predictions</p>
      <p>If you didn't create a Trybal account, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>
    `;

    const emailResult = await sendEmailWithRetry({
      from: "Trybal <noreply@trybal.co.za>",
      to: [email],
      subject: "Verify your Trybal email",
      html: emailHtml,
    });

    if (!emailResult.success) {
      console.error("Failed to send email:", emailResult.error);
      // Still return generic success
    } else {
      console.log("Verification email sent successfully to:", email.substring(0, 3) + "***");
    }

    return new Response(
      JSON.stringify(GENERIC_SUCCESS),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-verification-email:", error.message);
    // Return generic success even on unexpected errors to prevent enumeration
    return new Response(
      JSON.stringify(GENERIC_SUCCESS),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

/**
 * Parental Consent Email Edge Function
 * 
 * DATA FLOW DISCLOSURE (GDPR/POPIA Compliance):
 * This function sends parent email addresses to Resend for email delivery.
 * - Data sent: Parent email address, child's first name only
 * - Third-party: Resend (https://resend.com) - GDPR compliant, SOC 2 Type II certified
 * - Purpose: Deliver parental consent verification emails as required by child safety regulations
 * - Legal basis: Legitimate interest (child protection compliance)
 * - Data minimization: Only essential data (email, first name) is transmitted
 * - Retention: Resend retains delivery logs per their privacy policy
 * 
 * SECURITY CONTROLS:
 * - Authenticated users only
 * - Rate limited (5 requests/hour/user)
 * - Email change limits enforced (3 per 24h)
 * - Parent email capped at 10 children
 * - PII redacted from logs
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
      console.log(`Email send attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return sendEmailWithRetry(emailConfig, attempt + 1);
    }
    
    console.error(`Email send failed after ${MAX_RETRIES} attempts:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ConsentRequest {
  parentEmail: string;
  childFirstName: string;
  isUpdate?: boolean;
}

// Rate limit: 5 requests per hour per user
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MINUTES = 60;

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the user token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check rate limit
    const { data: rateLimitResult, error: rateLimitError } = await supabase
      .rpc("check_rate_limit", {
        p_identifier: user.id,
        p_endpoint: "send-parental-consent",
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
          error: `Too many requests. Please try again after ${resetAt}`,
          code: "RATE_LIMIT_EXCEEDED",
          resetAt: rateLimitResult[0].reset_at,
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { parentEmail, childFirstName, isUpdate }: ConsentRequest = await req.json();

    if (!parentEmail || !childFirstName) {
      throw new Error("Missing required fields: parentEmail and childFirstName");
    }

    const normalizedEmail = parentEmail.toLowerCase().trim();

    // Check parent email limit (max 10 children per email)
    const { data: limitCheck, error: limitError } = await supabase
      .rpc("check_parent_email_limit", { p_email: normalizedEmail });

    if (limitError) {
      console.error("Error checking email limit:", limitError);
      throw new Error("Failed to validate parent email");
    }

    if (!limitCheck) {
      return new Response(
        JSON.stringify({
          error: "This email has been used for too many accounts. Please use a different parent/guardian email.",
          code: "EMAIL_LIMIT_EXCEEDED",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if this is an email update and validate eligibility
    if (isUpdate) {
      const { data: canChange, error: changeError } = await supabase
        .rpc("can_change_parent_email", { p_user_id: user.id });

      if (changeError) {
        console.error("Error checking change eligibility:", changeError);
        throw new Error("Failed to validate email change eligibility");
      }

      const eligibility = canChange?.[0];
      if (!eligibility?.can_change) {
        const nextChangeTime = eligibility?.next_change_at 
          ? new Date(eligibility.next_change_at).toLocaleString()
          : "later";
        return new Response(
          JSON.stringify({
            error: `You've reached the limit for email changes. Try again at ${nextChangeTime} or contact support.`,
            code: "CHANGE_LIMIT_EXCEEDED",
            nextChangeAt: eligibility?.next_change_at,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // Expire any existing pending requests
      await supabase
        .from("parental_consent_requests")
        .update({ status: "expired" })
        .eq("child_user_id", user.id)
        .eq("status", "pending");
    }

    // Check for existing request with this email for this user
    const { data: existingRequest } = await supabase
      .from("parental_consent_requests")
      .select("*")
      .eq("child_user_id", user.id)
      .eq("parent_email", normalizedEmail)
      .maybeSingle();

    let consentToken: string;
    let requestCount = 1;

    if (existingRequest && existingRequest.status === "pending") {
      // Update existing request - increment count and reset token
      consentToken = crypto.randomUUID();
      requestCount = existingRequest.request_count + 1;
      
      await supabase
        .from("parental_consent_requests")
        .update({
          consent_token: consentToken,
          email_sent_at: new Date().toISOString(),
          request_count: requestCount,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", existingRequest.id);
    } else {
      // Create new request
      consentToken = crypto.randomUUID();
      
      const { error: insertError } = await supabase
        .from("parental_consent_requests")
        .insert({
          child_user_id: user.id,
          parent_email: normalizedEmail,
          consent_token: consentToken,
          email_sent_at: new Date().toISOString(),
          first_request_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("Error creating consent request:", insertError);
        throw new Error("Failed to create consent request");
      }
    }

    // Update user's profile with parent email
    await supabase
      .from("profiles")
      .update({
        parent_email: normalizedEmail,
        consent_status: "pending",
        account_type: "minor",
      })
      .eq("id", user.id);

    // Build consent link
    const origin = req.headers.get("origin") || "https://tryble-rugby-grounds.lovable.app";
    const consentLink = `${origin}/consent/${consentToken}`;

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
    .safety-box { background: #f0fdf4; border-left: 4px solid #1B4332; padding: 15px; margin: 20px 0; }
    .safety-box strong { color: #1B4332; display: block; margin-bottom: 10px; }
    .safety-box ul { margin: 0; padding-left: 20px; color: #333; }
    .safety-box li { margin: 8px 0; }
    .cta-button { display: block; background: #1B4332; color: #ffffff !important; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; text-align: center; margin: 30px auto; max-width: 250px; }
    .cta-button:hover { background: #2d5a47; }
    .expiry-note { text-align: center; font-size: 14px; color: #666; margin-top: 10px; }
    .divider { margin: 30px 0; border: none; border-top: 1px solid #eee; }
    .help-section { font-size: 14px; color: #333; }
    .help-section a { color: #1B4332; }
    .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏉 TRYBAL</h1>
      <p>Parental Consent Request</p>
    </div>
    
    <div class="content">
      <p>Hi there,</p>
      
      <p>Your child, <strong>${childFirstName}</strong>, has signed up for Trybal — a fun, safe predictions app for South African schoolboy rugby.</p>
      
      <p>To unlock all features, we need your consent.</p>
      
      <div class="safety-box">
        <strong>Why Trybal is safe:</strong>
        <ul>
          <li>✓ No gambling, no prizes, no fees</li>
          <li>✓ POPIA-compliant — minimal data collection</li>
          <li>✓ All content is moderated</li>
          <li>✓ No addictive mechanics</li>
          <li>✓ Built by parents, for families</li>
        </ul>
      </div>
      
      <a href="${consentLink}" class="cta-button">I Give My Consent</a>
      
      <p class="expiry-note">This link expires in 30 days.</p>
      
      <hr class="divider" />
      
      <div class="help-section">
        <strong>Questions?</strong><br />
        📚 <a href="${origin}/for-parents">Read our Safety Guide</a><br />
        📧 <a href="mailto:safety@trybal.app">safety@trybal.app</a>
      </div>
    </div>
    
    <div class="footer">
      <p>Trybal — Where School Pride Meets Predictions</p>
      <p>You received this because ${childFirstName} listed you as their parent/guardian.</p>
    </div>
  </div>
</body>
</html>
    `;

    const emailResult = await sendEmailWithRetry({
      from: "Trybal <noreply@trybal.app>",
      to: [normalizedEmail],
      subject: `Parental Consent Request for ${childFirstName}`,
      html: emailHtml,
    });

    if (!emailResult.success) {
      console.error("Error sending email after retries:", emailResult.error);
      throw new Error("Failed to send consent email after multiple attempts");
    }

    console.log(`Parental consent email sent to [REDACTED] for user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Consent email sent successfully",
        maskedEmail: maskEmail(normalizedEmail),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-parental-consent:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: error.message === "Unauthorized" ? 401 : 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@4.0.0";

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

interface BetaSignupRequest {
  email: string;
}

// Rate limit: 3 requests per hour per IP
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MINUTES = 60;

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get client IP for rate limiting (use forwarded header or fallback)
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
      || req.headers.get("x-real-ip") 
      || "unknown";

    // Check rate limit
    const { data: rateLimitResult, error: rateLimitError } = await supabase
      .rpc("check_rate_limit", {
        p_identifier: `ip:${clientIp}`,
        p_endpoint: "beta-signup",
        p_max_requests: RATE_LIMIT_MAX,
        p_window_minutes: RATE_LIMIT_WINDOW_MINUTES
      });

    if (rateLimitError) {
      console.error("Rate limit check failed:", rateLimitError);
      // Continue anyway - don't block on rate limit errors
    } else if (rateLimitResult && rateLimitResult[0] && !rateLimitResult[0].allowed) {
      console.log(`Rate limit exceeded for IP: ${clientIp}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Too many signup attempts. Please try again later.",
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { email }: BetaSignupRequest = await req.json();

    // Validate email
    if (!email || !email.includes("@")) {
      throw new Error("Invalid email address");
    }

    console.log("Processing beta signup for: [REDACTED]");

    const emailResult = await sendEmailWithRetry({
      from: "Trybal Beta <onboarding@resend.dev>",
      to: ["trybalrugby@gmail.com"],
      subject: "🏉 New Beta Signup Request!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #1B4332; color: #fff; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #2D6A4F; border-radius: 12px; padding: 30px; }
            .header { text-align: center; margin-bottom: 20px; }
            .header h1 { color: #FFD60A; margin: 0; }
            .content { background: #1B4332; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .email-badge { background: #FFD60A; color: #1B4332; padding: 12px 20px; border-radius: 8px; font-weight: bold; font-size: 18px; display: inline-block; }
            .footer { text-align: center; margin-top: 20px; color: #95D5B2; font-size: 14px; }
            .rugby-icon { font-size: 48px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="rugby-icon">🏉</div>
              <h1>New Beta Signup!</h1>
            </div>
            <div class="content">
              <p style="margin: 0 0 10px 0; color: #95D5B2;">A new fan wants to join the Trybal community:</p>
              <div style="text-align: center;">
                <span class="email-badge">${email}</span>
              </div>
            </div>
            <div class="footer">
              <p>This signup was submitted via the Trybal beta landing page.</p>
              <p>🏆 Where School Pride Meets Predictions 🏆</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (!emailResult.success) {
      throw new Error(`Email delivery failed: ${emailResult.error}`);
    }

    console.log("Beta signup email sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    console.error("Error in beta-signup function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

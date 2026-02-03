import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BetaSignupRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: BetaSignupRequest = await req.json();

    // Validate email
    if (!email || !email.includes("@")) {
      throw new Error("Invalid email address");
    }

    console.log("Processing beta signup for:", email);

    const emailResponse = await resend.emails.send({
      from: "Tryble Beta <onboarding@resend.dev>",
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
              <p style="margin: 0 0 10px 0; color: #95D5B2;">A new fan wants to join the Tryble community:</p>
              <div style="text-align: center;">
                <span class="email-badge">${email}</span>
              </div>
            </div>
            <div class="footer">
              <p>This signup was submitted via the Tryble beta landing page.</p>
              <p>🏆 Where School Pride Meets Predictions 🏆</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Beta signup email sent successfully:", emailResponse);

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

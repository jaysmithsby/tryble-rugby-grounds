import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VerifyRequest {
  token: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { token }: VerifyRequest = await req.json();

    if (!token) {
      throw new Error("Missing consent token");
    }

    // Look up the consent request
    const { data: consentRequest, error: lookupError } = await supabase
      .from("parental_consent_requests")
      .select("*, profiles!parental_consent_requests_child_user_id_fkey(first_name)")
      .eq("consent_token", token)
      .maybeSingle();

    if (lookupError) {
      console.error("Error looking up consent request:", lookupError);
      throw new Error("Failed to verify consent token");
    }

    if (!consentRequest) {
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

    // Check if already verified
    if (consentRequest.status === "verified") {
      // Get child's name for the response
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", consentRequest.child_user_id)
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          alreadyVerified: true,
          childFirstName: profile?.first_name || "Your child",
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
      return new Response(
        JSON.stringify({
          success: false,
          error: "This consent link has expired",
          code: "TOKEN_EXPIRED",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if revoked
    if (consentRequest.status === "revoked") {
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

    // Update the consent request to verified
    const { error: updateConsentError } = await supabase
      .from("parental_consent_requests")
      .update({
        status: "verified",
        verified_at: new Date().toISOString(),
      })
      .eq("id", consentRequest.id);

    if (updateConsentError) {
      console.error("Error updating consent request:", updateConsentError);
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
      console.error("Error updating profile:", updateProfileError);
      // Don't fail the request, consent is still valid
    }

    // Get child's name for the response
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name")
      .eq("id", consentRequest.child_user_id)
      .single();

    console.log(`Parental consent verified for user ${consentRequest.child_user_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        alreadyVerified: false,
        childFirstName: profile?.first_name || "Your child",
        message: "Consent verified successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in verify-parental-consent:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

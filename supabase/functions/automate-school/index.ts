import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const WEBHOOK_URL = "https://jamesie.app.n8n.cloud/webhook-test/57f3e119-d4c1-4438-b9a2-67eeec53c463";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { school_name } = await req.json();

    if (!school_name) {
      return new Response(
        JSON.stringify({ error: "school_name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching data for school: ${school_name}`);

    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ school_name }),
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

    return new Response(
      JSON.stringify(data),
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

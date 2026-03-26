import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_STATUSES = ["upcoming", "in_progress", "completed", "cancelled", "postponed", "final"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const apiKey = req.headers.get("x-api-key");
  const expectedKey = Deno.env.get("N8N_API_KEY");
  if (!apiKey || !expectedKey || apiKey !== expectedKey) {
    return json({ error: "Unauthorized: invalid or missing x-api-key" }, 401);
  }

  try {
    const body = await req.json();
    const { fixture_id, score_a, score_b, status, updated_at, match_date } = body;

    if (!fixture_id || !UUID_RE.test(fixture_id)) {
      return json({ error: "Valid fixture_id (UUID) is required" }, 400);
    }
    if (typeof score_a !== "number" || !Number.isInteger(score_a) || score_a < 0) {
      return json({ error: "score_a must be a non-negative integer" }, 400);
    }
    if (typeof score_b !== "number" || !Number.isInteger(score_b) || score_b < 0) {
      return json({ error: "score_b must be a non-negative integer" }, 400);
    }
    if (!status || !VALID_STATUSES.includes(status)) {
      return json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` }, 400);
    }
    if (!updated_at || typeof updated_at !== "string") {
      return json({ error: "updated_at (ISO timestamp string) is required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("fixtures")
      .update({ score_a, score_b, status, updated_at })
      .eq("id", fixture_id)
      .select("id");

    if (error) {
      console.error("Update error:", error);
      return json({ error: error.message }, 500);
    }
    if (!data || data.length === 0) {
      return json({ error: "Fixture not found" }, 404);
    }

    return json({ success: true, fixture_id });
  } catch (err) {
    console.error("update-fixture-score error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

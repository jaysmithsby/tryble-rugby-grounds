import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  // API key auth
  const apiKey = req.headers.get("x-api-key");
  const expectedKey = Deno.env.get("N8N_API_KEY");
  if (!apiKey || !expectedKey || apiKey !== expectedKey) {
    return json({ error: "Unauthorized: invalid or missing x-api-key" }, 401);
  }

  const url = new URL(req.url);
  const schoolAId = url.searchParams.get("school_a_id");
  const schoolBId = url.searchParams.get("school_b_id");
  const matchDate = url.searchParams.get("match_date");

  // Validate params
  if (!schoolAId || !UUID_RE.test(schoolAId)) {
    return json({ error: "Valid school_a_id (UUID) is required" }, 400);
  }
  if (!schoolBId || !UUID_RE.test(schoolBId)) {
    return json({ error: "Valid school_b_id (UUID) is required" }, 400);
  }
  if (!matchDate || !DATE_RE.test(matchDate)) {
    return json({ error: "Valid match_date (YYYY-MM-DD) is required" }, 400);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const dayStart = `${matchDate}T00:00:00.000Z`;
    const dayEnd = `${matchDate}T23:59:59.999Z`;

    const { data, error } = await supabase
      .from("fixtures")
      .select("id, school_a_id, school_b_id, score_a, score_b, status")
      .gte("match_date", dayStart)
      .lte("match_date", dayEnd)
      .eq("year", 2026)
      .not("status", "in", '("final","cancelled")')
      .or(
        `and(school_a_id.eq.${schoolAId},school_b_id.eq.${schoolBId}),and(school_a_id.eq.${schoolBId},school_b_id.eq.${schoolAId})`
      );

    if (error) {
      console.error("Query error:", error);
      return json({ error: error.message }, 500);
    }

    return json(data ?? []);
  } catch (err) {
    console.error("get-fixture-for-scoring error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

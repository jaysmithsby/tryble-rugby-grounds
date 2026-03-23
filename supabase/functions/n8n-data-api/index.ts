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
const VALID_STATUSES = ["upcoming", "in_progress", "completed", "cancelled", "postponed"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // --- API Key Auth ---
  const apiKey = req.headers.get("x-api-key");
  const expectedKey = Deno.env.get("N8N_API_KEY");

  if (!apiKey || !expectedKey || apiKey !== expectedKey) {
    return json({ error: "Unauthorized: invalid or missing x-api-key" }, 401);
  }

  // --- Service role client (bypasses RLS) ---
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    // ========== GET SCHOOLS ==========
    if (action === "get-schools" && req.method === "GET") {
      const { data, error } = await supabase
        .from("schools")
        .select("id, name, slug, province, jersey_url, status, primary_color, secondary_color, nickname, school_type, is_visible, is_archived, alias")
        .eq("is_archived", false)
        .eq("is_visible", true)
        .order("name");

      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true, data, count: data.length });
    }

    // ========== GET FIXTURES ==========
    if (action === "get-fixtures" && req.method === "GET") {
      let query = supabase
        .from("fixtures")
        .select(`
          id, match_date, score_a, score_b, status, season, year, round_name, sport, is_derby, venue_type,
          school_a:schools!fixtures_school_a_id_fkey(id, name, slug),
          school_b:schools!fixtures_school_b_id_fkey(id, name, slug),
          tournament:tournament_editions(id, tournament_id, year)
        `)
        .order("match_date", { ascending: true });

      const startDate = url.searchParams.get("start_date");
      const endDate = url.searchParams.get("end_date");
      const status = url.searchParams.get("status");
      const schoolId = url.searchParams.get("school_id");
      const limit = url.searchParams.get("limit");

      if (startDate) query = query.gte("match_date", startDate);
      if (endDate) query = query.lte("match_date", endDate);
      if (status) query = query.eq("status", status);
      if (schoolId) {
        if (!UUID_RE.test(schoolId)) return json({ error: "Invalid school_id format" }, 400);
        query = query.or(`school_a_id.eq.${schoolId},school_b_id.eq.${schoolId}`);
      }
      if (limit) query = query.limit(parseInt(limit, 10));

      const { data, error } = await query;
      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true, data, count: data.length });
    }

    // ========== UPDATE FIXTURE ==========
    if (action === "update-fixture" && req.method === "POST") {
      const body = await req.json();
      const { id, score_a, score_b, status } = body;

      // Validate ID
      if (!id || !UUID_RE.test(id)) {
        return json({ error: "Valid fixture id (UUID) is required" }, 400);
      }

      // Build update object with only provided fields
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

      if (score_a !== undefined) {
        if (typeof score_a !== "number" || score_a < 0 || !Number.isInteger(score_a)) {
          return json({ error: "score_a must be a non-negative integer" }, 400);
        }
        updates.score_a = score_a;
      }

      if (score_b !== undefined) {
        if (typeof score_b !== "number" || score_b < 0 || !Number.isInteger(score_b)) {
          return json({ error: "score_b must be a non-negative integer" }, 400);
        }
        updates.score_b = score_b;
      }

      if (status !== undefined) {
        if (!VALID_STATUSES.includes(status)) {
          return json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` }, 400);
        }
        updates.status = status;
      }

      if (Object.keys(updates).length === 1) {
        return json({ error: "No valid fields to update. Provide score_a, score_b, or status." }, 400);
      }

      const { data, error } = await supabase
        .from("fixtures")
        .update(updates)
        .eq("id", id)
        .select();

      if (error) return json({ success: false, error: error.message }, 500);
      if (!data || data.length === 0) return json({ error: "Fixture not found" }, 404);
      return json({ success: true, data: data[0] });
    }

    // ========== GET SCRAPE SOURCES ==========
    if (action === "get-scrape-sources" && req.method === "GET") {
      let query = supabase
        .from("scrape_sources")
        .select("*")
        .order("priority", { ascending: true });

      const active = url.searchParams.get("active");
      const schoolId = url.searchParams.get("school_id");
      if (active !== null) query = query.eq("active", active === "true");
      if (schoolId) {
        if (!UUID_RE.test(schoolId)) return json({ error: "Invalid school_id format" }, 400);
        query = query.eq("school_id", schoolId);
      }

      const { data, error } = await query;
      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true, data, count: data.length });
    }

    // ========== GET TOURNAMENTS ==========
    if (action === "get-tournaments" && req.method === "GET") {
      const [tournamentsRes, editionsRes] = await Promise.all([
        supabase.from("tournaments").select("id, name, alias").order("name"),
        supabase.from("tournament_editions").select("id, tournament_id, year, start_date, end_date, is_active, host_school, venue, province, format_notes, logo_url, sponsor_name, sponsor_logo_url").order("year", { ascending: false }),
      ]);

      if (tournamentsRes.error) return json({ success: false, error: tournamentsRes.error.message }, 500);
      if (editionsRes.error) return json({ success: false, error: editionsRes.error.message }, 500);

      return json({
        success: true,
        tournaments: tournamentsRes.data,
        editions: editionsRes.data,
        tournament_count: tournamentsRes.data.length,
        edition_count: editionsRes.data.length,
      });
    }

    return json({ error: `Unknown action: ${action}. Use get-schools, get-fixtures, update-fixture, get-scrape-sources, or get-tournaments.` }, 400);
  } catch (err) {
    console.error("n8n-data-api error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

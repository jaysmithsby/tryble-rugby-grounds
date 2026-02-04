/**
 * Health Check Edge Function
 * 
 * PUBLIC ENDPOINT - No authentication required
 * Used by load balancers and monitoring systems to check service health.
 * 
 * Returns:
 * - 200 OK when service is healthy
 * - Basic health metrics (uptime, timestamp, version)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Track when the function was first loaded (cold start)
const startTime = Date.now();

// ============= Structured Logger =============
type LogLevel = "debug" | "info" | "warn" | "error";

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    function: "health",
    message,
    ...(context ? { context } : {}),
  };
  
  const logFn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  logFn(JSON.stringify(entry));
}
// ============= End Logger =============

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const checks: Record<string, string> = {
    edge_function: "ok",
  };

  try {
    // Optional: Check database connectivity
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { error } = await supabase.from("schools").select("id").limit(1);
        checks.database = error ? "degraded" : "ok";
      } catch {
        checks.database = "degraded";
      }
    }

    const healthData = {
      status: Object.values(checks).every(v => v === "ok") ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime_ms: Date.now() - startTime,
      version: "1.0.0",
      checks,
    };

    log("debug", "Health check completed", { status: healthData.status });

    return new Response(
      JSON.stringify(healthData),
      {
        status: healthData.status === "healthy" ? 200 : 503,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    log("error", "Health check failed", { error: errorMessage });
    
    return new Response(
      JSON.stringify({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: errorMessage,
      }),
      {
        status: 503,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

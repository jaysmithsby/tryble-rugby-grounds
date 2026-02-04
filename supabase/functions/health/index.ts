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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Track when the function was first loaded (cold start)
const startTime = Date.now();

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const healthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime_ms: Date.now() - startTime,
      version: "1.0.0",
      checks: {
        edge_function: "ok",
      },
    };

    return new Response(
      JSON.stringify(healthData),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
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

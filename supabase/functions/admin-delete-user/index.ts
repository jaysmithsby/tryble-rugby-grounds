import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Verify caller's JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client scoped to the caller's JWT for auth verification
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return json({ error: "Unauthorized" }, 401);
    }

    const adminUserId = claimsData.claims.sub as string;

    // 2. Check admin role using service role client
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleCheck } = await adminClient.rpc("has_role", {
      _user_id: adminUserId,
      _role: "admin",
    });

    if (!roleCheck) {
      return json({ error: "Forbidden: Admin role required" }, 403);
    }

    // 3. Parse request body
    const { userId, email, displayName, schoolName } = await req.json();

    if (!userId) {
      return json({ error: "userId is required" }, 400);
    }

    // Prevent self-deletion
    if (userId === adminUserId) {
      return json({ error: "Cannot delete your own account" }, 400);
    }

    // 4. Write audit log
    const { error: logError } = await adminClient
      .from("admin_audit_log")
      .insert({
        admin_user_id: adminUserId,
        action_type: "delete_user",
        target_user_id: userId,
        details: {
          email: email || null,
          display_name: displayName || null,
          school_name: schoolName || null,
        },
      });

    if (logError) {
      console.error("Audit log error:", logError);
      return json({ error: "Failed to write audit log" }, 500);
    }

    // 5. Delete user via admin API with service role
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Delete user error:", deleteError);
      return json({ error: deleteError.message || "Failed to delete user" }, 500);
    }

    return json({ success: true });
  } catch (err) {
    console.error("admin-delete-user error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

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

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
}

// ── validate-token ──────────────────────────────────────────────
async function handleValidateToken(body: { token: string }) {
  if (!body.token) return json({ error: "Token is required" }, 400);

  const sb = getSupabaseAdmin();
  const hash = await sha256(body.token);

  const { data: inv, error } = await sb
    .from("school_invitations")
    .select("*")
    .eq("token_hash", hash)
    .single();

  if (error || !inv) return json({ status: "invalid" });

  if (inv.status === "submitted" || inv.status === "approved" || inv.status === "rejected") {
    return json({ status: "already_submitted", school_name: inv.school_name });
  }

  const now = new Date();
  if (new Date(inv.expires_at) < now) {
    return json({ status: "expired" });
  }

  if (inv.otp_attempts >= 5) {
    return json({ status: "locked" });
  }

  return json({
    status: "valid",
    school_name: inv.school_name,
    contact_email: inv.contact_email,
    otp_verified: inv.otp_verified,
  });
}

// ── send-otp ────────────────────────────────────────────────────
async function handleSendOtp(body: { token: string }) {
  if (!body.token) return json({ error: "Token is required" }, 400);

  const sb = getSupabaseAdmin();
  const hash = await sha256(body.token);

  const { data: inv, error } = await sb
    .from("school_invitations")
    .select("*")
    .eq("token_hash", hash)
    .single();

  if (error || !inv) return json({ error: "Invalid token" }, 400);
  if (inv.otp_attempts >= 5) return json({ error: "Too many attempts. Please contact Trybal." }, 403);
  if (new Date(inv.expires_at) < new Date()) return json({ error: "Token expired" }, 400);

  // Generate OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = await sha256(otp);

  await sb
    .from("school_invitations")
    .update({
      otp_code: otpHash,
      otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      otp_attempts: 0,
      otp_verified: false,
    })
    .eq("id", inv.id);

  // Send OTP via Resend
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (resendKey) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Trybal <noreply@trybal.co.za>",
          to: [inv.contact_email],
          subject: `Your Trybal verification code: ${otp}`,
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
              <h2>Trybal School Onboarding</h2>
              <p>Hi there,</p>
              <p>Your verification code for setting up <strong>${inv.school_name}</strong> on Trybal is:</p>
              <div style="background: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px;">${otp}</span>
              </div>
              <p>This code expires in 10 minutes.</p>
              <p>If you didn't request this, you can safely ignore this email.</p>
              <p>— Team Trybal 🏉</p>
            </div>
          `,
        }),
      });
    } catch (e) {
      console.error("Failed to send OTP email:", e);
    }
  } else {
    console.log("RESEND_API_KEY not set. OTP:", otp);
  }

  return json({ success: true });
}

// ── verify-otp ──────────────────────────────────────────────────
async function handleVerifyOtp(body: { token: string; otp: string }) {
  if (!body.token || !body.otp) return json({ error: "Token and OTP are required" }, 400);

  const sb = getSupabaseAdmin();
  const hash = await sha256(body.token);

  const { data: inv, error } = await sb
    .from("school_invitations")
    .select("*")
    .eq("token_hash", hash)
    .single();

  if (error || !inv) return json({ error: "Invalid token" }, 400);
  if (inv.otp_attempts >= 5) return json({ error: "Too many attempts. Please contact Trybal." }, 403);

  if (!inv.otp_code || !inv.otp_expires_at) {
    return json({ error: "No OTP has been sent. Please request one first." }, 400);
  }

  if (new Date(inv.otp_expires_at) < new Date()) {
    return json({ error: "OTP has expired. Please request a new one." }, 400);
  }

  const otpHash = await sha256(body.otp);

  if (otpHash !== inv.otp_code) {
    await sb
      .from("school_invitations")
      .update({ otp_attempts: inv.otp_attempts + 1 })
      .eq("id", inv.id);

    const remaining = 4 - inv.otp_attempts;
    if (remaining <= 0) {
      return json({ error: "Too many attempts. Please contact Trybal." }, 403);
    }
    return json({ error: `Incorrect code. ${remaining} attempt(s) remaining.` }, 400);
  }

  await sb
    .from("school_invitations")
    .update({ otp_verified: true })
    .eq("id", inv.id);

  return json({ success: true });
}

// ── submit-form ─────────────────────────────────────────────────
async function handleSubmitForm(body: {
  token: string;
  full_official_name: string;
  nickname: string;
  province: string;
  year_established: number;
  school_motto?: string;
  main_rival?: string;
  number_of_springboks?: number;
  school_trivia?: string;
  crest_image_url?: string;
  primary_colour?: string;
  secondary_colour?: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
}) {
  if (!body.token) return json({ error: "Token is required" }, 400);

  const sb = getSupabaseAdmin();
  const hash = await sha256(body.token);

  const { data: inv, error } = await sb
    .from("school_invitations")
    .select("*")
    .eq("token_hash", hash)
    .single();

  if (error || !inv) return json({ error: "Invalid token" }, 400);
  if (inv.status !== "pending") return json({ error: "This form has already been submitted." }, 400);
  if (new Date(inv.expires_at) < new Date()) return json({ error: "Token expired" }, 400);
  if (!inv.otp_verified) return json({ error: "OTP not verified" }, 400);

  // Server-side validation
  const errors: string[] = [];
  if (!body.full_official_name?.trim()) errors.push("Full official name is required");
  if (!body.nickname?.trim()) errors.push("Nickname is required");
  if (!body.province?.trim()) errors.push("Province is required");
  if (!body.year_established || body.year_established < 1850 || body.year_established > new Date().getFullYear()) {
    errors.push("Valid year established is required (1850-current year)");
  }
  if (!body.contact_name?.trim()) errors.push("Contact name is required");
  if (!body.contact_email?.trim()) errors.push("Contact email is required");
  if (!body.contact_phone?.trim() || !/^0\d{9}$/.test(body.contact_phone.trim())) {
    errors.push("Valid SA phone number required (10 digits starting with 0)");
  }
  if (body.school_trivia && body.school_trivia.length > 500) {
    errors.push("School trivia must be 500 characters or less");
  }

  if (errors.length > 0) return json({ error: errors.join("; ") }, 400);

  // Generate slug from school name
  const slug = body.full_official_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  // Insert directly into schools table with pending_review status
  const { error: insertError } = await sb.from("schools").insert({
    name: body.full_official_name.trim(),
    slug,
    nickname: body.nickname.trim(),
    province: body.province.trim(),
    established_year: body.year_established,
    motto: body.school_motto?.trim() || null,
    main_rival: body.main_rival?.trim() || null,
    springboks_count: body.number_of_springboks ?? 0,
    trivia_fact: body.school_trivia?.trim() || null,
    emblem_url: body.crest_image_url || null,
    primary_color: body.primary_colour?.trim() || null,
    secondary_color: body.secondary_colour?.trim() || null,
    contact_name: body.contact_name.trim(),
    contact_email: body.contact_email.trim(),
    contact_phone: body.contact_phone.trim(),
    invitation_id: inv.id,
    status: "pending_review",
    is_visible: false,
  });

  if (insertError) {
    console.error("Insert error:", insertError);
    return json({ error: "Failed to save submission" }, 500);
  }

  // Update invitation status
  await sb
    .from("school_invitations")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", inv.id);

  return json({ success: true });
}

// ── upload-crest ────────────────────────────────────────────────
async function handleUploadCrest(req: Request, token: string) {
  const sb = getSupabaseAdmin();
  const hash = await sha256(token);

  const { data: inv, error } = await sb
    .from("school_invitations")
    .select("id, status, expires_at, otp_verified")
    .eq("token_hash", hash)
    .single();

  if (error || !inv) return json({ error: "Invalid token" }, 400);
  if (inv.status !== "pending") return json({ error: "Form already submitted" }, 400);
  if (new Date(inv.expires_at) < new Date()) return json({ error: "Token expired" }, 400);
  if (!inv.otp_verified) return json({ error: "OTP not verified" }, 400);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return json({ error: "No file provided" }, 400);

  // Validate type and size
  const allowedTypes = ["image/png", "image/jpeg", "image/svg+xml"];
  if (!allowedTypes.includes(file.type)) {
    return json({ error: "Only PNG, JPG, and SVG files are accepted" }, 400);
  }
  if (file.size > 2 * 1024 * 1024) {
    return json({ error: "File must be 2MB or less" }, 400);
  }

  const ext = file.name.split(".").pop() || "png";
  const fileName = `${inv.id}-${Date.now()}.${ext}`;

  const { error: uploadError } = await sb.storage
    .from("school-onboarding-crests")
    .upload(fileName, file, { contentType: file.type, upsert: true });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    return json({ error: "Failed to upload image" }, 500);
  }

  const { data: urlData } = sb.storage
    .from("school-onboarding-crests")
    .getPublicUrl(fileName);

  return json({ url: urlData.publicUrl });
}

// ── Main handler ────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "upload-crest") {
      const token = url.searchParams.get("token");
      if (!token) return json({ error: "Token is required" }, 400);
      return await handleUploadCrest(req, token);
    }

    const body = await req.json();

    switch (action) {
      case "validate-token":
        return await handleValidateToken(body);
      case "send-otp":
        return await handleSendOtp(body);
      case "verify-otp":
        return await handleVerifyOtp(body);
      case "submit-form":
        return await handleSubmitForm(body);
      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error("Edge function error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

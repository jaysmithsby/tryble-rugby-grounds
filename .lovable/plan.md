

## Security Hardening: 5 Fixes Across 4 Files

### 1. New Edge Function: `admin-delete-user`

**File:** `supabase/functions/admin-delete-user/index.ts` (new)

Moves the broken `supabase.auth.admin.deleteUser()` call out of the frontend. The function will:
- Extract the caller's JWT from the `Authorization` header and verify it via `supabase.auth.getUser()`
- Check the caller has the `admin` role using `has_role()` RPC
- Write to `admin_audit_log` using the service role client
- Call `supabase.auth.admin.deleteUser()` with the service role client
- Return success or a descriptive error

Config addition to `supabase/config.toml`:
```toml
[functions.admin-delete-user]
verify_jwt = false
```

### 2. Update Frontend: `DeleteUserDialog.tsx`

**File:** `src/components/admin/DeleteUserDialog.tsx`

Replace the direct `supabase.auth.admin.deleteUser()` and `admin_audit_log` insert with a single call:
```ts
const { data, error } = await supabase.functions.invoke("admin-delete-user", {
  body: { userId: user.id, email: user.email, displayName: user.profile?.display_name, schoolName: user.profile?.school_name }
});
```
Remove the audit log insert from the frontend entirely — the edge function handles it.

### 3. Rate Limit `confirm-email-verification`

**File:** `supabase/functions/confirm-email-verification/index.ts`

After parsing the token and before the DB lookup, add:
1. Extract client IP from `x-forwarded-for` header
2. Call `check_rate_limit` RPC with `p_identifier: ip`, `p_endpoint: "confirm-email-verification"`, `p_max_requests: 5`, `p_window_minutes: 15`
3. If `allowed` is false, return `429 Too Many Requests` with `Retry-After` header

### 4. School Onboarding Hardening

**File:** `supabase/functions/school-onboarding/index.ts`

Two changes:

**a) Cryptographic OTP (line 84):**
Replace `Math.floor(100000 + Math.random() * 900000)` with:
```ts
const arr = new Uint32Array(1);
crypto.getRandomValues(arr);
const otp = String(100000 + (arr[0] % 900000));
```

**b) PII leakage fix (lines 58-63):**
Remove `contact_email` from the `validate-token` response. Only return it when `otp_verified` is already true:
```ts
return json({
  status: "valid",
  school_name: inv.school_name,
  otp_verified: inv.otp_verified,
  ...(inv.otp_verified ? { contact_email: inv.contact_email } : {}),
});
```

### 5. Fixtures RLS Policy Tightening

**Migration:** Update the fixtures SELECT policy so hidden fixtures (`is_visible = false`) are only visible to admins, not all authenticated users.

Current: `(is_visible = true) OR (auth.uid() IS NOT NULL)`
New: `(is_visible = true) OR has_role(auth.uid(), 'admin'::app_role)`

---

### Files Changed Summary

| File | Change |
|---|---|
| `supabase/functions/admin-delete-user/index.ts` | New edge function for secure user deletion |
| `supabase/config.toml` | Add `admin-delete-user` function config |
| `src/components/admin/DeleteUserDialog.tsx` | Call edge function instead of admin API |
| `supabase/functions/confirm-email-verification/index.ts` | Add IP-based rate limiting |
| `supabase/functions/school-onboarding/index.ts` | Crypto OTP + remove PII from validate-token |
| DB migration | Tighten fixtures SELECT RLS policy |


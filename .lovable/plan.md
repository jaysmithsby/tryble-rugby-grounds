

## Feedback Review and Plan

Your suggestions are all sound and align well with how this should work. Here's my assessment of each, plus the implementation plan:

### Your suggestions — assessed

1. **Rate limiting (1 req / 60s per email)** — Correct. The existing `check_rate_limit` RPC is already in the database and used elsewhere. Will apply it here with `p_max_requests=1, p_window_minutes=1`.

2. **Input validation (email format)** — Correct. Will add a regex check before any admin API calls.

3. **Prevent user enumeration** — Correct. All code paths (user not found, already confirmed, success) will return the same `{ success: true, message: "If an account exists, a verification email has been sent." }` response.

4. **Admin API lookup with exact match + unconfirmed check** — Correct. Will use `admin.listUsers()` with email filter, verify exact match, skip sending if already confirmed (but still return generic success).

5. **Client-side serialization** — Good catch. `supabase.functions.invoke` **does** auto-serialize objects passed to `body` — it calls `JSON.stringify` internally when the body is a plain object. So `{ body: { email } }` is correct; no need for manual `JSON.stringify`. I'll use that pattern.

6. **Auth scope** — Correct. The function will use `SUPABASE_SERVICE_ROLE_KEY` for the admin lookup. No JWT validation needed since the endpoint is intentionally unauthenticated for unconfirmed users.

### Implementation Plan

**File 1: `supabase/functions/send-verification-email/index.ts`** — Full rewrite of the handler logic:
- Remove JWT/Authorization header requirement
- Accept `{ email }` from request body
- Validate email format with regex
- Rate limit: 1 request per 60 seconds per email using `check_rate_limit` RPC
- Use `supabase.auth.admin.listUsers()` to find user by email
- If no user found or already confirmed → return generic success (no email sent)
- If unconfirmed → generate token, store in `email_verification_tokens`, send branded Resend email
- All paths return identical success response shape to prevent enumeration

**File 2: `src/components/auth/SignUpFlow.tsx`** (lines ~236-270):
- Move the `send-verification-email` invoke **outside** the `if (data.session)` block so it fires whenever `data.user` exists (since unconfirmed signups have no session)
- Pass `{ body: { email } }` to the invoke call

**File 3: `src/components/auth/signup-steps/StepVerifyEmail.tsx`** (line ~73):
- Pass `{ body: { email } }` to the resend invoke call (the `email` prop is already available)

### No config changes needed
- `verify_jwt = false` is already set in `config.toml` for this function
- `RESEND_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` secrets already exist


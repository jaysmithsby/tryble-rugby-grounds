

## Problem Diagnosis

The verification flow is broken because **two competing email verification systems** are active:

1. **Supabase's built-in confirmation email** — sent automatically because `auto_confirm_email` is OFF. When clicked, it redirects to `/auth` with hash fragments (`#access_token=...&type=signup`).
2. **Custom Resend verification email** — sent via `send-verification-email` edge function. Links to `/auth?token=...`.

The auth logs confirm the user clicked Supabase's default verify link (GET `/verify` → 303 redirect → `login_method: implicit`). This redirects to `/auth` but **without** the `?token=` query param that Auth.tsx expects. The page loads fresh, and due to a race condition between URL hash processing and component mount, the user sees the signup form again.

Additionally, Auth.tsx has **no `onAuthStateChange` listener** to detect when the Supabase client processes the hash-based session from the redirect.

## Plan

### 1. Add auth state change listener in Auth.tsx

Add an `onAuthStateChange` listener that detects when a user arrives via the Supabase default verification redirect (hash params). When it fires with a verified user session, set `verified = true` so SignUpFlow advances past the email step.

### 2. Handle hash-based auth redirects in Auth.tsx

On mount, detect if the URL contains Supabase auth hash fragments (`#access_token`, `type=signup`). If so, show a loading state while the Supabase client processes the token, then check if the user is verified and advance accordingly.

### 3. Improve SignUpFlow resilience

In SignUpFlow's `checkAuth`, add a small delay or use `onAuthStateChange` instead of just `getUser()` on mount, so it doesn't race against URL hash processing. If the auth state fires with a verified user while on step 1 or 2, auto-advance to step 3.

### 4. Suppress duplicate Supabase default email (optional but recommended)

Since the custom Resend email is the intended verification path, consider passing `data: { suppress_confirmation: true }` or switching to use `emailRedirectTo` pointing to a proper handler. However, the most robust fix is making **both** redirect paths work correctly (steps 1-3 above).

### Files to modify
- **`src/pages/Auth.tsx`** — Add `onAuthStateChange` listener, handle hash-based redirects, show loading during redirect processing
- **`src/components/auth/SignUpFlow.tsx`** — Make `checkAuth` more resilient to race conditions; listen for auth state changes to detect verification while mounted



# Account Creation Flow Bug Fixes

This plan addresses the five issues in the account creation flow, including the critical missing verification email.

---

## Issue Summary

| # | Issue | Root Cause |
|---|-------|------------|
| 1 | **Verification email not sent** | Supabase built-in email relies on SMTP config that isn't set up |
| 2 | No verification success message | Email redirect doesn't trigger success toast |
| 3 | Screen "jumps/flashes" between steps | No loading state during async auth checks |
| 4 | Keyboard covers school input on mobile | Popover positioning doesn't account for keyboard |
| 5 | Predictive text jumps around | Popover auto-positions above/below dynamically |

---

## Solution Overview

### 1. Custom Verification Email via Resend (New Edge Function)

**Current Behavior:** The app calls `supabase.auth.signUp()` which relies on Supabase's built-in email delivery - but no SMTP is configured, so emails never arrive.

**Fix:** Create a custom `send-verification-email` edge function that:
- Generates a unique verification token and stores it in a new `email_verification_tokens` table
- Sends a branded Trybal email via Resend (API key already configured)
- Includes a link back to `/auth?token=<token>` that marks the email as verified

**Flow:**
```text
User submits email/password
       |
       v
supabase.auth.signUp() creates unverified user
       |
       v
Frontend calls send-verification-email edge function
       |
       v
Edge function generates token, stores in DB, sends via Resend
       |
       v
User clicks link in email → /auth?token=abc123
       |
       v
Frontend calls verify-email edge function
       |
       v
Edge function marks user as verified (updates email_confirmed_at)
       |
       v
Frontend shows success toast, advances to profile step
```

**Files to create:**
- `supabase/functions/send-verification-email/index.ts` - Generates token, sends email
- `supabase/functions/confirm-email-verification/index.ts` - Validates token, confirms user

**Database migration:**
```sql
CREATE TABLE public.email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + interval '24 hours',
  used_at TIMESTAMPTZ
);

-- Index for quick token lookup
CREATE INDEX idx_verification_tokens_token ON public.email_verification_tokens(token);

-- RLS: Only service role can access (edge functions)
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;
```

**Email template styling:** Will match the existing parental consent email with Trybal branding (green header, yellow accents, rugby theme).

---

### 2. Verification Success Message and Smooth Redirect

**Current Behavior:** When users click the email verification link, they're redirected back to `/auth` but receive no confirmation.

**Fix:** 
- Auth page detects `?token=` URL parameter on load
- Calls the `confirm-email-verification` edge function to validate and mark verified
- Shows a success toast: "Email verified! Let's set up your profile."
- Adds a brief animated checkmark before transitioning to Step 3

**Files to modify:**
- `src/pages/Auth.tsx` - Detect token param, call verification endpoint
- `src/components/auth/SignUpFlow.tsx` - Accept `verified` prop to show success state
- `src/components/auth/signup-steps/StepVerifyEmail.tsx` - Add success animation

---

### 3. Smooth Step Transitions (No Screen Flash)

**Current Behavior:** The screen flashes/jumps when transitioning between steps because async auth checks run without visual feedback.

**Fix:**
- Add a `transitioning` state with a minimum 300ms transition duration
- Use CSS opacity/transform animations for step changes
- Show a subtle loading skeleton during the initial auth check
- Wrap step content in an animated container

**CSS to add:**
```css
.step-enter {
  opacity: 0;
  transform: translateY(10px);
}
.step-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 200ms ease-out, transform 200ms ease-out;
}
```

**Files to modify:**
- `src/components/auth/SignUpFlow.tsx` - Add transitioning state and wrapper animations
- `src/index.css` - Add step transition CSS classes

---

### 4. Mobile School Selection with Bottom Sheet

**Current Behavior:** On mobile, the keyboard covers the school search input, making it impossible to see what you're typing.

**Fix:**
- Create a mobile-specific bottom sheet (Drawer) for school selection
- Use the existing `useIsMobile()` hook to detect screen size
- The Drawer keeps the search input fixed at the top, always visible above keyboard
- Desktop continues using the Popover

**Mobile Drawer Layout:**
```text
+---------------------------------------+
|  [X]         Find Your School         |
+---------------------------------------+
|  [Search input - always visible]      |
+---------------------------------------+
|  • Michaelhouse                       |
|  • Middelburg Hoerskool               |
|  • Milnerton High School              |
|  (scrollable list)                    |
+---------------------------------------+
         [Keyboard appears here]
```

**Files to create:**
- `src/components/auth/signup-steps/SchoolSearchDrawer.tsx` - Mobile bottom sheet

**Files to modify:**
- `src/components/auth/signup-steps/StepProfile.tsx` - Conditional render Drawer vs Popover

---

### 5. Static Dropdown Position (No Jumping)

**Current Behavior:** The school suggestions dropdown jumps between appearing above and below the input field.

**Fix:**
- Force the PopoverContent to always appear below the trigger
- Disable automatic collision avoidance
- Set a fixed maximum height with overflow scrolling

**Code change in StepProfile.tsx:**
```tsx
<PopoverContent 
  side="bottom" 
  sideOffset={8}
  avoidCollisions={false}
  className="w-[var(--radix-popover-trigger-width)] max-h-60 overflow-y-auto"
>
```

**Files to modify:**
- `src/components/auth/signup-steps/StepProfile.tsx` - Update PopoverContent props

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/send-verification-email/index.ts` | Create | Send custom verification email via Resend |
| `supabase/functions/confirm-email-verification/index.ts` | Create | Validate token and mark user verified |
| `supabase/config.toml` | Modify | Add new edge function config |
| Migration SQL | Create | Add `email_verification_tokens` table |
| `src/pages/Auth.tsx` | Modify | Detect token param, handle verification callback |
| `src/components/auth/SignUpFlow.tsx` | Modify | Add transitions, handle verified state |
| `src/components/auth/signup-steps/StepAccount.tsx` | Modify | Trigger send-verification-email after signup |
| `src/components/auth/signup-steps/StepVerifyEmail.tsx` | Modify | Add success animation, update resend to use edge function |
| `src/components/auth/signup-steps/StepProfile.tsx` | Modify | Mobile drawer + fixed dropdown position |
| `src/components/auth/signup-steps/SchoolSearchDrawer.tsx` | Create | Mobile-optimized school search |
| `src/index.css` | Modify | Add step transition CSS |

---

## Testing Checklist

After implementation:
- [ ] Sign up with a new email address
- [ ] Check inbox - verification email arrives with Trybal branding
- [ ] Click verification link - redirects to app
- [ ] See success toast "Email verified!"
- [ ] Smooth transition to "Tell us about you" screen
- [ ] No screen flash during any transition
- [ ] Mobile: tap school field - keyboard opens, can see input
- [ ] Mobile: school suggestions appear in bottom sheet
- [ ] Desktop: school dropdown appears below input without jumping
- [ ] Complete full signup flow on both mobile and desktop

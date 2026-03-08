

## Problem

Both `send-verification-email` and `send-parental-consent` edge functions still use `from: "Trybal <noreply@trybal.app>"`. The `trybal.app` domain is not verified in Resend, so all email sends are rejected. Your Resend dashboard confirms `trybal.co.za` is verified and healthy, but zero emails have been sent because the code never references it.

## Plan

Three one-line changes across two files:

**File 1: `supabase/functions/send-verification-email/index.ts`**
- Line 242: `from: "Trybal <noreply@trybal.app>"` → `from: "Trybal <noreply@trybal.co.za>"`

**File 2: `supabase/functions/send-parental-consent/index.ts`**
- Line 347: `mailto:safety@trybal.app` and display text → `mailto:safety@trybal.co.za` / `safety@trybal.co.za`
- Line 361: `from: "Trybal <noreply@trybal.app>"` → `from: "Trybal <noreply@trybal.co.za>"`

No other files reference `trybal.app` in the edge functions. No logic changes needed.


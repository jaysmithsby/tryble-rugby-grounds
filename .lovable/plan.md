
# Trybal v1 Onboarding Flow Implementation Plan

## Overview

This plan redesigns the signup flow to get new users from zero to their first prediction with minimum friction. The new flow is linear, opinionated, and avoids dead ends or empty states.

---

## Current State Analysis

### What Exists Now
- **5-step signup flow**: Name → Contact (email/mobile toggle) → Role → School → Password → Completion
- **Current order asks for**: First name before email (should be email first for account uniqueness)
- **No email verification gate**: Users go straight to home after signup
- **No "year of birth" field**: Required for the new flow
- **No tournament following system**: Database has tournaments but no `user_tournament_follows` table
- **Pool system exists**: But users land on Home without being guided to create/join one
- **Home page shows "No Pools Yet" empty state**: Dead end for new users

### Database Tables Available
- `profiles`: Has `first_name`, `user_type`, `school_name`, `contact_method`, `contact_value`, `age_band` (exists but not used in signup)
- `pools` and `pool_members`: Full pool/membership system
- `tournaments`: Exists but no user following mechanism
- `fixtures`: Full fixture data with school relationships

---

## New Onboarding Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        NEW USER JOURNEY                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Landing ──► Create Account ──► Verify Email ──► Profile Setup          │
│     │              │                  │                │                 │
│     │         (Email+Pass)       (Blocking)     (Name, Role,            │
│     │                                           YoB, School)             │
│     │                                                  │                 │
│     │                                                  ▼                 │
│     │                                        Welcome Interstitial        │
│     │                                           (1.5s auto)              │
│     │                                                  │                 │
│     │                                                  ▼                 │
│     │                                         Your Next Match            │
│     │                                     (anchor with school's          │
│     │                                      upcoming fixture)             │
│     │                                                  │                 │
│     │                                                  ▼                 │
│     │                                      Follow a Tournament           │
│     │                                                  │                 │
│     │                                                  ▼                 │
│     │                                       Join/Create Pool             │
│     │                                                  │                 │
│     │                                                  ▼                 │
│     │                                            Home Screen             │
│     ▼                                        (Ready to Predict)          │
│  Log In ─────────────────────────────────────────────►│                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Database Changes

**1.1 Create Tournament Following Table**
```sql
CREATE TABLE user_tournament_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tournament_id)
);

ALTER TABLE user_tournament_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own follows"
  ON user_tournament_follows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can follow tournaments"
  ON user_tournament_follows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow tournaments"
  ON user_tournament_follows FOR DELETE
  USING (auth.uid() = user_id);
```

**1.2 Add Year of Birth to Profiles**
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS year_of_birth INTEGER;
```

**1.3 Add Onboarding Status Tracking**
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
```

---

### Phase 2: Restructured Auth Flow Components

**2.1 New Step Order** (6 onboarding steps + verification gate)

| Step | Screen | Component | Purpose |
|------|--------|-----------|---------|
| 1 | Create Account | `StepAccount.tsx` | Email + Password (hard gate) |
| 2 | Verify Email | `StepVerifyEmail.tsx` | Blocking verification screen |
| 3 | Profile Setup | `StepProfile.tsx` | First name, Role, Year of Birth, School |
| 4 | Welcome | `StepWelcome.tsx` | Celebratory interstitial with user's name |
| 5 | Your Next Match | `StepNextMatch.tsx` | Show school's upcoming fixture |
| 6 | Follow Tournament | `StepTournament.tsx` | Select tournament(s) to follow |
| 7 | Join/Create Pool | `StepPool.tsx` | Pool selection or creation |

**2.2 Component Changes**

**NEW: `StepAccount.tsx`**
- Email address field (required)
- Password field with validation checklist
- Handle "email already exists" → show inline login prompt
- On submit: call `supabase.auth.signUp()` and send verification email

**NEW: `StepVerifyEmail.tsx`**
- Shows: "We've sent a verification link to your email"
- Blocks progress until email is verified
- Polling or auth state listener for verification
- "Resend email" button
- "Change email" button (goes back to step 1)

**REFACTORED: `StepProfile.tsx`** (combines Name + Role + YoB + School)
- First name field
- Account type (Scholar/Fan/Parent/Alumni) - single select buttons
- Year of birth - dropdown (not free text)
- School - searchable dropdown with "school not listed" option
- All collected in single step to reduce friction

**NEW: `StepWelcome.tsx`**
- "Welcome to Trybal, {firstName}!" with celebratory icon
- "Let's get you set up for your next match."
- Auto-advances after 1.5 seconds (or tap to continue)

**NEW: `StepNextMatch.tsx`**
- Fetches next upcoming fixture for user's school
- Shows: School crest, opponent, date, venue, countdown
- If no fixture: "No upcoming match yet — we'll notify you when one is added."
- CTA: "Follow a Tournament" (primary) / "Create a Pool" (secondary)

**NEW: `StepTournament.tsx`**
- Lists tournaments ordered by:
  1. User's school is participating
  2. Popular/featured tournaments
  3. All others
- Each card shows: Name, school count, follower count
- "Follow Tournament" button per card
- After following one: toast confirmation, auto-advance to pool step

**NEW: `StepPool.tsx`**
- Two options presented cleanly:
  - **Join Existing Pool**: Show pools related to school/tournament
  - **Create Pool**: Name field (pre-filled suggestion), school multi-select (user's school pre-selected)
- Invite sharing is optional, never blocking
- "Skip for now" option available

**2.3 SignUpFlow.tsx Restructure**
- New step state management (1-7)
- Different progress indicator style (hide for verification step)
- Handle email verification state via auth listener
- Store intermediate data in localStorage for resilience

---

### Phase 3: Entry Point Updates

**3.1 Landing Page (`Hero.tsx`)**
- Keep "Get Started" as primary CTA → navigates to `/auth`
- Keep "Sign In" in header → navigates to `/auth` with signin mode

**3.2 Auth Page (`Auth.tsx`)**
- Default to signup mode (unchanged)
- Handle redirect parameter from invite links

---

### Phase 4: Home Page Refinements

**4.1 Fixture Display Logic**
- Show ONE next fixture per followed school (not all fixtures)
- Keep cognitive load low
- Scannable layout for daily habit formation

**4.2 Post-Onboarding Detection**
- Check if user has completed onboarding (`onboarding_completed_at` set)
- If not, redirect to onboarding continuation point

---

## File Changes Summary

### New Files to Create
| File | Purpose |
|------|---------|
| `src/components/auth/signup-steps/StepAccount.tsx` | Email + password entry |
| `src/components/auth/signup-steps/StepVerifyEmail.tsx` | Email verification gate |
| `src/components/auth/signup-steps/StepProfile.tsx` | Combined profile fields |
| `src/components/auth/signup-steps/StepWelcome.tsx` | Celebratory interstitial |
| `src/components/auth/signup-steps/StepNextMatch.tsx` | School's next fixture display |
| `src/components/auth/signup-steps/StepTournament.tsx` | Tournament following UI |
| `src/components/auth/signup-steps/StepPool.tsx` | Pool join/create UI |

### Files to Modify
| File | Changes |
|------|---------|
| `src/components/auth/SignUpFlow.tsx` | Complete restructure for new 7-step flow |
| `src/pages/Home.tsx` | Add onboarding completion check, refine fixture display |
| `src/pages/Auth.tsx` | Handle email verification state |

### Files to Remove/Deprecate
| File | Action |
|------|--------|
| `src/components/auth/signup-steps/StepName.tsx` | Remove (merged into StepProfile) |
| `src/components/auth/signup-steps/StepContact.tsx` | Remove (replaced by StepAccount) |
| `src/components/auth/signup-steps/StepRole.tsx` | Remove (merged into StepProfile) |
| `src/components/auth/signup-steps/StepPassword.tsx` | Remove (merged into StepAccount) |
| `src/components/auth/signup-steps/StepComplete.tsx` | Remove (replaced by StepWelcome) |

---

## Technical Considerations

### Email Verification Handling
- Use `supabase.auth.onAuthStateChange` to detect when email is verified
- Event `USER_UPDATED` with `email_confirmed_at` timestamp indicates verification
- Alternative: polling `supabase.auth.getUser()` every 3 seconds

### State Persistence
- Store signup progress in localStorage under key `trybal_onboarding_state`
- Clear on successful completion
- Allows resumption if user closes browser during verification

### Mobile-First Design
- All new steps must be mobile-optimized
- Touch-friendly buttons (min 44px hit targets)
- Avoid horizontal scrolling

### Validation
- Email: zod schema with email format validation
- Password: 8+ chars, uppercase, number, special character (existing pattern)
- Year of birth: 1920-current year dropdown
- School: validated against database (existing pattern)

---

## Success Criteria

After implementation, a new user will:
1. Have a verified email account
2. Have a complete profile with school affiliation
3. See their school's next match immediately
4. Follow at least one tournament
5. Be part of at least one pool (or have consciously skipped)
6. See a populated Home screen with actionable prediction CTAs
7. Know exactly what to do next

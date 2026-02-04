
# Parental Consent Flow Implementation Plan

## Overview

This plan implements a comprehensive parental consent system for Trybal, ensuring minors (users born in a year that would make them under 18) require verified parental consent before accessing advanced features. The flow is designed to be child-safe, POPIA-compliant, and parent-friendly.

---

## Age Calculation Logic

A user is considered a **minor** if:
```
currentYear - yearOfBirth < 18
```

Exception: If they are turning 18 in the current year (e.g., born 2008 in 2026), they are treated as 18+.

**Examples for 2026:**
- Born 2009 → 17 years old → Minor (consent required)
- Born 2008 → 18 years old → Adult (no consent required)
- Born 2007 → 19 years old → Adult (no consent required)

---

## User Journey Overview

### Minor (Child) Flow

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         MINOR USER JOURNEY                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Profile Setup ──► Age Detection ──► Parent Email Collection             │
│       │                  │                      │                        │
│  (Year of Birth)    (Under 18?)           (Required field)               │
│                          │                      │                        │
│                          ▼                      ▼                        │
│                    Set account_type      Send Consent Email              │
│                      = "minor"           via Edge Function               │
│                          │                      │                        │
│                          ▼                      ▼                        │
│                 Can use app with         Parent clicks link              │
│                 RESTRICTED features      ──► Consent granted             │
│                          │                      │                        │
│                          ▼                      ▼                        │
│              Blocked actions show     consent_status = "verified"        │
│              "Ask parent" dialog      ──► All features unlocked          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Parent Flow

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          PARENT JOURNEY                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Receive Email ──► Review Safety Info ──► Click Consent Link            │
│       │                    │                     │                       │
│   (Branded,           (Links to               (Secure token)             │
│    friendly)        /for-parents)                │                       │
│                                                  ▼                       │
│                                        Consent Landing Page              │
│                                              │                           │
│                                    ┌─────────┴─────────┐                 │
│                                    │                   │                 │
│                              "I Consent"        "I Do Not"               │
│                                    │                   │                 │
│                                    ▼                   ▼                 │
│                           Mark child verified   (No action,              │
│                           + Nudge parent       link expires)             │
│                           to create account                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Changes

### 1. New Table: `parental_consent_requests`

```sql
CREATE TABLE public.parental_consent_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_email TEXT NOT NULL,
  consent_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired', 'revoked')),
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT now(),
  email_sent_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  
  -- Change limiting (3 changes per 24h window)
  request_count INTEGER DEFAULT 1,
  first_request_at TIMESTAMPTZ DEFAULT now(),
  
  -- Parent account linking (optional)
  parent_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  UNIQUE(child_user_id, parent_email)
);

-- Index for token lookups
CREATE INDEX idx_consent_token ON parental_consent_requests(consent_token);

-- Index for parent email limits (max 10 children per email)
CREATE INDEX idx_parent_email ON parental_consent_requests(parent_email);

-- RLS Policies
ALTER TABLE parental_consent_requests ENABLE ROW LEVEL SECURITY;

-- Children can view their own consent requests
CREATE POLICY "Users can view their own consent requests"
  ON parental_consent_requests FOR SELECT
  USING (auth.uid() = child_user_id);

-- Children can create consent requests for themselves
CREATE POLICY "Users can create their own consent requests"
  ON parental_consent_requests FOR INSERT
  WITH CHECK (auth.uid() = child_user_id);

-- Children can update their own pending requests (email change)
CREATE POLICY "Users can update their own pending consent requests"
  ON parental_consent_requests FOR UPDATE
  USING (auth.uid() = child_user_id AND status = 'pending');

-- Admins can view all
CREATE POLICY "Admins can view all consent requests"
  ON parental_consent_requests FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
```

### 2. Database Function: Check Parent Email Limit

```sql
CREATE OR REPLACE FUNCTION check_parent_email_limit(p_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  consent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO consent_count
  FROM parental_consent_requests
  WHERE parent_email = p_email AND status = 'verified';
  
  RETURN consent_count < 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Database Function: Check Email Change Eligibility

```sql
CREATE OR REPLACE FUNCTION can_change_parent_email(p_user_id UUID)
RETURNS TABLE(can_change BOOLEAN, changes_remaining INTEGER, next_change_at TIMESTAMPTZ) AS $$
DECLARE
  latest_request RECORD;
  changes_in_window INTEGER;
BEGIN
  SELECT * INTO latest_request
  FROM parental_consent_requests
  WHERE child_user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT true, 3, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Count changes in last 24 hours from first_request_at
  IF latest_request.first_request_at > now() - interval '24 hours' THEN
    changes_in_window := latest_request.request_count;
    
    IF changes_in_window >= 3 THEN
      RETURN QUERY SELECT 
        false, 
        0, 
        latest_request.first_request_at + interval '24 hours';
      RETURN;
    ELSE
      RETURN QUERY SELECT 
        true, 
        3 - changes_in_window,
        NULL::TIMESTAMPTZ;
      RETURN;
    END IF;
  ELSE
    -- 24h window has passed, reset counter
    RETURN QUERY SELECT true, 3, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Edge Functions

### 1. `send-parental-consent` (NEW)

Sends the consent request email to the parent.

**Trigger:** Called when:
- Child submits parent email during onboarding
- Child updates parent email from profile
- Child clicks "Resend" button

**Email Content:**
- Branded Trybal header
- Child's first name (not full details for privacy)
- Explanation of what Trybal is
- Safety highlights (no gambling, POPIA compliant, moderated)
- Links to `/for-parents` safety page
- Contact email: `safety@trybal.app`
- Big "I Consent" button with unique token link
- Expiry notice (30 days)

### 2. `verify-parental-consent` (NEW)

Handles the consent verification when parent clicks the link.

**Input:** consent_token (from URL)

**Logic:**
1. Validate token exists and is not expired
2. Update `parental_consent_requests.status` to 'verified'
3. Update `parental_consent_requests.verified_at`
4. Update child's `profiles.consent_status` to 'verified'
5. Return success page with:
   - Confirmation message
   - "Join the fun" CTA to create parent's own account

---

## Frontend Components

### New Components

| Component | Purpose |
|-----------|---------|
| `src/components/consent/ParentalConsentGate.tsx` | HOC/hook that checks consent before allowing actions |
| `src/components/consent/ConsentRequiredDialog.tsx` | Pop-up shown when minor attempts blocked action |
| `src/components/consent/ParentEmailInput.tsx` | Email input with validation for parent email |
| `src/components/consent/ConsentStatusCard.tsx` | Profile section showing consent status |
| `src/pages/ParentConsent.tsx` | Landing page for parents clicking consent link |
| `src/hooks/useConsentStatus.ts` | Hook to check/manage consent status |

### Modified Components

| Component | Changes |
|-----------|---------|
| `StepProfile.tsx` | Add parent email field when year_of_birth indicates minor |
| `SignUpFlow.tsx` | Detect minor status, set account_type, trigger consent email |
| `Profile.tsx` | Show dynamic consent status card, allow email updates |
| `CreatePoolDialog.tsx` | Wrap creation action with consent gate |
| `JoinPool.tsx` | Wrap join action with consent gate for non-default pools |
| `PredictionDialog.tsx` | Gate predictions on non-user-school fixtures |
| `FixtureListCard.tsx` | Pass consent status to prediction button |
| `FixtureCard.tsx` | Pass consent status to prediction button |

---

## Component Specifications

### 1. ConsentRequiredDialog

Shown when a minor without consent attempts a blocked action.

```text
┌─────────────────────────────────────────┐
│        🔒 Parental Consent Required     │
├─────────────────────────────────────────┤
│                                         │
│  To access this feature, we need your   │
│  parent or guardian's permission.       │
│                                         │
│  📧 Ask your parent or guardian to      │
│     check their email.                  │
│                                         │
│  Sent to: p***@email.com               │
│                                         │
│  [Resend Email]    [Update Email]       │
│                                         │
│          [Got it]                       │
│                                         │
└─────────────────────────────────────────┘
```

### 2. ConsentStatusCard (in Profile)

**Pending State:**
```text
┌─────────────────────────────────────────┐
│ ⏳ Parental Consent: Pending            │
├─────────────────────────────────────────┤
│ We've sent a request to:                │
│ p***r@email.com                         │
│                                         │
│ Some features are limited until your    │
│ parent approves.                        │
│                                         │
│ [Resend Email]  [Update Parent Email]   │
│                                         │
│ Changes remaining: 2 of 3               │
└─────────────────────────────────────────┘
```

**Verified State:**
```text
┌─────────────────────────────────────────┐
│ ✅ Parental Consent: Verified           │
├─────────────────────────────────────────┤
│ Your account is fully activated.        │
│ Verified on: 14 Feb 2026                │
│                                         │
│ Protected under POPIA guidelines.       │
└─────────────────────────────────────────┘
```

### 3. ParentConsent Page (`/consent/:token`)

Landing page when parent clicks email link.

```text
┌─────────────────────────────────────────────────┐
│                  🏉 TRYBAL                       │
├─────────────────────────────────────────────────┤
│                                                  │
│  Parental Consent Request                        │
│                                                  │
│  Your child, [FirstName], is requesting          │
│  permission to use Trybal, a safe predictions    │
│  app for South African schoolboy rugby.          │
│                                                  │
│  ✓ No gambling, no prizes                        │
│  ✓ POPIA-compliant data handling                 │
│  ✓ All content is moderated                      │
│  ✓ No addictive mechanics                        │
│                                                  │
│  📚 Learn more about our safety measures         │
│     → /for-parents                               │
│                                                  │
│  📧 Questions? Contact safety@trybal.app         │
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │        ✅ I Give My Consent              │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  By consenting, you allow [FirstName] to         │
│  create pools, join pools, and make              │
│  predictions on all fixtures.                    │
│                                                  │
└─────────────────────────────────────────────────┘
```

**After Consent:**
```text
┌─────────────────────────────────────────────────┐
│                  🏉 TRYBAL                       │
├─────────────────────────────────────────────────┤
│                                                  │
│  ✅ Consent Confirmed!                           │
│                                                  │
│  [FirstName]'s account is now fully activated.   │
│  They can now access all features.               │
│                                                  │
│  ─────────────────────────────────────────────   │
│                                                  │
│  🎯 Want to join the fun?                        │
│                                                  │
│  Create your own Trybal account and compete      │
│  alongside your child!                           │
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │        🏆 Create My Account              │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  Trybal is safe for the whole family.            │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## Feature Restriction Logic

### useConsentStatus Hook

```typescript
interface ConsentStatus {
  isMinor: boolean;
  consentStatus: 'pending' | 'verified' | 'expired' | null;
  needsConsent: boolean; // isMinor && consentStatus !== 'verified'
  parentEmail: string | null;
  canChangeEmail: boolean;
  changesRemaining: number;
  nextChangeAt: Date | null;
}
```

### Restriction Rules

| Feature | Allowed Without Consent | Blocked Without Consent |
|---------|------------------------|-------------------------|
| View fixtures | ✅ | - |
| Predict on OWN school | ✅ | - |
| View leaderboards | ✅ | - |
| Join default pools (global, school, province) | ✅ | - |
| Create custom pools | - | ❌ |
| Join custom pools | - | ❌ |
| Predict on OTHER schools | - | ❌ |

### Implementation in Components

**PredictionDialog:**
```typescript
// Before allowing prediction
const { needsConsent } = useConsentStatus();
const isOwnSchool = userSchoolName === homeTeam || userSchoolName === awayTeam;

if (needsConsent && !isOwnSchool) {
  openConsentRequiredDialog();
  return;
}
```

**CreatePoolDialog:**
```typescript
// Before showing pool creation form
const { needsConsent } = useConsentStatus();

if (needsConsent) {
  return <ConsentRequiredDialog onClose={() => setOpen(false)} />;
}
```

**JoinPool:**
```typescript
// Before joining
const { needsConsent } = useConsentStatus();
const isDefaultPool = pool.type === 'global' || pool.type === 'school' || pool.type === 'province';

if (needsConsent && !isDefaultPool) {
  openConsentRequiredDialog();
  return;
}
```

---

## Email Change Logic

### Rules
- Maximum 3 email changes per 24-hour window
- After 3 changes, user must wait 24 hours or contact support
- Counter resets after 24 hours from first change in window

### UI Flow
1. User clicks "Update Parent Email" in ConsentStatusCard
2. If `canChangeEmail` is false:
   - Show disabled state with "Try again at [time]"
   - Show "Contact support" link
3. If allowed:
   - Show email input modal
   - Validate new email format
   - Check parent email limit (< 10 children)
   - Send new consent request
   - Invalidate old token

---

## Email Template

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; }
    .header { background: #1B4332; padding: 30px; text-align: center; }
    .header h1 { color: #FFD60A; margin: 0; font-size: 28px; }
    .content { padding: 30px; }
    .safety-box { background: #f0fdf4; border-left: 4px solid #1B4332; padding: 15px; margin: 20px 0; }
    .cta-button { display: block; background: #1B4332; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; text-align: center; margin: 30px auto; max-width: 250px; }
    .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏉 TRYBAL</h1>
      <p style="color: #95D5B2; margin-top: 10px;">Parental Consent Request</p>
    </div>
    
    <div class="content">
      <p>Hi there,</p>
      
      <p>Your child, <strong>[FirstName]</strong>, has signed up for Trybal — a fun, safe predictions app for South African schoolboy rugby.</p>
      
      <p>To unlock all features, we need your consent.</p>
      
      <div class="safety-box">
        <strong>Why Trybal is safe:</strong>
        <ul>
          <li>✓ No gambling, no prizes, no fees</li>
          <li>✓ POPIA-compliant — minimal data collection</li>
          <li>✓ All content is moderated</li>
          <li>✓ No addictive mechanics</li>
          <li>✓ Built by parents, for families</li>
        </ul>
      </div>
      
      <a href="[CONSENT_LINK]" class="cta-button">I Give My Consent</a>
      
      <p style="text-align: center; font-size: 14px; color: #666;">
        This link expires in 30 days.
      </p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
      
      <p style="font-size: 14px;">
        <strong>Questions?</strong><br />
        📚 <a href="[ORIGIN]/for-parents">Read our Safety Guide</a><br />
        📧 <a href="mailto:safety@trybal.app">safety@trybal.app</a>
      </p>
    </div>
    
    <div class="footer">
      <p>Trybal — Where School Pride Meets Predictions</p>
      <p>You received this because [FirstName] listed you as their parent/guardian.</p>
    </div>
  </div>
</body>
</html>
```

---

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `src/hooks/useConsentStatus.ts` | Hook to check and manage consent state |
| `src/components/consent/ConsentRequiredDialog.tsx` | Blocked action dialog |
| `src/components/consent/ConsentStatusCard.tsx` | Profile consent section |
| `src/components/consent/UpdateParentEmailDialog.tsx` | Email change modal |
| `src/pages/ParentConsent.tsx` | Parent consent landing page |
| `supabase/functions/send-parental-consent/index.ts` | Email sending function |
| `supabase/functions/verify-parental-consent/index.ts` | Consent verification function |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/auth/signup-steps/StepProfile.tsx` | Add parent email input for minors |
| `src/components/auth/SignUpFlow.tsx` | Detect minor, set account_type, trigger consent email |
| `src/pages/Profile.tsx` | Replace static consent section with ConsentStatusCard |
| `src/components/pools/CreatePoolDialog.tsx` | Add consent gate check |
| `src/pages/JoinPool.tsx` | Add consent gate for custom pools |
| `src/components/home/PredictionDialog.tsx` | Accept consent props |
| `src/components/home/FixtureCard.tsx` | Pass consent status to dialog |
| `src/components/fixtures/FixtureListCard.tsx` | Pass consent status, gate non-school predictions |
| `src/App.tsx` | Add route for `/consent/:token` |

---

## Implementation Phases

### Phase 1: Database Infrastructure
1. Create `parental_consent_requests` table with RLS
2. Create helper functions for email limits and change eligibility
3. Add indexes for performance

### Phase 2: Edge Functions
1. Create `send-parental-consent` function
2. Create `verify-parental-consent` function
3. Deploy and test email delivery

### Phase 3: Consent Hook & Context
1. Create `useConsentStatus` hook
2. Integrate with auth context
3. Add cache invalidation on consent changes

### Phase 4: Onboarding Integration
1. Update `StepProfile` to collect parent email for minors
2. Update `SignUpFlow` to set account_type and trigger email
3. Add friendly messaging about consent

### Phase 5: Feature Gating
1. Create `ConsentRequiredDialog`
2. Gate pool creation
3. Gate pool joining (custom pools only)
4. Gate predictions on non-school fixtures

### Phase 6: Profile Management
1. Create `ConsentStatusCard` component
2. Create `UpdateParentEmailDialog`
3. Implement change limiting UI

### Phase 7: Parent Consent Page
1. Create `/consent/:token` route
2. Build consent landing page
3. Add parent account creation nudge

---

## Technical Considerations

### Security
- Consent tokens are UUID v4 (cryptographically random)
- Tokens expire after 30 days
- Parent email is masked in child UI (p***r@email.com)
- Edge function uses service role for DB updates

### Performance
- Consent status cached in React Query
- Invalidated on verification webhook
- Minimal additional DB queries per page

### Edge Cases
- Parent uses email already at 10-child limit → friendly error
- Child changes email 3 times → must wait 24h or contact support
- Parent clicks expired link → show "expired" page with resend option
- Same parent email used for same child → update existing request

---

## Success Criteria

After implementation:
1. Minors are correctly detected based on year of birth
2. Parent email is collected during onboarding for minors
3. Consent email is sent with all safety information
4. Parents can easily consent via email link
5. Blocked features show clear "consent required" messaging
6. Children can check consent status in profile
7. Email change is limited to 3 per 24 hours
8. Parent emails are limited to 10 children max
9. Verified consent unlocks all features immediately (after refresh)
10. Parents are nudged to create their own accounts

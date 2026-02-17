## School Onboarding Portal & Admin Management

### Overview

Build a secure school onboarding system where admins invite school reps via unique, time-limited links. Reps fill out a form (after email OTP verification) that writes to the database via edge functions. Admins review and approve submissions from a new admin dashboard tab.

---

### 1. Database Schema (Migration)

**New table: `school_invitations**`


| Column         | Type                    | Notes                                               |
| -------------- | ----------------------- | --------------------------------------------------- |
| id             | uuid (PK)               | Auto-generated                                      |
| school_name    | text                    | Pre-filled by admin                                 |
| token_hash     | text (unique)           | SHA-256 hash of the token                           |
| contact_email  | text                    | Rep's email                                         |
| status         | text                    | pending / submitted / approved / rejected / expired |
| expires_at     | timestamptz             | Default: 7 days from creation                       |
| submitted_at   | timestamptz             | Null until form submitted                           |
| reviewed_at    | timestamptz             | Null until reviewed                                 |
| reviewed_by    | uuid                    | Admin who reviewed                                  |
| created_at     | timestamptz             | Auto-generated                                      |
| otp_code       | text                    | 6-digit OTP (hashed)                                |
| otp_expires_at | timestamptz             | OTP valid for 10 minutes                            |
| otp_attempts   | int (default 0)         | Max 5 attempts                                      |
| otp_verified   | boolean (default false) | Whether OTP was verified                            |
| expiry_days    | int (default 7)         | Configured expiry duration                          |


**New table: `school_submissions**`


| Column               | Type            | Notes                       |
| -------------------- | --------------- | --------------------------- |
| id                   | uuid (PK)       | Auto-generated              |
| invitation_id        | uuid (FK)       | Links to school_invitations |
| full_official_name   | text            | Required                    |
| nickname             | text            | Required                    |
| province             | text            | Required                    |
| year_established     | int             | Required                    |
| school_motto         | text            | Optional                    |
| main_rival           | text            | Optional                    |
| number_of_springboks | int (default 0) | Optional                    |
| school_trivia        | text            | Optional, max 500 chars     |
| crest_image_url      | text            | Optional                    |
| primary_colour       | text            | Optional                    |
| secondary_colour     | text            | Optional                    |
| contact_name         | text            | Required                    |
| contact_email        | text            | Required                    |
| contact_phone        | text            | Required                    |
| created_at           | timestamptz     | Auto-generated              |


**RLS Policies:**

- `school_invitations`: Admin-only for all operations (SELECT, INSERT, UPDATE, DELETE)
- `school_submissions`: Admin-only SELECT; no direct client INSERT (handled via edge function with service role)

**Storage:**

- Reuse existing `school-request-logos` bucket (already public) for crest uploads, or create a new `school-onboarding-crests` public bucket

---

### 2. Edge Functions

`**school-onboarding` (single edge function with action routing)**

Handles all public-facing operations without giving reps direct DB access:

- `**validate-token**`: Accepts a token, hashes it, looks up the invitation. Returns status (valid/expired/submitted/invalid) and school_name + contact_email if valid.
- `**send-otp**`: Generates a 6-digit OTP, stores the hash in `school_invitations`, sends it via Resend to the contact email. Checks rate limits.
- `**verify-otp**`: Validates the OTP against the stored hash. Increments `otp_attempts` on failure. Locks after 5 attempts.
- `**submit-form**`: Validates the token + OTP verification status, validates all input fields server-side (SA phone format, character limits, number ranges), writes to `school_submissions`, updates invitation status to `submitted`.
- `**upload-crest**`: Accepts an image file, validates type (PNG/JPG/SVG) and size (max 2MB), uploads to storage, returns the public URL.

All actions use the service role key internally. The token acts as the authentication mechanism for reps.

---

### 3. Admin Dashboard -- "School Onboarding" Tab

Add an 11th tab to `AdminLayout.tsx` with a `GraduationCap` (or `Mail`) icon.

**Components to create:**

- `**SchoolOnboardingTab.tsx**` -- Main tab content with invite button + invitation tracker table
- `**CreateInvitationDialog.tsx**` -- Modal with school name, contact email, expiry dropdown (7/14/30 days). On submit: generates token client-side, stores hash via Supabase, displays the link with a "Copy Link" button. Warns if a pending invite already exists for that school name.
- `**InvitationTracker.tsx**` -- Table showing all invitations with columns: School Name, Contact Email, Status (color-coded badges), Sent Date, Expiry Date, Actions. Filter dropdown by status. Default sort: submitted first.
- `**ReviewSubmissionDialog.tsx**` -- Side panel/dialog showing all submitted form data and crest preview. Two action buttons: Approve (creates/updates school in `schools` table, sets status to approved) and Reject (with optional reason field). On approve, warns if a school with the same name already exists and lets admin choose to update or skip.

---

### 4. Public Route -- `/school-setup/:token`

**New page: `SchoolSetup.tsx**`

A state-machine driven page (similar to `ParentConsent.tsx` pattern) with states:

1. **Loading** -- Validates token via edge function
2. **Invalid / Expired / Already Submitted** -- Friendly error messages
3. **OTP Verification** -- "Verify your identity" screen with 6-digit input (using existing `InputOTP` component), resend button
4. **Form** -- Two-section form (School Information + Contact Details) with Trybal branding, inline validation, character counter for trivia, image upload with preview
5. **Thank You** -- Confirmation page with school name

**Form validation (client-side):**

- Required fields enforced before submit button enables
- Phone: 10 digits starting with 0
- Year: between 1850 and current year
- Trivia: max 280 characters
- Image: PNG/JPG/SVG, max 2MB

---

### 5. Routing

Add to `App.tsx`:

```
<Route path="/school-setup/:token" element={<SchoolSetup />} />
```

---

### 6. Security Summary

- Tokens are cryptographically random (crypto.randomUUID x2 concatenated for 64+ chars), only hashes stored in DB
- OTP hashed before storage, rate-limited to 5 attempts
- All form writes go through the edge function with server-side validation
- Reps never touch any table directly
- Admin-only RLS on both new tables
- Image uploads validated server-side for type and size

---

### 7. Files to Create/Modify

**New files:**

- `supabase/migrations/[timestamp]_school_onboarding.sql` -- Tables, RLS, storage bucket
- `supabase/functions/school-onboarding/index.ts` -- Edge function for all rep-facing operations
- `src/pages/SchoolSetup.tsx` -- Public form page
- `src/components/admin/SchoolOnboardingTab.tsx` -- Admin tab content
- `src/components/admin/CreateInvitationDialog.tsx` -- Invite creation modal
- `src/components/admin/InvitationTracker.tsx` -- Invitations table
- `src/components/admin/ReviewSubmissionDialog.tsx` -- Submission review panel

**Modified files:**

- `src/components/admin/AdminLayout.tsx` -- Add 11th tab for School Onboarding
- `src/App.tsx` -- Add `/school-setup/:token` route
- `supabase/config.toml` -- Add `[functions.school-onboarding]` with `verify_jwt = false`

---

### 8. Simplifications from the Original Spec

- **Token hashing**: Store SHA-256 hash only (no separate raw `token` column). The raw token exists only in the URL and is hashed on every lookup.
- **Single edge function**: One `school-onboarding` function with action-based routing instead of multiple separate functions.
- **No cron for expiry**: Check expiry at query time (WHERE expires_at > now()) rather than running a cron job. Status stays "pending" but the UI/edge function treats expired tokens as expired.
- **No partial save**: As specified, no draft/partial submission support.
- **Email sending on invite**: Uses the existing Resend integration to send the OTP. The invite link itself is copied manually by the admin (with an optional "Send Email" button added later).
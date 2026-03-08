

# Copy Document Update Plan

## Summary

The document provides updated copy for 6 areas: Landing Page, Onboarding, Terms & Conditions, Privacy Policy, Age Policy, and Taglines. I'll map each to existing pages and update the text content. No new pages or features will be created except for an Age Policy page, which already has a route pattern established and is referenced in the footer.

**Note:** The document references an "Age Policy" page that doesn't exist yet. Since the footer and holding footer already link to Terms and Privacy Policy, and the T&Cs footer in the doc references it, I'll create an `AgePolicy.tsx` page and add it to the router — this is just a static content page, not a new feature.

## Changes by File

### 1. Landing Page (Index route) — Hero, Features, SocialProof, HowItWorks, Safety, Footer

**`src/components/Hero.tsx`**
- Update hero badge text: keep "The Digital Home of Schoolboy Rugby" (aligns with doc's "South Africa's home of schoolboy rugby")
- Update h1 from "For the Badge." → keep as-is (brand identity, doc's "Your Tribe. Your Rugby." is the primary tagline but "For the Badge" is the established brand)
- Update subtitle to: "South Africa's home of schoolboy rugby. Follow your school. Track every First XV fixture. Predict the results. Settle the debate."
- Update secondary line to: "No betting. No gambling. Just pure schoolboy rugby."
- Update CTA text: "Download the App" button labels to show "Free on Android & iOS" (currently "Coming to iOS"/"Coming to Android")

**`src/components/Features.tsx`**
- Update feature titles/descriptions to match doc's "Core Features":
  - "Follow Your School" → "Select your school and make it yours..."
  - "Predictions & Leaderboards" → "Think you know schoolboy rugby better than your chommies? Prove it..."
  - "Every First XV Fixture, Every Weekend" → fixture tracking copy
  - "School Profiles & History" → exploration copy

**`src/components/SocialProof.tsx`**
- Update heading to "Built by the Community, for the Community"
- Update subtitle to the doc's community copy
- Update stats label "200+ schools and counting" feel

**`src/components/Footer.tsx`**
- Update CTA section heading to "Get in the Game"
- Update subtitle: "Trybal is free to download on Android and iOS. Pick your school, follow the season, and join the tribe."
- Update contact email to `trybalrugby@gmail.com`
- Update copyright to "© 2026 Trybal"
- Add Age Policy link in Legal section
- Update footer tagline to "South Africa's home of schoolboy rugby"

### 2. Holding Page (trybal.co.za pre-launch)

**`src/pages/HoldingPage.tsx`**
- Update h1 to: "Your Tribe. Your Rugby." with subtitle "South Africa's home of schoolboy rugby..."
- Update tagline from "Where School Pride Meets Predictions" → "Follow your school. Track every First XV fixture. Settle the debate."
- Update beta signup heading: "Help us build the ultimate schoolboy rugby database"
- Update copyright year in footer

### 3. Holding Footer

**`src/components/holding/HoldingFooter.tsx`**
- Add Age Policy link
- Update contact email to `trybalrugby@gmail.com`
- Update copyright to "© 2026"

### 4. Terms & Conditions — Full Rewrite

**`src/pages/Terms.tsx`**
- Replace all content with the 13-section T&Cs from the document (Introduction, Eligibility, Account Registration, Acceptable Use, Predictions & Leaderboards, User-Submitted Content, Intellectual Property, Sponsorship & Advertising, Availability & Modifications, Limitation of Liability, Termination, Governing Law, Contact)
- Update entity name to "Kamoo Pty Ltd"
- Update contact email to `trybalrugby@gmail.com`
- Update date to "March 2026"

### 5. Privacy Policy — Full Rewrite

**`src/pages/PrivacyPolicy.tsx`**
- Replace all content with the 13-section Privacy Policy from the document
- Include POPIA legal basis, children's privacy, data retention, security, rights sections
- Update entity to "Kamoo Pty Ltd"
- Update contact to `trybalrugby@gmail.com`

### 6. Age Policy — New Page

**`src/pages/AgePolicy.tsx`** (new file)
- Create page with same styling as Terms/PrivacyPolicy (HoldingHeader + HoldingFooter)
- Sections: Minimum Age, Users 13-17, Under 13, Age Verification, No Gambling, Reporting Concerns
- Contact: `trybalrugby@gmail.com`

**`src/components/AnimatedRoutes.tsx`**
- Add lazy import for AgePolicy
- Add route `/age-policy`

### 7. Privacy Note (For Kids)

**`src/pages/PrivacyNote.tsx`**
- No changes needed — existing copy aligns well with the doc's spirit. The doc doesn't have an explicit "short privacy note" section with different copy.

### 8. For Players / For Parents / For Schools

These pages already exist with similar structure. The doc copy is close to what's already there. I'll leave these pages as-is since the differences are minor stylistic variations.

### 9. ScoringInfoCard

**`src/components/pools/ScoringInfoCard.tsx`**
- No change needed — aligns with existing scoring system.

## Files to Edit (10 total)
1. `src/components/Hero.tsx` — updated copy
2. `src/components/Features.tsx` — updated feature descriptions
3. `src/components/SocialProof.tsx` — updated heading/copy
4. `src/components/Footer.tsx` — updated CTA, email, links, copyright
5. `src/pages/HoldingPage.tsx` — updated hero copy
6. `src/components/holding/HoldingFooter.tsx` — add age policy link, update email/copyright
7. `src/pages/Terms.tsx` — full rewrite with document content
8. `src/pages/PrivacyPolicy.tsx` — full rewrite with document content
9. `src/pages/AgePolicy.tsx` — new page
10. `src/components/AnimatedRoutes.tsx` — add age-policy route


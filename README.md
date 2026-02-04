# Trybal - Schools Rugby Prediction Platform

A mobile-first web application for South African schools rugby predictions, pools, and leaderboards.

**Live URL**: https://tryble-rugby-grounds.lovable.app

## 🏉 Overview

Trybal allows users to predict rugby match outcomes for South African schools, compete in leaderboards, and join pools with friends. The platform includes special features for minors with parental consent requirements.

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (Lovable Cloud)
  - PostgreSQL database with Row Level Security
  - Edge Functions (Deno) for server-side logic
  - Realtime subscriptions for live updates
- **Mobile**: Capacitor for iOS/Android builds

### Project Structure
```
src/
├── components/
│   ├── admin/          # Admin panel components
│   ├── auth/           # Authentication flows
│   ├── consent/        # Parental consent UI
│   ├── fixtures/       # Fixture display components
│   ├── home/           # Home page widgets
│   ├── pools/          # Pool management
│   ├── scores/         # Score submission
│   └── ui/             # Reusable UI components (shadcn)
├── hooks/              # Custom React hooks
├── lib/                # Utilities and helpers
│   ├── fixtureParser/  # CSV/paste import parsing
│   └── constants.ts    # App-wide constants
├── pages/              # Route components
└── integrations/       # Supabase client & types
supabase/
├── functions/          # Edge functions
└── migrations/         # Database migrations
```

## 📊 Database Schema

### Core Tables
| Table | Purpose |
|-------|---------|
| `profiles` | User profiles with school, age band, consent status |
| `schools` | School master data with jerseys, colors, provinces |
| `fixtures` | Match data with home/away schools, scores, dates |
| `predictions` | User predictions with team, margin, points earned |
| `pools` | User-created prediction pools |
| `pool_members` | Pool membership mapping |
| `tournaments` | Festival/tournament events |

### Compliance Tables
| Table | Purpose |
|-------|---------|
| `parental_consent_requests` | Tracks minor consent requests |
| `user_sanctions` | Bans, suspensions, warnings |
| `admin_audit_log` | Immutable admin action log |
| `user_reports` | Community moderation reports |

## 🔒 Business Rules

### Parental Consent (Minors)
- **Minor Definition**: `currentYear - yearOfBirth < 18` (exception: users turning 18 this year are adults)
- **Restrictions for Unverified Minors**:
  - Cannot create/join custom pools
  - Cannot predict on non-affiliated school fixtures
- **Consent Flow**:
  1. Minor provides parent email during signup
  2. System sends verification email via Resend
  3. Parent clicks link to verify (30-day expiry)
  4. Consent stored in `parental_consent_requests`
- **Limits**: Max 10 children per parent email; 3 email changes per 24 hours

### Prediction Scoring
- Correct winner prediction: **3 points**
- Exact margin bonus: **+2 points**
- Predictions lock at match kickoff time
- Draws treated as separate outcome

### Fixture Status Flow
```
upcoming → live → completed
                ↘ cancelled
```

### Year Threshold
- Fixtures in year ≥ `UPCOMING_YEAR_THRESHOLD` (2026) default to "upcoming" status
- Historical fixtures default to "won" for the home school

## 🛠️ Environment Setup

### Prerequisites
- Node.js 18+ (use nvm)
- Bun (optional, for faster installs)

### Local Development
```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

### Environment Variables
The `.env` file is auto-managed by Lovable Cloud. Required variables:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Anon key for client

### Edge Function Secrets
Managed via Lovable Cloud > Secrets:
- `RESEND_API_KEY` - Email delivery for consent

## 👨‍💼 Admin Panel

Access: `/admin` (requires `admin` role in `user_roles` table)

### Features
| Tab | Purpose |
|-----|---------|
| Schools | Manage school data, jerseys, archive/restore |
| Fixtures | CRUD fixtures, bulk imports, visibility toggle |
| Tournaments | Create/edit festivals and tournaments |
| Pool Packs | Pre-made school collections for pools |
| Users | View profiles, apply sanctions, view activity |
| Reports | Review community reports, take action |
| Ads | Manage carousel advertisements |
| News | Manage news carousel items |
| Analytics | User growth, moderation workload charts |

### Historical Fixtures Upload
- Supports markdown tables, TSV, and concatenated text
- Fuzzy matching for school names (handles abbreviations)
- Auto-creates missing schools/tournaments
- See `src/lib/fixtureParser/` for parsing logic

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run with coverage
npm run test -- --coverage
```

Test files located alongside source files with `.test.ts(x)` suffix.

## 📱 Mobile Builds

Uses Capacitor for native builds:
```bash
# Sync web assets to native projects
npx cap sync

# Open in Xcode (iOS)
npx cap open ios

# Open in Android Studio
npx cap open android
```

## 🔗 Key Files Reference

| File | Purpose |
|------|---------|
| `src/lib/constants.ts` | App-wide configuration values |
| `src/lib/fixtureParser/` | Import parsing and fuzzy matching |
| `src/hooks/useConsentStatus.ts` | Minor consent checking hook |
| `src/hooks/useEffectiveDate.ts` | Simulation mode date handling |
| `src/components/ErrorBoundary.tsx` | Global error catching |
| `src/lib/logger.ts` | Structured logging with PII sanitization |

## 📞 Contact

- WhatsApp Support: +27 83 638 8389
- Scorekeeper Applications: Via WhatsApp with school name

---

Built with [Lovable](https://lovable.dev)

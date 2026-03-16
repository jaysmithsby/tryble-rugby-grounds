

## Build n8n Data API Edge Function

### Overview
Create a single edge function `n8n-data-api` that exposes endpoints for n8n to read schools, read fixtures, and update fixtures (scores/status). Authenticated via a shared API key stored as a secret (`N8N_API_KEY`), avoiding exposure of the service role key.

### Secret Setup
- Add a new secret `N8N_API_KEY` — a random string the user generates and also configures in n8n's HTTP Request node headers. This is distinct from the existing `N8N_SCHOOL_WEBHOOK_URL`.

### Edge Function: `supabase/functions/n8n-data-api/index.ts`

**Authentication**: Every request must include `x-api-key` header matching the `N8N_API_KEY` secret. Returns 401 otherwise.

**Routes** (determined by `action` query param or JSON body):

| Action | Method | Description |
|---|---|---|
| `get-schools` | GET | Returns all visible, non-archived schools (id, name, slug, province, jersey_url, status, etc.) |
| `get-fixtures` | GET | Returns fixtures with school names. Supports query params: `start_date`, `end_date`, `status`, `school_id` |
| `update-fixture` | POST | Updates a fixture row by `id`. Accepts `score_a`, `score_b`, `status` fields. Uses service role client so RLS is bypassed server-side. |

**Key implementation details**:
- Uses `SUPABASE_SERVICE_ROLE_KEY` internally (already available as a secret) to read/write data without RLS restrictions
- Input validation: fixture `id` must be UUID, scores must be non-negative integers, status must be one of the allowed values
- Returns structured JSON with `success`, `data`, `error` fields
- CORS headers included for completeness but n8n calls server-to-server

**Config**: Add `verify_jwt = false` in `supabase/config.toml` since auth is via API key, not JWT.

### Frontend Reactivity
Fixture updates from n8n write directly to the `fixtures` table. The frontend already uses React Query to fetch fixtures — data will appear on next refetch/page load. No additional frontend changes needed. If real-time is desired later, we can add Supabase Realtime on the fixtures table.

### n8n Usage
In n8n HTTP Request nodes:
- **URL**: `https://fhqnakctskrzqurcksqv.supabase.co/functions/v1/n8n-data-api?action=get-schools`
- **Header**: `x-api-key: <the N8N_API_KEY value>`
- For updates: POST to `?action=update-fixture` with JSON body `{ "id": "fixture-uuid", "score_a": 24, "score_b": 17, "status": "completed" }`

### Files
- **New**: `supabase/functions/n8n-data-api/index.ts`
- **Edit**: `supabase/config.toml` (add `[functions.n8n-data-api]` with `verify_jwt = false`)


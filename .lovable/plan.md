

## Plan: Biometric Authentication with Robust Error Handling

Incorporating the three refinements into the previously approved plan.

### New File: `src/lib/biometricAuth.ts`

Core utility with platform-gated native calls. Key design decisions per your feedback:

**1. Lockout Handling**
- `isBiometricAvailable()` catches all plugin errors (including `BIOMETRIC_LOCKED_OUT`, `BIOMETRIC_NOT_ENROLLED`, device-level errors) and returns `false`, ensuring the standard SignInForm always renders as fallback.
- `promptBiometric()` wraps the native call in try/catch, returning `false` on any failure (cancellation, lockout, hardware error). Never throws.

**2. Token Storage**
- `saveSessionToSecureStorage(accessToken, refreshToken)` saves **both** tokens as separate keys in OS secure storage.
- `getSessionFromSecureStorage()` returns `{ access_token, refresh_token } | null`.
- On session restore in `Auth.tsx`, calls `supabase.auth.setSession({ access_token, refresh_token })` which handles silent refresh if the access token is expired but the refresh token is still valid.

**3. Dialog Timing in SignInForm**
- After `signInWithPassword()` succeeds, call `isBiometricAvailable()` **before** showing `BiometricPromptDialog`.
- Only open the dialog if: (a) on native platform, (b) biometrics available and not locked out, (c) user hasn't previously opted in.
- If any check fails, skip the dialog silently and proceed to `/home`.

### Files

| File | Change |
|---|---|
| `src/lib/biometricAuth.ts` | New -- all native calls wrapped in try/catch returning safe defaults; saves both access + refresh tokens |
| `src/components/auth/BiometricPromptDialog.tsx` | New -- opt-in dialog, only rendered when `isBiometricAvailable()` resolves `true` |
| `src/components/auth/SignInForm.tsx` | Post-login: await `isBiometricAvailable()` then conditionally show dialog; save both tokens on opt-in |
| `src/pages/Auth.tsx` | On mount: attempt biometric restore with `setSession({ access_token, refresh_token })`; any failure falls through to normal UI |
| `src/hooks/useHomeAuth.ts` | `handleSignOut`: clear secure storage + biometric preference |

### Key Code Patterns

```typescript
// biometricAuth.ts - lockout-safe availability check
export async function isBiometricAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    await NativeBiometric.isAvailable();
    return true;
  } catch {
    // Covers: NOT_AVAILABLE, LOCKED_OUT, NOT_ENROLLED, any hardware error
    return false;
  }
}

// biometricAuth.ts - safe prompt that never throws
export async function promptBiometric(): Promise<boolean> {
  try {
    await NativeBiometric.verifyIdentity({ reason: "Log in to Trybal" });
    return true;
  } catch {
    return false; // user cancelled, locked out, or hardware failure
  }
}

// Auth.tsx - session restore with refresh token
const tokens = await getSessionFromSecureStorage();
if (tokens) {
  // setSession handles expired access_token by using refresh_token
  const { error } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });
  if (!error) { navigate("/home"); return; }
}
// Any failure → fall through to SignInForm

// SignInForm.tsx - dialog timing
const { data } = await supabase.auth.signInWithPassword({ ... });
if (data.session && !getBiometricPreference()) {
  const available = await isBiometricAvailable();
  if (available) setShowBiometricDialog(true);
  else navigate("/home");
}
```


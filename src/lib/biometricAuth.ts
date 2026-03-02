import { Capacitor } from "@capacitor/core";

// Lazy imports to avoid bundling native plugins on web
let NativeBiometric: any = null;
let SecureStoragePlugin: any = null;

async function loadNativeBiometric() {
  if (!NativeBiometric) {
    const mod = await import("capacitor-native-biometric");
    NativeBiometric = mod.NativeBiometric;
  }
  return NativeBiometric;
}

async function loadSecureStorage() {
  if (!SecureStoragePlugin) {
    const mod = await import("capacitor-secure-storage-plugin");
    SecureStoragePlugin = mod.SecureStoragePlugin;
  }
  return SecureStoragePlugin;
}

const STORAGE_KEY_ACCESS = "trybal_access_token";
const STORAGE_KEY_REFRESH = "trybal_refresh_token";
const PREF_KEY = "trybal_biometric_enabled";

/**
 * Check if biometric authentication is available on this device.
 * Returns false on web, when locked out, not enrolled, or any hardware error.
 */
export async function isBiometricAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const bio = await loadNativeBiometric();
    await bio.isAvailable();
    return true;
  } catch {
    // Covers: NOT_AVAILABLE, LOCKED_OUT, NOT_ENROLLED, any hardware error
    return false;
  }
}

/**
 * Prompt the user for biometric verification (FaceID / TouchID / fingerprint).
 * Returns true on success, false on any failure (cancel, lockout, error). Never throws.
 */
export async function promptBiometric(): Promise<boolean> {
  try {
    const bio = await loadNativeBiometric();
    await bio.verifyIdentity({
      reason: "Log in to Trybal",
      title: "Biometric Login",
      subtitle: "Verify your identity",
      description: "Use Face ID or fingerprint to sign in",
    });
    return true;
  } catch {
    return false; // user cancelled, locked out, or hardware failure
  }
}

/**
 * Save both access and refresh tokens to OS-level secure storage (Keychain / Keystore).
 */
export async function saveSessionToSecureStorage(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const storage = await loadSecureStorage();
    await storage.set({ key: STORAGE_KEY_ACCESS, value: accessToken });
    await storage.set({ key: STORAGE_KEY_REFRESH, value: refreshToken });
  } catch (e) {
    console.warn("Failed to save session to secure storage:", e);
  }
}

/**
 * Retrieve session tokens from secure storage.
 * Returns null if either token is missing or on any error.
 */
export async function getSessionFromSecureStorage(): Promise<{
  access_token: string;
  refresh_token: string;
} | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const storage = await loadSecureStorage();
    const { value: access_token } = await storage.get({ key: STORAGE_KEY_ACCESS });
    const { value: refresh_token } = await storage.get({ key: STORAGE_KEY_REFRESH });
    if (access_token && refresh_token) {
      return { access_token, refresh_token };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Clear all stored session tokens from secure storage.
 */
export async function clearSecureStorage(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const storage = await loadSecureStorage();
    await storage.remove({ key: STORAGE_KEY_ACCESS });
    await storage.remove({ key: STORAGE_KEY_REFRESH });
  } catch (e) {
    console.warn("Failed to clear secure storage:", e);
  }
}

/**
 * Get the user's biometric login preference (non-sensitive, stored in localStorage).
 */
export function getBiometricPreference(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Set the user's biometric login preference.
 */
export function setBiometricPreference(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(PREF_KEY, "true");
    } else {
      localStorage.removeItem(PREF_KEY);
    }
  } catch {
    // localStorage unavailable, silently ignore
  }
}

/**
 * Supabase Client Module for InvestSathi
 * Reads configuration from Vite environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_ANON_KEY)
 * with fallback to user-provided localStorage credentials for interactive mobile and web configuration.
 * 
 * NEVER hardcode secret or service-role keys.
 */
import { createClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'investsathi_supabase_url';
const STORAGE_KEY_ANON = 'investsathi_supabase_anon_key';

/**
 * Cleans and sanitizes a Supabase URL (e.g. strips accidental /rest/v1 or trailing slashes).
 */
export function cleanSupabaseUrl(rawUrl) {
  if (!rawUrl) return '';
  let cleaned = rawUrl.trim();
  cleaned = cleaned.replace(/\/rest\/v1\/?$/i, '');
  cleaned = cleaned.replace(/\/auth\/v1\/?$/i, '');
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}

/**
 * Retrieves the currently active Supabase URL and Publishable/Anon key.
 */
export function getSupabaseConfig() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

  let localUrl = null;
  let localKey = null;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localUrl = window.localStorage.getItem(STORAGE_KEY_URL);
      localKey = window.localStorage.getItem(STORAGE_KEY_ANON);
    }
  } catch (e) {
    // ignore localstorage errors
  }

  const rawUrl = (localUrl && localUrl.trim()) || (envUrl && envUrl.trim()) || '';
  const url = cleanSupabaseUrl(rawUrl);
  const key = (localKey && localKey.trim()) || (envKey && envKey.trim()) || '';

  // Check URL validity
  const isPlaceholderUrl = !url || url.includes('your-project-id') || url === 'https://placeholder-project.supabase.co';
  const hasValidUrl = Boolean(url && url.startsWith('https://') && !isPlaceholderUrl);

  // Check Key validity
  const isPlaceholderKey = !key || key.includes('placeholder-anon-key') || key.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
  const hasValidKey = Boolean(key && key.length > 20 && !isPlaceholderKey);

  const isConfigured = hasValidUrl && hasValidKey;

  let configError = null;
  if (!hasValidUrl && !hasValidKey) {
    configError = 'Both Supabase Project URL and Publishable/Anon Key are missing.';
  } else if (!hasValidUrl) {
    configError = 'Your Supabase Project URL is not set (replace placeholder https://your-project-id.supabase.co with your actual project URL from Supabase Project Settings → API).';
  } else if (!hasValidKey) {
    configError = 'Your Supabase Publishable / Anon Key is missing or invalid.';
  }

  return {
    url,
    key,
    isConfigured,
    hasValidUrl,
    hasValidKey,
    configError,
    source: (localUrl || localKey) ? 'manual' : (envUrl ? 'env' : 'none'),
  };
}

/**
 * Checks whether Supabase is configured with valid URL & Publishable Key.
 */
export function isSupabaseConfigured() {
  return getSupabaseConfig().isConfigured;
}

/**
 * Saves custom Supabase credentials in local storage for instant live testing.
 */
export function saveSupabaseConfig(url, key) {
  if (typeof window !== 'undefined' && window.localStorage) {
    const cleaned = cleanSupabaseUrl(url);
    window.localStorage.setItem(STORAGE_KEY_URL, cleaned);
    window.localStorage.setItem(STORAGE_KEY_ANON, (key || '').trim());
    window.location.reload();
  }
}

/**
 * Clears custom credentials.
 */
export function clearSupabaseConfig() {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(STORAGE_KEY_URL);
    window.localStorage.removeItem(STORAGE_KEY_ANON);
    window.location.reload();
  }
}

const config = getSupabaseConfig();
const defaultPlaceholderUrl = 'https://placeholder-project.supabase.co';
const defaultPlaceholderKey = 'placeholder-anon-key-investsathi-1234567890';

/**
 * Main Supabase client instance.
 * Uses real createClient from @supabase/supabase-js.
 */
export const supabase = createClient(
  config.url || defaultPlaceholderUrl,
  config.key || defaultPlaceholderKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'investsathi_auth_token',
    },
  }
);

/**
 * Tests connection to the configured Supabase instance.
 */
export async function testSupabaseConnection() {
  const current = getSupabaseConfig();
  if (!current.isConfigured) {
    return {
      success: false,
      message: 'Supabase URL and Publishable/Anon key are not configured yet.',
    };
  }

  try {
    // Try pinging auth service session check
    const { data, error } = await supabase.auth.getSession();
    if (error && error.message && !error.message.includes('session')) {
      return { success: false, message: error.message };
    }
    return {
      success: true,
      message: 'Successfully connected to Supabase backend!',
      sessionActive: !!data?.session,
    };
  } catch (err) {
    return {
      success: false,
      message: err.message || 'Failed to connect to Supabase.',
    };
  }
}

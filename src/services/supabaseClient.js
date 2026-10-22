// Supabase client factory — the app degrades gracefully to localStorage-only
// mode when the environment variables are not configured.
//
// The Supabase SDK is by far the largest dependency in this app (~210 kB of
// minified JS) and it is only needed for the cloud features. It is therefore
// fetched on demand instead of being bundled into the initial payload: a
// visitor who never signs in never downloads it at all.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let clientPromise = null;

// Create (once) and return the Supabase client. The dynamic import is what
// keeps the SDK out of the initial bundle.
export function getSupabase() {
  if (!isSupabaseConfigured) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js')
      .then(({ createClient }) =>
        createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        })
      )
      .catch((err) => {
        // Allow a later attempt to retry the download.
        clientPromise = null;
        throw err;
      });
  }
  return clientPromise;
}

// True when the browser already holds a Supabase session, or when the current
// URL carries an inbound auth callback (magic link / OAuth). Only in those
// cases is it worth downloading the SDK before the user asks for it.
export function hasStoredAuthSession() {
  if (!isSupabaseConfigured) return false;
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) return true;
    }
  } catch {
    // storage unavailable — assume no session
  }
  try {
    const hash = window.location.hash || '';
    if (hash.includes('access_token=') || hash.includes('error_description=')) return true;
  } catch {
    // no window (non-browser context)
  }
  return false;
}

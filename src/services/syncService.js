// Cloud sync layer: auth + session history persistence in Supabase.
// All functions are no-ops (or safe fallbacks) when Supabase is not configured.
//
// The Supabase SDK is downloaded on demand (see supabaseClient.js), so every
// function here resolves the client lazily instead of importing it eagerly.

import { getSupabase, hasStoredAuthSession, isSupabaseConfigured } from './supabaseClient';

const PULL_WINDOW_DAYS = 30;

// Convert a local history item into a Supabase row and back
function toRow(session, userId) {
  const startedAt = new Date(session.timestamp);
  return {
    id: session.id,
    user_id: userId,
    title: session.title || '',
    type: session.type,
    start_time: session.startTime || null,
    duration_minutes: session.durationMinutes,
    completed: Boolean(session.completed),
    session_date: session.date,
    started_at: startedAt.toISOString(),
  };
}

function fromRow(row) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    startTime: row.start_time || '',
    durationMinutes: row.duration_minutes,
    completed: row.completed,
    date: row.session_date,
    timestamp: new Date(row.started_at).getTime(),
  };
}

function daysAgoDateStr(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const NO_SUBSCRIPTION = { data: { subscription: { unsubscribe() {} } } };

export const syncService = {
  isConfigured: isSupabaseConfigured,

  // ---- Auth --------------------------------------------------------------

  async signUpWithEmail(email, password) {
    if (!isSupabaseConfigured) throw new Error('Cloud sync is not configured.');
    const supabase = await getSupabase();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data; // data.session is null when email confirmation is required
  },

  async signInWithEmail(email, password) {
    if (!isSupabaseConfigured) throw new Error('Cloud sync is not configured.');
    const supabase = await getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    if (!isSupabaseConfigured) return;
    // The session may never have been downloaded (guest that never signed in).
    if (!hasStoredAuthSession()) return;
    const supabase = await getSupabase();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    if (!isSupabaseConfigured) return null;
    // Nothing to restore — do not download the SDK just to find that out.
    if (!hasStoredAuthSession()) return null;
    const supabase = await getSupabase();
    const { data } = await supabase.auth.getSession();
    return data?.session ?? null;
  },

  async onAuthStateChange(callback) {
    if (!isSupabaseConfigured) return NO_SUBSCRIPTION;
    // Without a stored session (or an inbound callback) there is nothing to
    // observe, so the SDK is not needed.
    if (!hasStoredAuthSession()) return NO_SUBSCRIPTION;
    const supabase = await getSupabase();
    return supabase.auth.onAuthStateChange((_event, session) => callback(session));
  },

  // ---- Session history sync ----------------------------------------------

  async pushSession(session, userId) {
    if (!isSupabaseConfigured || !userId) return;
    const supabase = await getSupabase();
    const { error } = await supabase
      .from('sessions')
      .upsert(toRow(session, userId), { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw error;
  },

  // Pull recent sessions for the signed-in user, in local history shape
  async pullSessions(days = PULL_WINDOW_DAYS) {
    if (!isSupabaseConfigured) return [];
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .gte('session_date', daysAgoDateStr(days))
      .order('started_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(fromRow);
  },
};

// Live Visitor Analytics Tracker Service
// Tracks real visits anonymously and provides admin analytics fetching for teamalumorg@gmail.com

import { parseDeviceName, formatAndroidModel } from './deviceResolver.js';

const VISITOR_ID_KEY = 'atlera_vid_v1';
const SESSION_ID_KEY = 'atlera_sid_v1';
const LOCAL_ANALYTICS_KEY = 'atlera_local_metrics_v1';

export const ADMIN_EMAIL = 'teamalumorg@gmail.com';

export function isAdminEmail(email) {
  return String(email || '').trim().toLowerCase() === ADMIN_EMAIL;
}

function getOrCreateVisitorId() {
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return `v_anon_${Math.random().toString(36).slice(2, 8)}`;
  }
}

function getOrCreateSessionId() {
  try {
    let sid = sessionStorage.getItem(SESSION_ID_KEY);
    if (!sid) {
      sid = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      sessionStorage.setItem(SESSION_ID_KEY, sid);
    }
    return sid;
  } catch {
    return `s_anon_${Math.random().toString(36).slice(2, 7)}`;
  }
}

export function detectDevice() {
  if (typeof window === 'undefined') return 'Desktop';
  const ua = navigator.userAgent || '';
  if (/iPad|Tablet|PlayBook/i.test(ua)) return 'Tablet';
  if (/Mobi|Android|iPhone|iPod/i.test(ua) || window.innerWidth < 640) return 'Mobile';
  return 'Desktop';
}

export async function detectDeviceName() {
  if (typeof window === 'undefined') return 'Desktop';

  // 1. Check for Modern User-Agent Client Hints (Android Chrome, Edge, etc.)
  if (typeof navigator !== 'undefined' && navigator.userAgentData && typeof navigator.userAgentData.getHighEntropyValues === 'function') {
    try {
      const hints = await navigator.userAgentData.getHighEntropyValues(['model']);
      if (hints?.model && typeof hints.model === 'string' && hints.model.trim()) {
        const cleaned = formatAndroidModel(hints.model);
        if (cleaned && cleaned !== 'K' && cleaned !== 'Mobile') {
          return cleaned;
        }
      }
    } catch {
      // Fallback to UA string parser
    }
  }

  // 2. Parse User-Agent with screen dimensions and devicePixelRatio
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const screenW = typeof window !== 'undefined' && window.screen ? window.screen.width || 0 : 0;
  const screenH = typeof window !== 'undefined' && window.screen ? window.screen.height || 0 : 0;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  return parseDeviceName(ua, '', screenW, screenH, dpr);
}

export function detectBrowser() {
  if (typeof window === 'undefined') return 'Chrome';
  const ua = navigator.userAgent;
  if (/Edg/i.test(ua)) return 'Edge';
  if (/Chrome/i.test(ua) && !/Chromium|OPR|Edg/i.test(ua)) return 'Chrome';
  if (/Safari/i.test(ua) && !/Chrome|Chromium|OPR|Edg/i.test(ua)) return 'Safari';
  if (/Firefox/i.test(ua)) return 'Firefox';
  if (/OPR|Opera/i.test(ua)) return 'Opera';
  return 'Other';
}

export function detectOS() {
  if (typeof window === 'undefined') return 'Windows';
  const ua = navigator.userAgent;
  if (/Win/i.test(ua)) return 'Windows';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Mac/i.test(ua)) return 'macOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Other';
}

export const analyticsService = {
  // Record a real live visit
  async recordVisit(path = '/') {
    if (typeof window === 'undefined') return;

    let deviceName = 'Desktop';
    try {
      deviceName = await detectDeviceName();
    } catch {
      deviceName = detectDevice();
    }

    const payload = {
      visitorId: getOrCreateVisitorId(),
      sessionId: getOrCreateSessionId(),
      path: path || window.location.pathname || '/',
      device: detectDevice(),
      deviceName,
      browser: detectBrowser(),
      os: detectOS(),
      screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
      screenW: window.screen?.width || 0,
      screenH: window.screen?.height || 0,
      dpr: window.devicePixelRatio || 1,
      referrer: document.referrer || '',
      timestamp: new Date().toISOString(),
    };

    // 1. Send live beacon to serverless API
    try {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {
        // Silently handled
      });
    } catch {
      // Ignore background analytics fetch failures
    }

    // 2. Local fallback sync for redundancy
    try {
      const today = new Date().toISOString().slice(0, 10);
      const raw = localStorage.getItem(LOCAL_ANALYTICS_KEY);
      const store = raw ? JSON.parse(raw) : { totalViews: 0, daily: {}, recent: [] };
      store.totalViews = (store.totalViews || 0) + 1;
      store.daily[today] = (store.daily[today] || 0) + 1;
      store.recent.unshift({
        id: payload.sessionId,
        timestamp: payload.timestamp,
        path: payload.path,
        device: payload.device,
        deviceName: payload.deviceName,
        browser: payload.browser,
        os: payload.os,
        referrer: payload.referrer || 'Direct',
      });
      if (store.recent.length > 50) store.recent = store.recent.slice(0, 50);
      localStorage.setItem(LOCAL_ANALYTICS_KEY, JSON.stringify(store));
    } catch {
      // Local storage full
    }
  },

  // Fetch live aggregated data (Protected by email)
  async fetchAnalytics(email) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (cleanEmail !== ADMIN_EMAIL) {
      throw new Error('Access denied. Only authorized admin email can view visitor analytics.');
    }

    const res = await fetch(`/api/analytics?email=${encodeURIComponent(cleanEmail)}`);
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json.message || 'Could not load analytics data.');
    }

    return json.data;
  },
};

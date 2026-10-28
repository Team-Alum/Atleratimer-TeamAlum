// Vercel Serverless Function — Live Visitor Analytics Tracker & Reporting
// Captures live visits and provides authenticated real analytics for teamalumorg@gmail.com

import fs from 'fs';
import path from 'path';
import { parseDeviceName } from '../src/services/deviceResolver.js';

const ADMIN_EMAIL = 'teamalumorg@gmail.com';
const TMP_FILE = path.join('/tmp', 'atlera_analytics_v1.json');

// In-memory cache for fast warm-lambda operations
let memoryStore = {
  totalViews: 0,
  uniqueVisitors: new Set(),
  dailyViews: {},
  devices: { desktop: 0, mobile: 0, tablet: 0 },
  deviceModels: {},
  browsers: {},
  operatingSystems: {},
  referrers: {},
  recentVisits: [],
};

// Try to load existing persisted state from disk
try {
  if (fs.existsSync(TMP_FILE)) {
    const raw = fs.readFileSync(TMP_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    memoryStore.totalViews = parsed.totalViews || 0;
    memoryStore.uniqueVisitors = new Set(parsed.uniqueVisitors || []);
    memoryStore.dailyViews = parsed.dailyViews || {};
    memoryStore.devices = parsed.devices || { desktop: 0, mobile: 0, tablet: 0 };
    memoryStore.deviceModels = parsed.deviceModels || {};
    memoryStore.browsers = parsed.browsers || {};
    memoryStore.operatingSystems = parsed.operatingSystems || {};
    memoryStore.referrers = parsed.referrers || {};
    memoryStore.recentVisits = parsed.recentVisits || [];
  }
} catch {
  // Use in-memory fallback
}

function persistToDisk() {
  try {
    const payload = {
      ...memoryStore,
      uniqueVisitors: Array.from(memoryStore.uniqueVisitors),
    };
    fs.writeFileSync(TMP_FILE, JSON.stringify(payload), 'utf8');
  } catch {
    // Disk write might not be supported in some environments
  }
}

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

function getClientIp(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.headers?.['x-real-ip'] || req.socket?.remoteAddress || '127.0.0.1';
}

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. POST: Track live visit event
  if (req.method === 'POST') {
    const body = await parseBody(req);
    const ip = getClientIp(req);
    const today = getTodayString();
    const ua = req.headers?.['user-agent'] || '';

    const visitorId = String(body.visitorId || ip || 'unknown').slice(0, 80);
    const device = String(body.device || 'desktop').toLowerCase();
    const rawDeviceName = body.deviceName || parseDeviceName(ua, body.clientModel, body.screenW, body.screenH, body.dpr);
    const deviceName = String(rawDeviceName || (device.includes('mobile') ? 'Mobile' : 'Desktop')).slice(0, 60);

    const browser = String(body.browser || 'Chrome').slice(0, 40);
    const os = String(body.os || 'Windows').slice(0, 40);
    const pagePath = String(body.path || '/').slice(0, 80);
    const rawRef = String(body.referrer || '').trim();
    let referrer = 'Direct';

    if (rawRef) {
      try {
        const u = new URL(rawRef.startsWith('http') ? rawRef : `https://${rawRef}`);
        referrer = u.hostname.replace(/^www\./, '');
      } catch {
        referrer = rawRef.slice(0, 60);
      }
    }

    const city = req.headers?.['x-vercel-ip-city'] ? decodeURIComponent(String(req.headers['x-vercel-ip-city'])) : null;
    const country = req.headers?.['x-vercel-ip-country'] ? String(req.headers['x-vercel-ip-country']) : null;

    // Update Aggregates
    memoryStore.totalViews += 1;
    memoryStore.uniqueVisitors.add(visitorId);
    memoryStore.dailyViews[today] = (memoryStore.dailyViews[today] || 0) + 1;

    // Devices & Models
    if (device.includes('mobile')) memoryStore.devices.mobile = (memoryStore.devices.mobile || 0) + 1;
    else if (device.includes('tablet')) memoryStore.devices.tablet = (memoryStore.devices.tablet || 0) + 1;
    else memoryStore.devices.desktop = (memoryStore.devices.desktop || 0) + 1;

    if (!memoryStore.deviceModels) memoryStore.deviceModels = {};
    memoryStore.deviceModels[deviceName] = (memoryStore.deviceModels[deviceName] || 0) + 1;

    // Browsers
    memoryStore.browsers[browser] = (memoryStore.browsers[browser] || 0) + 1;

    // OS
    memoryStore.operatingSystems[os] = (memoryStore.operatingSystems[os] || 0) + 1;

    // Referrers
    memoryStore.referrers[referrer] = (memoryStore.referrers[referrer] || 0) + 1;

    // Recent Visit Log entry
    const visitEntry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      path: pagePath,
      device: device.includes('mobile') ? 'Mobile' : device.includes('tablet') ? 'Tablet' : 'Desktop',
      deviceName,
      browser,
      os,
      referrer,
      location: city && country ? `${city}, ${country}` : country || 'Online',
    };

    memoryStore.recentVisits.unshift(visitEntry);
    if (memoryStore.recentVisits.length > 100) {
      memoryStore.recentVisits = memoryStore.recentVisits.slice(0, 100);
    }

    persistToDisk();

    return res.status(200).json({ ok: true, views: memoryStore.totalViews, deviceName });
  }

  // 2. GET: Retrieve Live Analytics (Admin email restricted)
  if (req.method === 'GET') {
    const email = String(req.query?.email || '').trim().toLowerCase();

    // STRICT ADMIN EMAIL AUTH CHECK
    if (email !== ADMIN_EMAIL) {
      return res.status(403).json({
        ok: false,
        success: false,
        error: 'unauthorized',
        message: 'Admin access restricted. Enter the authorized email address in settings.',
      });
    }

    const today = getTodayString();

    const data = {
      totalViews: memoryStore.totalViews,
      uniqueVisitorsCount: memoryStore.uniqueVisitors.size,
      todayViews: memoryStore.dailyViews[today] || 0,
      dailyViews: memoryStore.dailyViews,
      devices: memoryStore.devices,
      deviceModels: memoryStore.deviceModels || {},
      browsers: memoryStore.browsers,
      operatingSystems: memoryStore.operatingSystems,
      referrers: memoryStore.referrers,
      recentVisits: memoryStore.recentVisits,
      lastUpdated: new Date().toISOString(),
      serverStatus: 'live',
    };

    return res.status(200).json({
      ok: true,
      success: true,
      data,
    });
  }

  return res.status(405).json({ error: 'method_not_allowed' });
}

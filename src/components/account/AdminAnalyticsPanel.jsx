// Live Visitor Analytics Dashboard — Admin Panel for teamalumorg@gmail.com
// Displays real live visitor statistics, devices, browsers, and recent activity stream.

import React, { useState, useEffect, useCallback } from 'react';
import { analyticsService, ADMIN_EMAIL } from '../../services/analyticsService';
import {
  Users, Eye, Calendar, Smartphone, Monitor, Tablet, Globe,
  RefreshCw, Radio, CheckCircle2, AlertTriangle
} from 'lucide-react';
import './admin-analytics.css';

function formatRelativeTime(isoString) {
  if (!isoString) return 'Just now';
  try {
    const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diffSec < 15) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'Recently';
  }
}

export default function AdminAnalyticsPanel({ email, onSignOut }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Initial fetch on mount / email change
  useEffect(() => {
    let active = true;
    analyticsService.fetchAnalytics(email)
      .then((result) => {
        if (active) {
          setData(result);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Could not load visitor analytics.');
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, [email]);

  const handleManualRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await analyticsService.fetchAnalytics(email);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.message || 'Could not refresh visitor analytics.');
    } finally {
      setRefreshing(false);
    }
  }, [email]);

  // Auto-refresh interval (10 seconds)
  useEffect(() => {
    if (!autoRefresh) return undefined;
    const interval = setInterval(() => {
      handleManualRefresh();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, handleManualRefresh]);

  if (loading && !data) {
    return (
      <div className="view-card atlera-analytics-loading-card">
        <RefreshCw size={24} className="spin" style={{ color: 'var(--atlera-accent-teal)' }} />
        <p>Loading live production visitor metrics…</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="view-card atlera-analytics-error-card" role="alert">
        <AlertTriangle size={24} style={{ color: '#f87171' }} />
        <h3>Failed to load analytics</h3>
        <p>{error}</p>
        <button type="button" className="btn-secondary" onClick={handleManualRefresh}>
          Retry
        </button>
      </div>
    );
  }

  const {
    totalViews = 0,
    uniqueVisitorsCount = 0,
    todayViews = 0,
    dailyViews = {},
    devices = { desktop: 0, mobile: 0, tablet: 0 },
    deviceModels = {},
    browsers = {},
    operatingSystems = {},
    referrers = {},
    recentVisits = [],
    lastUpdated,
  } = data || {};

  // Compute device percentages
  const totalDeviceHits = (devices.desktop || 0) + (devices.mobile || 0) + (devices.tablet || 0) || 1;
  const desktopPct = Math.round(((devices.desktop || 0) / totalDeviceHits) * 100);
  const mobilePct = Math.round(((devices.mobile || 0) / totalDeviceHits) * 100);
  const tabletPct = Math.round(((devices.tablet || 0) / totalDeviceHits) * 100);

  // Daily views last 7 days chart array
  const dailyEntries = Object.entries(dailyViews).slice(-7);
  const maxDayViews = Math.max(...dailyEntries.map(([, v]) => v), 1);

  return (
    <div className="atlera-analytics-container" aria-label="Visitor Analytics">
      {/* Analytics Header */}
      <div className="atlera-analytics-header">
        <div className="atlera-analytics-brand">
          <div className="atlera-live-badge">
            <span className="atlera-live-dot" />
            <Radio size={12} className="atlera-live-icon" />
            <span>LIVE PRODUCTION VISITOR STREAM</span>
          </div>
          <h2 className="atlera-analytics-title">Visitor Analytics & Audience Insights</h2>
          <p className="atlera-analytics-subtitle">
            Connected as <strong>{ADMIN_EMAIL}</strong> · Updated {formatRelativeTime(lastUpdated)}
          </p>
        </div>

        <div className="atlera-analytics-controls">
          {/* Auto Refresh Toggle */}
          <button
            type="button"
            className={`atlera-auto-toggle ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh((v) => !v)}
            title={`Live polling: ${autoRefresh ? 'ON' : 'OFF'}`}
          >
            <span>Live Stream</span>
            <span className="atlera-toggle-pill">{autoRefresh ? 'ON' : 'OFF'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            type="button"
            className="btn-secondary atlera-refresh-btn"
            onClick={handleManualRefresh}
            disabled={refreshing}
            title="Refresh analytics data"
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          {/* Sign Out / Exit */}
          {onSignOut && (
            <button
              type="button"
              className="btn-secondary atlera-exit-btn"
              onClick={onSignOut}
              title="Close analytics session"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Primary KPI Summary Cards */}
      <div className="atlera-kpi-grid">
        {/* Total Page Views */}
        <div className="atlera-kpi-card">
          <div className="atlera-kpi-top">
            <span className="atlera-kpi-label">TOTAL VISITS</span>
            <span className="atlera-kpi-icon"><Eye size={16} /></span>
          </div>
          <div className="atlera-kpi-value">{totalViews.toLocaleString()}</div>
          <div className="atlera-kpi-foot">
            <span className="atlera-kpi-badge">+{todayViews} today</span>
            <span>Recorded page views</span>
          </div>
        </div>

        {/* Unique Visitors */}
        <div className="atlera-kpi-card">
          <div className="atlera-kpi-top">
            <span className="atlera-kpi-label">UNIQUE VISITORS</span>
            <span className="atlera-kpi-icon"><Users size={16} /></span>
          </div>
          <div className="atlera-kpi-value">{uniqueVisitorsCount.toLocaleString()}</div>
          <div className="atlera-kpi-foot">
            <span className="atlera-kpi-badge teal">Distinct devices</span>
            <span>Unique client IDs</span>
          </div>
        </div>

        {/* Today's Views */}
        <div className="atlera-kpi-card">
          <div className="atlera-kpi-top">
            <span className="atlera-kpi-label">TODAY'S VISITS</span>
            <span className="atlera-kpi-icon"><Calendar size={16} /></span>
          </div>
          <div className="atlera-kpi-value">{todayViews.toLocaleString()}</div>
          <div className="atlera-kpi-foot">
            <span className="atlera-kpi-badge indigo">Live 24h</span>
            <span>Active study sessions</span>
          </div>
        </div>

        {/* Platform Ratio */}
        <div className="atlera-kpi-card">
          <div className="atlera-kpi-top">
            <span className="atlera-kpi-label">PRIMARY PLATFORM</span>
            <span className="atlera-kpi-icon"><Monitor size={16} /></span>
          </div>
          <div className="atlera-kpi-value">
            {desktopPct >= mobilePct ? `${desktopPct}% Desktop` : `${mobilePct}% Mobile`}
          </div>
          <div className="atlera-kpi-foot">
            <span>{mobilePct}% Mobile · {tabletPct}% Tablet</span>
          </div>
        </div>
      </div>

      {/* Traffic Over Time & Device Breakdown Row */}
      <div className="atlera-analytics-row">
        {/* Daily Visits Chart */}
        <div className="view-card atlera-chart-card">
          <div className="atlera-card-head">
            <h3>Visits Over Time (Recent Days)</h3>
            <span className="atlera-head-badge">Daily Volume</span>
          </div>

          {dailyEntries.length === 0 ? (
            <p className="atlera-empty-chart">Traffic recorded today will begin populating the daily graph.</p>
          ) : (
            <div className="atlera-bar-chart">
              {dailyEntries.map(([dateStr, count]) => {
                const heightPct = Math.max(12, Math.round((count / maxDayViews) * 100));
                const formattedDate = dateStr.slice(5); // e.g. "10-28"

                return (
                  <div key={dateStr} className="atlera-chart-col">
                    <div className="atlera-col-value">{count}</div>
                    <div className="atlera-col-track">
                      <div
                        className="atlera-col-bar"
                        style={{ height: `${heightPct}%` }}
                        title={`${dateStr}: ${count} visits`}
                      />
                    </div>
                    <div className="atlera-col-label">{formattedDate}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Device & Platform Breakdown */}
        <div className="view-card atlera-device-card">
          <div className="atlera-card-head">
            <h3>Device & Hardware</h3>
            <span className="atlera-head-badge">Client User-Agents</span>
          </div>

          <div className="atlera-device-bars">
            <div className="atlera-device-row">
              <div className="atlera-device-name">
                <Monitor size={15} />
                <span>Desktop</span>
              </div>
              <div className="atlera-prog-track">
                <div className="atlera-prog-fill teal" style={{ width: `${desktopPct}%` }} />
              </div>
              <div className="atlera-device-num">{devices.desktop || 0} ({desktopPct}%)</div>
            </div>

            <div className="atlera-device-row">
              <div className="atlera-device-name">
                <Smartphone size={15} />
                <span>Mobile</span>
              </div>
              <div className="atlera-prog-track">
                <div className="atlera-prog-fill indigo" style={{ width: `${mobilePct}%` }} />
              </div>
              <div className="atlera-device-num">{devices.mobile || 0} ({mobilePct}%)</div>
            </div>

            <div className="atlera-device-row">
              <div className="atlera-device-name">
                <Tablet size={15} />
                <span>Tablet</span>
              </div>
              <div className="atlera-prog-track">
                <div className="atlera-prog-fill lavender" style={{ width: `${tabletPct}%` }} />
              </div>
              <div className="atlera-device-num">{devices.tablet || 0} ({tabletPct}%)</div>
            </div>
          </div>

          {/* Operating Systems Pills */}
          <div className="atlera-pill-group">
            <span className="atlera-pill-label">Operating Systems:</span>
            {Object.entries(operatingSystems).length === 0 ? (
              <span className="atlera-empty-inline">Detecting…</span>
            ) : (
              Object.entries(operatingSystems).map(([osName, osCount]) => (
                <span key={osName} className="atlera-stat-pill">
                  {osName}: <strong>{osCount}</strong>
                </span>
              ))
            )}
          </div>

          {/* Specific Device & Mobile Models */}
          {Object.keys(deviceModels).length > 0 && (
            <div className="atlera-pill-group" style={{ marginTop: 10 }}>
              <span className="atlera-pill-label">Device Models:</span>
              {Object.entries(deviceModels).map(([modelName, modelCount]) => (
                <span key={modelName} className="atlera-model-pill">
                  <Smartphone size={11} />
                  <span>{modelName}</span>
                  <strong>{modelCount}</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Browsers & Referrers Row */}
      <div className="atlera-analytics-row">
        {/* Top Browsers */}
        <div className="view-card">
          <div className="atlera-card-head">
            <h3>Browsers</h3>
            <span className="atlera-head-badge">Engines</span>
          </div>
          <div className="atlera-list-wrap">
            {Object.entries(browsers).length === 0 ? (
              <p className="atlera-empty-text">No browser records captured yet.</p>
            ) : (
              Object.entries(browsers).map(([bName, bCount]) => (
                <div key={bName} className="atlera-list-item">
                  <div className="atlera-list-item-title">{bName}</div>
                  <div className="atlera-list-item-count">{bCount} visit{bCount !== 1 ? 's' : ''}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Traffic Sources / Referrers */}
        <div className="view-card">
          <div className="atlera-card-head">
            <h3>Traffic Sources</h3>
            <span className="atlera-head-badge">Inbound Referrers</span>
          </div>
          <div className="atlera-list-wrap">
            {Object.entries(referrers).length === 0 ? (
              <p className="atlera-empty-text">Direct visits and external search referrals will show here.</p>
            ) : (
              Object.entries(referrers).map(([rSource, rCount]) => (
                <div key={rSource} className="atlera-list-item">
                  <div className="atlera-list-item-title">
                    <Globe size={13} style={{ marginRight: 6, verticalAlign: '-1px' }} />
                    {rSource}
                  </div>
                  <div className="atlera-list-item-count">{rCount} hit{rCount !== 1 ? 's' : ''}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Real-time Recent Visits Feed */}
      <div className="view-card atlera-stream-card">
        <div className="atlera-card-head">
          <div>
            <h3>Live Visitor Activity Stream</h3>
            <p className="atlera-card-desc" style={{ margin: '2px 0 0 0' }}>
              Real-time stream of visitors reaching Atlera Focus Timer
            </p>
          </div>
          <span className="atlera-head-badge teal">
            {recentVisits.length} Real Visits Recorded
          </span>
        </div>

        {recentVisits.length === 0 ? (
          <p className="atlera-empty-text">Awaiting first live visitor beacon…</p>
        ) : (
          <div className="atlera-stream-table-wrap">
            <table className="atlera-stream-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Device Name</th>
                  <th>Browser</th>
                  <th>View / Path</th>
                  <th>Referrer</th>
                  <th style={{ textAlign: 'right' }}>Location / Status</th>
                </tr>
              </thead>
              <tbody>
                {recentVisits.map((v) => (
                  <tr key={v.id}>
                    <td className="atlera-stream-time">
                      <span className="atlera-stream-pulse" />
                      {formatRelativeTime(v.timestamp)}
                    </td>
                    <td>
                      <span className="atlera-device-name-tag">
                        {v.device === 'Mobile' ? (
                          <Smartphone size={13} style={{ color: 'var(--atlera-accent-teal, #2dd4bf)', flexShrink: 0 }} />
                        ) : v.device === 'Tablet' ? (
                          <Tablet size={13} style={{ color: 'var(--atlera-accent-lavender, #a78bfa)', flexShrink: 0 }} />
                        ) : (
                          <Monitor size={13} style={{ color: 'var(--atlera-accent-indigo, #818cf8)', flexShrink: 0 }} />
                        )}
                        <span className="atlera-device-name-val">{v.deviceName || v.device}</span>
                      </span>
                    </td>
                    <td>{v.browser}</td>
                    <td className="atlera-stream-path">
                      <code>{v.path}</code>
                    </td>
                    <td className="atlera-stream-ref">{v.referrer}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="atlera-location-badge">
                        <CheckCircle2 size={11} /> {v.location || 'Online'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

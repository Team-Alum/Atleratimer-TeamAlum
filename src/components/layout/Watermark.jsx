import React from 'react';

const YEAR = new Date().getFullYear();

// Single source of truth for the product copyright notice
export default function Watermark() {
  return (
    <div className="app-watermark" role="contentinfo" aria-label="Copyright notice">
      <span>© {YEAR}</span>
      <span className="watermark-brand">Atlera</span>
      <span>by Team Alum</span>
      <span className="watermark-sep" aria-hidden="true">·</span>
      <span>
        Founders: <span className="watermark-founders">Sudarshan</span> &amp;{' '}
        <span className="watermark-founders">Soham</span>
      </span>
      <span className="watermark-sep" aria-hidden="true">·</span>
      <span>All Rights Reserved</span>
    </div>
  );
}

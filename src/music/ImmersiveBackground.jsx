import React from 'react';
import { useImmersiveMedia } from './useImmersiveMedia';

/**
 * Windowed dashboard background layer: renders strictly behind the app-container.
 * Never uses createPortal to document.body, ensuring the timer UI is never covered.
 */
export default function ImmersiveBackground() {
  const { isImmersive, isVideoPlayable, resolvedThumb } = useImmersiveMedia();

  // If immersive mode is off or video is playing (handled by yt-host-wrap), do not render thumb layer
  if (!isImmersive || isVideoPlayable || !resolvedThumb) {
    return null;
  }

  return (
    <div
      className="atlera-ambient-immersive"
      aria-hidden="true"
      role="presentation"
    >
      <img
        src={resolvedThumb}
        alt=""
        className="atlera-ambient-immersive-thumb"
      />
      <div className="atlera-ambient-immersive-scrim" />
    </div>
  );
}

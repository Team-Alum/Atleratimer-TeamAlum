import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTimerState } from '../context/useTimer';
import { useMusicPlayback } from './MusicPlayerContextInstance';
import { Music } from 'lucide-react';

/**
 * Builds candidate thumbnail URLs in descending resolution order.
 * Handles custom thumbnails, maxres, hq, mq, and track-attached artwork.
 */
function getThumbnailCandidates(track) {
  if (!track) return [];
  const list = [];
  const videoId = track.videoId || track.id;

  if (track.thumbnail) list.push(track.thumbnail);
  if (track.thumbnailUrl && track.thumbnailUrl !== track.thumbnail) {
    list.push(track.thumbnailUrl);
  }
  if (videoId && typeof videoId === 'string' && videoId.length >= 8) {
    // High-resolution YouTube thumbnails
    list.push(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`);
    list.push(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);
    list.push(`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`);
  }
  if (track.albumArt) list.push(track.albumArt);

  return [...new Set(list.filter(Boolean))];
}

export default function ImmersiveBackground() {
  const { data, activeView } = useTimerState();
  const { track, status, unavailable } = useMusicPlayback();

  const isImmersivePref = Boolean(data?.musicSettings?.immersiveBackground);
  const isFocusView = activeView === 'focus';
  const isImmersiveActive = isImmersivePref && isFocusView;

  const candidates = useMemo(() => getThumbnailCandidates(track), [track]);
  const [resolvedThumb, setResolvedThumb] = useState(null);

  // Fallback candidate preloader
  useEffect(() => {
    let isCurrent = true;
    if (!candidates.length) {
      const id = requestAnimationFrame(() => {
        if (isCurrent) setResolvedThumb(null);
      });
      return () => {
        isCurrent = false;
        cancelAnimationFrame(id);
      };
    }

    const tryCandidate = (index) => {
      if (index >= candidates.length) {
        if (isCurrent) setResolvedThumb(null);
        return;
      }

      const url = candidates[index];
      const img = new Image();

      img.onload = () => {
        if (!isCurrent) return;
        // YouTube returns a 120x90 placeholder when maxresdefault is missing
        if (img.naturalWidth <= 120 && img.naturalHeight <= 90 && url.includes('maxresdefault')) {
          tryCandidate(index + 1);
        } else {
          setResolvedThumb(url);
        }
      };

      img.onerror = () => {
        if (!isCurrent) return;
        tryCandidate(index + 1);
      };

      img.src = url;
    };

    tryCandidate(0);

    return () => {
      isCurrent = false;
    };
  }, [candidates]);

  // Determine video availability
  const isBlocked = Boolean(
    track?.embeddable === false || (track?.videoId && unavailable?.[track.videoId])
  );
  const isVideoPlaying = Boolean(
    track?.videoId &&
    !isBlocked &&
    status !== 'error' &&
    (status === 'playing' || status === 'buffering' || status === 'ready')
  );

  // Sync classes to document.body so modals and fullscreen components adapt
  useEffect(() => {
    const body = document.body;
    if (isImmersiveActive) {
      body.classList.add('atlera-immersive-active');
      if (isVideoPlaying) {
        body.classList.add('atlera-immersive-video');
      } else {
        body.classList.remove('atlera-immersive-video');
      }
    } else {
      body.classList.remove('atlera-immersive-active', 'atlera-immersive-video');
    }

    return () => {
      body.classList.remove('atlera-immersive-active', 'atlera-immersive-video');
    };
  }, [isImmersiveActive, isVideoPlaying]);

  if (!isImmersiveActive) {
    return null;
  }

  const hasTrack = Boolean(track && track.videoId);
  const showThumbnail = !isVideoPlaying && Boolean(resolvedThumb);
  const showPrompt = !hasTrack;

  return createPortal(
    <div
      className="atlera-immersive-container"
      aria-hidden="true"
      role="presentation"
    >
      {/* Layer 1: Base Dark Atmosphere Layer */}
      <div className="atlera-immersive-base" />

      {/* Layer 2: Thumbnail Image Fallback (active when video is unavailable or paused/buffering) */}
      {showThumbnail && (
        <img
          src={resolvedThumb}
          alt=""
          className="atlera-immersive-thumb"
        />
      )}

      {/* Layer 3: Dark Translucent Readability Scrim (65–75% opacity) */}
      <div className="atlera-immersive-scrim" />

      {/* Layer 4: Vignette / Atmospheric Depth Gradient */}
      <div className="atlera-immersive-vignette" />

      {/* Case E: No track selected prompt */}
      {showPrompt && (
        <div className="atlera-immersive-empty-prompt" aria-hidden="false">
          <div className="immersive-empty-pill">
            <Music size={13} className="immersive-empty-icon" />
            <span>Select focus music in the sidebar to activate video background</span>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

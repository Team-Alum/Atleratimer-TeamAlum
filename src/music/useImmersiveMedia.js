import { useEffect, useState, useMemo } from 'react';
import { useTimerState } from '../context/useTimer.js';
import { useMusicPlayback } from './MusicPlayerContextInstance.js';

/**
 * Builds candidate thumbnail URLs in descending resolution order.
 * Handles custom thumbnails, maxres, hq, mq, and track-attached artwork.
 */
export function getThumbnailCandidates(track) {
  if (!track) return [];
  const list = [];
  const videoId = track.videoId || track.id;

  if (track.thumbnail) list.push(track.thumbnail);
  if (track.thumbnailUrl && track.thumbnailUrl !== track.thumbnail) {
    list.push(track.thumbnailUrl);
  }
  if (videoId && typeof videoId === 'string' && videoId.length >= 8) {
    list.push(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`);
    list.push(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);
    list.push(`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`);
  }
  if (track.albumArt) list.push(track.albumArt);

  return [...new Set(list.filter(Boolean))];
}

/**
 * Shared hook to compute immersive media availability and preloaded thumbnail.
 */
export function useImmersiveMedia() {
  const { data, activeView } = useTimerState();
  const { track, status, unavailable } = useMusicPlayback();

  const isImmersivePref = Boolean(data?.musicSettings?.immersiveBackground);
  const isFocusView = activeView === 'focus';
  const isImmersive = isImmersivePref && isFocusView;

  const candidates = useMemo(() => getThumbnailCandidates(track), [track]);
  const [resolvedThumb, setResolvedThumb] = useState(null);

  // Preload thumbnail candidates
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

  // Video playability status
  const isBlocked = Boolean(
    track?.embeddable === false || (track?.videoId && unavailable?.[track.videoId])
  );
  const isVideoPlayable = Boolean(
    isImmersive &&
    track?.videoId &&
    !isBlocked &&
    status !== 'error' &&
    (status === 'playing' || status === 'buffering' || status === 'ready')
  );

  // Sync classes to <html> & <body>
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (isImmersive) {
      root.classList.add('atlera-immersive-active');
      body.classList.add('atlera-immersive-active');
      if (isVideoPlayable) {
        root.classList.add('atlera-immersive-video');
        body.classList.add('atlera-immersive-video');
      } else {
        root.classList.remove('atlera-immersive-video');
        body.classList.remove('atlera-immersive-video');
      }
    } else {
      root.classList.remove('atlera-immersive-active', 'atlera-immersive-video');
      body.classList.remove('atlera-immersive-active', 'atlera-immersive-video');
    }

    return () => {
      root.classList.remove('atlera-immersive-active', 'atlera-immersive-video');
      body.classList.remove('atlera-immersive-active', 'atlera-immersive-video');
    };
  }, [isImmersive, isVideoPlayable]);

  return {
    isImmersive,
    isVideoPlayable,
    resolvedThumb: !isVideoPlayable ? resolvedThumb : null,
    hasTrack: Boolean(track?.videoId),
  };
}

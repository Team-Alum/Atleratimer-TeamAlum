// Loads the official YouTube IFrame Player API exactly once.
// Playback via the IFrame API does not require an API key.

let apiPromise = null;

export function loadYouTubeApi() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('The YouTube player needs a browser environment.'));
  }
  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === 'function') previous();
      resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => reject(new Error('Could not load the YouTube player — check the network connection.'));
    document.head.appendChild(script);
    setTimeout(() => {
      if (!window.YT || !window.YT.Player) {
        reject(new Error('The YouTube player took too long to load.'));
      }
    }, 15000);
  });
  return apiPromise;
}

export const YT_ERROR_MESSAGES = {
  2: 'This track’s video ID is invalid.',
  5: 'The HTML5 player couldn’t play this track.',
  100: 'This track was removed or is private.',
  101: 'The owner has disabled embedded playback for this track.',
  150: 'The owner has disabled embedded playback for this track.',
};

export function describeYtError(code) {
  return YT_ERROR_MESSAGES[code] || 'This track can’t be played here. Try another one.';
}

export function isoToSeconds(iso) {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || '');
  if (!m) return null;
  return (Number(m[1] || 0) * 3600) + (Number(m[2] || 0) * 60) + Number(m[3] || 0);
}

export function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

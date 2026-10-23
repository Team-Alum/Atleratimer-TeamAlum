# Ambient scene media

The ambient layer has a working video integration point, but **no footage is
bundled in this repository**. Until licensed clips are added here, every scene
uses its designed tonal fallback (a soft, static gradient mesh). The fallback is
intentionally labelled as a fallback in the UI and must never be presented as
real footage.

## Expected files

Add the files below to this directory. `AmbientBackground` probes each file with
a `HEAD` request and only mounts a `<video>` when the response is a real video,
so partial installs are safe.

| Scene       | Desktop clip              | Mobile clip                     | Poster                     |
| ----------- | ------------------------- | ------------------------------- | -------------------------- |
| Rainy city  | `rainy-city.mp4`          | `rainy-city-mobile.mp4`         | `rainy-city.jpg`           |
| Night drive | `night-drive.mp4`         | `night-drive-mobile.mp4`        | `night-drive.jpg`          |
| Starry sky  | `starry-sky.mp4`          | `starry-sky-mobile.mp4`         | `starry-sky.jpg`           |
| Cozy study  | `cozy-study.mp4`          | `cozy-study-mobile.mp4`         | `cozy-study.jpg`           |
| Forest rain | `forest-rain.mp4`         | `forest-rain-mobile.mp4`        | `forest-rain.jpg`          |
| Ocean       | `ocean.mp4`               | `ocean-mobile.mp4`              | `ocean.jpg`                |

The mobile file is optional. On screens ≤ 768 px the app requests the
`-mobile.mp4` variant and **does not fall back to the desktop file**, which is
how unnecessary high-resolution downloads on phones are avoided. If the mobile
variant is absent, that breakpoint shows the tonal fallback.

## Recommended encoding

- Container: MP4 (H.264 + AAC is fine, but the video is muted).
- Desktop: 1920×1080, 24–30 fps, 8–20 second seamless loop, no cuts or text.
- Desktop size: aim for 3–6 MB. Use two-pass CRF 24–28.
- Mobile: 1280×720 (or 960×540), same loop, aim for under 2.5 MB.
- No audio track is required. The element is always `muted`, `loop`,
  `playsInline` and decorative (`aria-hidden`).
- Avoid strobing, lightning flashes, fast camera moves, or clips that read as a
  UI screenshot. The scene must stay quiet behind text.
- Posters: JPG, same aspect ratio (16:9), quality ~80, ideally under 300 KB.
- Scene grading: the app applies a readability scrim and theme-specific filter.
  Slightly darker, low-contrast footage works best.

## Licensing

Only commit footage that you have the right to publish and redistribute as part
of this application. Record the source, creator, licence and retrieval date in
`ATTRIBUTION.md` next to this README. Verify that the licence covers public,
commercial deployment and does not require attribution inside the UI unless you
add it.

Suggested starting points (check each clip's current licence before use):

- Pexels — https://www.pexels.com/videos/
- Coverr — https://coverr.co/
- Pixabay — https://pixabay.com/videos/

Do not download footage from YouTube, social media, or stock sites whose terms
forbid redistribution of the raw file.

## Behaviour

- Only the selected scene is requested.
- Missing files never produce a broken `<img>` or a layout shift.
- `prefers-reduced-motion`, the app's Reduced Motion setting, or turning off
  **Scene motion** all show the static scene instead of the video.
- Scene selection and motion preference persist in the app's normal preferences
  (`atleratimer_v1_data`).

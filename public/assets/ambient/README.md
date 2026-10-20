# Ambient background videos — asset sources & licensing

These looping videos power the focus-mode ambient backgrounds
(`src/ambient/AmbientStage.jsx`). The `.jpg` files are first-frame
thumbnails used as posters while a video loads, and as tile previews in the
header's Ambient picker (`src/ambient/AmbientMenu.jsx`).

## Source

All videos are free stock footage from [Mixkit](https://mixkit.co), downloaded
in their 720p renditions. Poster images are Mixkit's generated first-frame
thumbnails (`{id}-thumb-360-0.jpg`).

| File | Mixkit item | Title | Size (720p) |
| --- | --- | --- | --- |
| `rainy-city.mp4` | [#4332](https://mixkit.co/free-stock-video/times-square-during-a-rainy-night-4332/) | Times Square during a rainy night | ~7.0 MB |
| `night-drive.mp4` | [#50988](https://mixkit.co/free-stock-video/timelapse-of-a-drive-through-the-city-night-from-the-50988/) | Timelapse of a drive through the city at night | ~8.3 MB |
| `starry-sky.mp4` | [#39768](https://mixkit.co/free-stock-video/night-sky-covered-with-stars-39768/) | Night sky covered with stars | ~3.5 MB |
| `cozy-room.mp4` | [#1242](https://mixkit.co/free-stock-video/wood-burning-in-a-fireplace-1242/) | Wood burning in a fireplace | ~2.9 MB |
| `forest-rain.mp4` | [#15398](https://mixkit.co/free-stock-video/mist-and-rain-over-a-forest-15398/) | Mist and rain over a forest | ~3.7 MB |
| `minimal.mp4` | [#50944](https://mixkit.co/free-stock-video/a-thick-mist-abundantly-flows-from-top-to-bottom-50944/) | Thick mist flowing over a dark surface | ~3.0 MB |

## License

Licensed under the [Mixkit Free License](https://mixkit.co/license/#videoFree):

- Free for commercial and non-monetary projects.
- No attribution required (this README is kept for provenance anyway).
- The clips may not be redistributed or resold as standalone stock footage;
  they are bundled here solely as part of the Atlera application.

Nothing here was scraped from YouTube or other streaming platforms; no audio
was extracted from any video. Videos are served from this app's own static
assets, loaded lazily one-at-a-time for the selected scene only, `muted`,
looped, and paused when the browser tab is hidden.

## Fallback behavior

If a video fails to load, the corresponding canvas/CSS scene in
`src/ambient/scenes/` renders instead (see `ForestRain.jsx` for the newest
one). Reduced-motion users (system preference or the in-app "Disable
animation" toggle) get the static scene/poster instead of video playback.

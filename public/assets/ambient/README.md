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
| `night-drive.mp4` | [#27717](https://mixkit.co/free-stock-video/taking-a-long-drive-at-night-27717/) | Taking a long drive at night (real-time) | ~5.6 MB |
| `starry-sky.mp4` | [#39768](https://mixkit.co/free-stock-video/night-sky-covered-with-stars-39768/) | Night sky covered with stars | ~3.5 MB |
| `cozy-room.mp4` | [#1242](https://mixkit.co/free-stock-video/wood-burning-in-a-fireplace-1242/) | Wood burning in a fireplace | ~2.9 MB |
| `forest-rain.mp4` | [#15398](https://mixkit.co/free-stock-video/mist-and-rain-over-a-forest-15398/) | Mist and rain over a forest | ~3.7 MB |
| `ocean-waves.mp4` | [#1925](https://mixkit.co/free-stock-video/waves-reaching-the-shore-1925/) | Waves reaching the shore | ~10.7 MB |
| `snowy-pines.mp4` | [#3311](https://mixkit.co/free-stock-video/pine-branches-in-winter-3311/) | Pine branches in winter | ~3.1 MB |
| `rainy-window.mp4` | [#21144](https://mixkit.co/free-stock-video/rain-hitting-a-window-21144/) | Rain hitting a window | ~5.4 MB |
| `aurora.mp4` | [#4037](https://mixkit.co/free-stock-video/northern-lights-in-the-night-sky-4037/) | Northern lights in the night sky | ~2.7 MB |
| `tranquil-forest.mp4` | [#50847](https://mixkit.co/free-stock-video/the-camera-slowly-slides-into-the-tranquil-forest-on-a-50847/) | Slow glide into a tranquil forest | ~8.0 MB |
| `forest-river.mp4` | [#8619](https://mixkit.co/free-stock-video/sunbeams-on-flowing-river-in-mossy-forest-8619/) | Sunbeams on a flowing river in a mossy forest | ~14.6 MB |
| `bamboo-grove.mp4` | [#20305](https://mixkit.co/free-stock-video/bamboo-in-the-sun-20305/) | Bamboo in the sun | ~5.3 MB |
| `rainy-leaves.mp4` | [#18309](https://mixkit.co/free-stock-video/rain-wetting-the-leaves-of-a-tree-in-the-garden-18309/) | Rain wetting the leaves of a tree | ~4.8 MB |
| `minimal.mp4` | [#50944](https://mixkit.co/free-stock-video/a-thick-mist-abundantly-flows-from-top-to-bottom-50944/) | Thick mist flowing over a dark surface | ~3.0 MB |

All clips are real-time (no timelapses or speed-ramped footage) and chosen
for slow, focus-friendly motion.

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

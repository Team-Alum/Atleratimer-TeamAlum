# Ambient background images — asset sources & licensing

These images are the ambient backdrops behind the focus dashboard
(`src/ambient/AmbientStage.jsx`). Each scene is a single static image, used as
the full-viewport background and as the tile preview in the header's Ambient
picker (`src/ambient/AmbientMenu.jsx`).

## Why still images

Earlier versions shipped a looping video per scene plus a canvas/CSS animation
fallback. That meant the app downloaded ~80 MB of video for a backdrop that
sat behind a timer, decoded it on every scene change, and burned CPU/GPU on a
full-viewport animation. The live background was removed in favour of these
static images: the whole set now weighs **0.5 MB** instead of ~81 MB, the
browser paints them once, and nothing animates.

If live video backgrounds are ever reintroduced, keep the `.mp4` files out of
the initial payload — lazy-load them only for the selected scene, `muted`,
looped, and paused when the tab is hidden.

## Source

The images are free stock footage thumbnails from [Mixkit](https://mixkit.co),
taken from the same clips that the previous video backgrounds used.

| File | Mixkit item | Title |
| --- | --- | --- |
| `rainy-city.jpg` | [#4332](https://mixkit.co/free-stock-video/times-square-during-a-rainy-night-4332/) | Times Square during a rainy night |
| `night-drive.jpg` | [#27717](https://mixkit.co/free-stock-video/taking-a-long-drive-at-night-27717/) | Taking a long drive at night |
| `starry-sky.jpg` | [#39768](https://mixkit.co/free-stock-video/night-sky-covered-with-stars-39768/) | Night sky covered with stars |
| `cozy-room.jpg` | [#1242](https://mixkit.co/free-stock-video/wood-burning-in-a-fireplace-1242/) | Wood burning in a fireplace |
| `forest-rain.jpg` | [#15398](https://mixkit.co/free-stock-video/mist-and-rain-over-a-forest-15398/) | Mist and rain over a forest |
| `ocean-waves.jpg` | [#1925](https://mixkit.co/free-stock-video/waves-reaching-the-shore-1925/) | Waves reaching the shore |
| `snowy-pines.jpg` | [#3311](https://mixkit.co/free-stock-video/pine-branches-in-winter-3311/) | Pine branches in winter |
| `rainy-window.jpg` | [#21144](https://mixkit.co/free-stock-video/rain-hitting-a-window-21144/) | Rain hitting a window |
| `aurora.jpg` | [#4037](https://mixkit.co/free-stock-video/northern-lights-in-the-night-sky-4037/) | Northern lights in the night sky |
| `tranquil-forest.jpg` | [#50847](https://mixkit.co/free-stock-video/the-camera-slowly-slides-into-the-tranquil-forest-on-a-50847/) | Slow glide into a tranquil forest |
| `forest-river.jpg` | [#8619](https://mixkit.co/free-stock-video/sunbeams-on-flowing-river-in-mossy-forest-8619/) | Sunbeams on a flowing river in a mossy forest |
| `bamboo-grove.jpg` | [#20305](https://mixkit.co/free-stock-video/bamboo-in-the-sun-20305/) | Bamboo in the sun |
| `rainy-leaves.jpg` | [#18309](https://mixkit.co/free-stock-video/rain-wetting-the-leaves-of-a-tree-in-the-garden-18309/) | Rain wetting the leaves of a tree |
| `minimal.jpg` | [#50944](https://mixkit.co/free-stock-video/a-thick-mist-abundantly-flows-from-top-to-bottom-50944/) | Thick mist flowing over a dark surface |

## License

Licensed under the [Mixkit Free License](https://mixkit.co/license/#videoFree):

- Free for commercial and non-monetary projects.
- No attribution required (this README is kept for provenance anyway).
- The images may not be redistributed or resold as standalone stock footage;
  they are bundled here solely as part of the Atlera application.

Nothing here was scraped from YouTube or other streaming platforms; no audio
was extracted from any video.

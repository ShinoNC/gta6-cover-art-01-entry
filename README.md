# Sunset Vice — Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/ShinoNC/gta6-cover-art-01-entry/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/ShinoNC/gta6-cover-art-01-entry/reward.svg)](https://make.fun/c/gta6-cover-art-01)

An offline web app that turns your photos into GTA-style multi-panel cover
art and exports it as a PNG. Built for the
[make.fun GTA 6 cover art bounty](https://make.fun/c/gta6-cover-art-01).

## What it makes

A movie-poster cover: a press-quote bar with five stars on top, a
multi-panel photo collage in the middle, a giant striped retro-chrome title
overlaid across the panels, a script tagline on its own dark pill, cast role
tags on every panel, a skyline silhouette, palm silhouettes, a retro sun, an
EST. badge, a VOL. tape label, and a billing strip at the bottom.

## Features

- **Four layouts** — 3×3 grid, Hero + 2 stacked, Big + 4 small, Diagonal
  slashes — each adapting to the export size.
- **Five colour grades** — Warm Sunset (default), Sunset Duotone, Neon
  Night, Vice Gold, Mono Noir — applied as per-pixel colour maps in code,
  no library.
- **Per-panel editing** — click a panel to select it, drag to reposition
  the photo, scroll or slide to zoom, assign any loaded photo to any panel,
  or fill every panel with one photo in one click.
- **Live lettering** — title, tagline, eyebrow, press quote and billing
  strip are all editable, with auto-fit so long titles never overflow.
- **One renderer** — the live preview and the exported PNG are the same
  `drawCover` call, so the export is exactly what the preview shows.
- **Three export sizes** — 1080×1080, 1080×1350, 1920×1080 — individually
  or all at once, plus a Surprise me button that randomises a whole cover.
- **Fully offline** — every script, image and font is a file under `app/`.
  Your photos are read on your machine and never uploaded.

## Run it

```sh
node serve.mjs
```

Then open http://localhost:8080 in desktop Chrome. No build step, no
dependencies.

## Screenshots

The four screenshots in `screenshots/` are reproducible from the app
itself: see `shots.json` for the `?shot=` URL and viewport of each.

## Fonts

Anton and Pacifico, both under the SIL Open Font License 1.1 (see
`app/fonts/OFL.txt`). The sample photos under `app/samples/` are free to
use. Nothing here copies Rockstar Games logos, artwork or fonts.

## License

MIT — see `LICENSE`.

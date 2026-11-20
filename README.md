# Sunset Vice — Cover Studio
[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/ShinoNC/gta6-cover-art-01-entry/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/ShinoNC/gta6-cover-art-01-entry/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn a photo into multi-panel sunset cover art, in the browser, fully
offline. Pick photos, a layout and a grade, edit the lettering live, and
export the cover as a PNG in three sizes. Entry for the make.fun
`gta6-cover-art-01` bounty.

## Run it

```sh
node serve.mjs 8000
```

Then open `http://127.0.0.1:8000/app/index.html`. No build step, no
dependencies, no network: every script, style, font and image the app
loads is a file under `app/`. Uploaded photos are read on your machine
and never leave it.

## What it does

- **One canvas renderer** (`app/src/render.js`) draws both the live
  preview and the exported PNG at full size, so the preview is the
  export.
- **4 layouts**: 3×3 Grid, Hero + 2, 1 big + 4, Diagonal. The layout
  adapts to the export size.
- **One grade for every panel**: Warm Sunset by default (natural colours
  with a golden wash), plus Golden Hour, Neon Night and Mono Noir.
- **Per-panel photo control**: click a panel to select it, drag to
  reposition its photo, scroll or use the slider to zoom, assign any
  loaded photo to any panel, or fill every panel with one photo.
  Six sample photos ship with the app; upload your own.
- **Lettering, editable live**: title, tagline, eyebrow (the tag strip),
  press quote and quote source, plus a cast tag per panel.
- **Canvas-drawn decorations**: retro sun icon, skyline silhouette,
  VOL. 01 tape label, EST. 2026 gold seal, 5 stars, barcode.
- **Export PNG** at 1080×1080, 1080×1350 and 1920×1080, one at a time
  or all three in one click. "Surprise me" randomizes a cover.

## Screenshots

The four screenshots in `screenshots/` are taken from the app itself
through `?shot=` query params (see `shots.json` and `app/src/shots.js`),
never composited or edited outside the app:

1. `1-cover.jpg` — PALM ROYALE, the landscape cover (1 big + 4)
2. `2-editor.jpg` — the editor with a cover loaded
3. `3-cover.jpg` — TIDEWATER, the portrait cover (3×3 grid)
4. `4-cover.jpg` — GOLDEN HOUR, the square cover (Diagonal)

## Build the dossier

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and
`screenshots/` to the output directory and writes `dossier.json` there
with the scorer's own `buildDossier` from `vendor/makefun-app.ts`.

## Originality

All lettering, decorations and layout are original work drawn in code.
The app ships no Rockstar Games logo, wordmark, artwork, character or
font. Fonts are Anton (display) and Pacifico (script), both under the
SIL Open Font License 1.1 (`app/fonts/OFL.txt`). The sample photos are
the kit's two free photos plus four made for this entry; none is a real
person's photo or GTA artwork.

## License

MIT — see `LICENSE`.

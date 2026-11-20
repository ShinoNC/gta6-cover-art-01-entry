# Sunset Vice — Cover Studio

An offline web app that turns a person's own photos and a caption into
GTA 6-style multi-panel cover art, exported as a PNG to share. Built for
the make.fun gta6-cover-art-01 bounty.

## What it does

- **Multi-panel covers** — four layouts (3 × 3 Grid, Hero + 2, 1 big + 4,
  Diagonal) around one bold caption, with a press quote bar, cast tags, a
  VOL. 01 tape label, an EST. 2026 seal, a skyline, a sunset tag band and a
  billing strip.
- **Any photo** — load photos from your machine (they never leave it),
  assign any photo to any panel, drag to reposition, scroll or slide to
  zoom, and fill every panel with one photo in one click. Six sample photos
  ship with the app.
- **Lettering** — striped retro-chrome title (Anton), script tagline
  (Pacifico) on its own dark pill, editable title, tagline, tag strip,
  press quote and quote source.
- **Grades** — Warm Sunset (the default), Neon Night, Vice Gold, Mono Noir
  and Natural, applied to every panel.
- **Fast export** — one click downloads the cover in all three post sizes:
  1080 × 1080, 1080 × 1350 and 1920 × 1080. The live preview and the export
  share one canvas renderer (`app/src/render.js`, `drawCover`), so the
  cover on screen is the cover you download.
- **Offline** — static files under `app/`, no build step, no network
  request. Every font and sample photo is a local file.

## Try it

```sh
node serve.mjs
```

Then open the printed address in desktop Chrome.

## Screenshots

`shots.json` lists the four screenshots under `screenshots/`, each taken
from the app itself through a `?shot=` scene (`cover1`, `editor`, `cover3`,
`cover4`): the Palm Royale landscape cover, the editor with a photo loaded,
the Tidewater portrait cover and the Golden Hour square cover. No
screenshot is edited or composited outside the app.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and
writes `dossier.json` with the kit's `buildDossier` library.

## Originality

Everything here is original: invented titles, sample photos made with an
image model, and two SIL Open Font License fonts (Anton and Pacifico, under
`app/fonts/` with their license text). No Rockstar Games logo, wordmark,
artwork, character or font is used anywhere.

## License

MIT — see `LICENSE`.

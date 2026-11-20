# Sunset Vice — Cover Studio

Turn a photo into a GTA 6-style multi-panel sunset cover, entirely offline.
Pick photos, a layout and a grade, edit the lettering, export a PNG.

## Run it

```
node serve.mjs
```

then open the printed address in desktop Chrome. No network requests are
made at runtime: fonts, sample photos and code are all files under `app/`,
and uploaded photos never leave the machine.

## What it makes

- 4 layouts: 3 × 3 Grid, Hero + 2, 1 big + 4, Diagonal
- 5 colour grades, Warm Sunset by default
- Per-panel photos: click a panel to select it, drag to move the photo,
  scroll to zoom, or pick a photo from the tray
- Lettering: title, tagline, tag strip, press quote and quote source
- Export PNG at 1080 × 1080, 1080 × 1350 and 1920 × 1080, all three
  with one click

## Screenshots

The four screenshots in `screenshots/` are taken from the app itself with
`?shot=` presets (see `shots.json`): three exported covers and the editor.

## Build

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

copies `app/` and `screenshots/` into `out/` and writes `out/dossier.json`.

## Fonts and photos

Anton and Pacifico are under `app/fonts/` under the SIL Open Font License
(see `app/fonts/OFL.txt`). The six sample photos are AI-made images shipped
with the entry; two of them come from the competition kit.

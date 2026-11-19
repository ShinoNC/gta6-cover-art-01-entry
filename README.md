# Sunset Vice — Cover Studio

A GTA 6-style cover art maker: an offline web app that turns a photo and a
caption into multi-panel Vice City sunset cover art, exported as PNG.

## What it does

- **One canvas renderer** for the live preview and the exported PNG — what
  you see is what you share.
- **4 layouts**: 3×3 grid, hero + 2 stacked, 1 big + 4 small, diagonal slashes.
- **7 grades per panel**: Original, Sunset, Neon Night, Ocean, Vice Gold,
  Halftone, Mono Noir (canvas pixel ops: duotone gradient maps, posterize,
  halftone dots).
- **Per-panel photo control**: click a panel to select it, drag to reposition,
  scroll to zoom, flip, assign any loaded photo to any panel, or fill every
  panel with one photo in one click.
- **Lettering**: Anton display face + Pacifico script (SIL OFL, shipped under
  `app/fonts/`), gradient title with dark outline, editable title / tagline /
  eyebrow, sunset or navy banner.
- **Decorations drawn on canvas**: retro sun, palm silhouettes, skyline,
  "EST. 2026" starburst badge, "COLLECTORS EDITION" tape, five stars.
- **Export**: 1080×1080, 1080×1350, 1920×1080 — one click each, or all three.
- **"Surprise me"** randomizes layout, grade and caption.
- 6 sample photos ship with the app (2 kit samples + 4 AI-made); your own
  photos are read on your machine and never uploaded.

## Run it

```sh
node serve.mjs
# open http://localhost:8080
```

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to `/output` and writes
`/output/dossier.json` with the vendored make.fun library.

## License

MIT. Fonts Anton and Pacifico are licensed under the SIL Open Font License
1.1 (see `app/fonts/OFL.txt`). No Rockstar Games logo, wordmark, artwork,
character or font is used anywhere in this app.

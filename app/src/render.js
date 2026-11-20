// Sunset Vice — Cover Studio. The one renderer for preview and export.
// drawCover(ctx, state, W, H) paints a movie-poster cover: multi-panel
// photos in natural colour with one unified warm wash, a giant striped
// retro-chrome title overlaid across the panels, cast role tags, a press
// quote bar, a tag strip and a billing block with barcode.
// The live preview and the exported PNG call this same function, so a
// screenshot of the preview is exactly what the app makes.

// Layouts: rects in 0..1 of the photo area (between the quote bar above
// and the tag strip below).
export const LAYOUTS = {
  grid33: {
    label: '3 x 3 Grid',
    cells: [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({
      x: (i % 3) / 3, y: Math.floor(i / 3) / 3, w: 1 / 3, h: 1 / 3, slant: 0,
    })),
  },
  hero2: {
    label: 'Hero + 2 stacked',
    cells: [
      { x: 0, y: 0, w: 0.62, h: 1, slant: 0 },
      { x: 0.62, y: 0, w: 0.38, h: 0.5, slant: 0 },
      { x: 0.62, y: 0.5, w: 0.38, h: 0.5, slant: 0 },
    ],
  },
  hero4: {
    label: '1 big + 4 small',
    cells: [
      { x: 0, y: 0, w: 0.58, h: 1, slant: 0 },
      { x: 0.58, y: 0, w: 0.21, h: 0.5, slant: 0 },
      { x: 0.79, y: 0, w: 0.21, h: 0.5, slant: 0 },
      { x: 0.58, y: 0.5, w: 0.21, h: 0.5, slant: 0 },
      { x: 0.79, y: 0.5, w: 0.21, h: 0.5, slant: 0 },
    ],
  },
  diagonal: {
    label: 'Diagonal slashes',
    cells: [
      { x: 0, y: 0, w: 0.36, h: 1, slant: 0.06 },
      { x: 0.33, y: 0, w: 0.36, h: 1, slant: 0.06 },
      { x: 0.66, y: 0, w: 0.34, h: 1, slant: 0.06 },
    ],
  },
};

// Grades: duotone ramps [shadow, mid, highlight] + special handling.
// 'warm' keeps the photo's own colours and adds one soft sunset wash, so
// every panel shares the same golden-hour light — the unified look the
// strongest covers use. The duotone grades stay for users who want them.
export const GRADES = {
  none: { label: 'Original', ramp: null },
  warm: { label: 'Warm Sunset', ramp: null, warm: true },
  sunset: { label: 'Sunset', ramp: ['#1c0b33', '#ff5e3a', '#ffd166'] },
  neon: { label: 'Neon Night', ramp: ['#070b28', '#3d4bff', '#4de3ff'] },
  ocean: { label: 'Ocean', ramp: ['#04141f', '#17809e', '#a8ecff'] },
  gold: { label: 'Vice Gold', ramp: ['#1a1206', '#c98a1b', '#ffe9a8'] },
  halftone: { label: 'Halftone', ramp: ['#1a0508', '#d21f3c', '#ffb0a0'], posterize: true },
  noir: { label: 'Mono Noir', ramp: null, mono: true },
};

export const GRADE_IDS = Object.keys(GRADES);
export const LAYOUT_IDS = Object.keys(LAYOUTS);

// Cast role for each sample photo, used for the panel role tags.
const ROLES = ['THE DRIVER', 'THE ANGLER', 'THE GETAWAY', 'THE MOTEL', 'THE CHOPPER', 'THE GATOR'];

// Default per-panel photo state: { photo, cx, cy, zoom, grade, flip, role }.
// cx/cy = crop centre in 0..1 of the photo; zoom = 1 fills the panel.
// role = null means "use the role of the assigned photo".
export function defaultPanel(photo, grade = 'warm') {
  return { photo, cx: 0.5, cy: 0.5, zoom: 1, grade, flip: false, role: null };
}

export function defaultState() {
  return {
    layout: 'hero4',
    title: 'PALM ROYALE',
    tagline: 'Live fast, shine brighter',
    eyebrow: 'ONE CREW  •  SIX STORIES  •  ALL GOLDEN HOUR',
    quote: 'A love letter to the golden hour',
    quoteSource: 'THE COAST REVIEW',
    banner: 'sunset', // 'sunset' | 'navy' — the tag strip style
    deco: { sun: true, palms: true, badge: true, tape: true, stars: true, skyline: true, roles: true, quote: true, billing: true },
    panels: [
      { ...defaultPanel(0, 'warm'), cy: 0.34 },
      defaultPanel(1, 'warm'),
      defaultPanel(2, 'warm'),
      defaultPanel(3, 'warm'),
      { ...defaultPanel(4, 'warm'), cx: 0.68, cy: 0.32 },
    ],
  };
}

const FONT_DISPLAY = '"Anton", "Arial Narrow", sans-serif';
const FONT_SCRIPT = '"Pacifico", cursive';
const FONT_SERIF = 'italic Georgia, "Times New Roman", serif';

// Vertical layout of the cover, shared by drawCover and panelRects so
// clicks land on the panels the user sees.
export function coverMetrics(W, H, state) {
  const quoteH = state.deco.quote && (state.quote || '').trim() ? H * 0.055 : 0;
  const tagH = H * 0.05;
  const billH = state.deco.billing ? H * 0.065 : 0;
  const photoY = quoteH;
  const photoH = H - quoteH - tagH - billH;
  const skyH = H * 0.024;
  return { quoteH, tagH, billH, photoY, photoH, skyH };
}

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerp(a, b, t) { return a + (b - a) * t; }

// Map one pixel through a duotone ramp by its luminance.
function gradePixel(r, g, b, grade) {
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (grade.mono) {
    const c = Math.max(0, Math.min(255, (lum - 0.5) * 1.5 * 255 + 128));
    return [c, c, c, 255];
  }
  const [s, m, h] = grade.ramp.map(hexRgb);
  let lo, hi, t;
  if (lum < 0.5) { lo = s; hi = m; t = lum / 0.5; } else { lo = m; hi = h; t = (lum - 0.5) / 0.5; }
  if (grade.posterize) t = Math.round(t * 3) / 3;
  return [lerp(lo[0], hi[0], t), lerp(lo[1], hi[1], t), lerp(lo[2], hi[2], t), 255];
}

// Paint `img` into rect (x,y,w,h) of ctx, cropped by the panel's crop state,
// then apply the panel grade in place.
function drawPanel(ctx, img, panel, x, y, w, h) {
  if (!img || w <= 0 || h <= 0) return;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const panelAspect = w / h;
  const imgAspect = iw / ih;
  // Base scale that covers the panel, then the panel zoom.
  let sw, sh;
  if (imgAspect > panelAspect) { sh = ih; sw = ih * panelAspect; } else { sw = iw; sh = iw / panelAspect; }
  sw /= panel.zoom; sh /= panel.zoom;
  let sx = panel.cx * iw - sw / 2;
  let sy = panel.cy * ih - sh / 2;
  sx = Math.max(0, Math.min(iw - sw, sx));
  sy = Math.max(0, Math.min(ih - sh, sy));
  const grade = GRADES[panel.grade] || GRADES.none;
  if (!grade.ramp && !grade.mono) {
    ctx.save();
    if (panel.flip) { ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h); }
    else ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    ctx.restore();
    if (grade.warm) {
      // One soft sunset wash over the photo's own colours.
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      const wg = ctx.createLinearGradient(0, y, 0, y + h);
      wg.addColorStop(0, 'rgba(255,150,60,0.55)');
      wg.addColorStop(0.5, 'rgba(255,110,80,0.35)');
      wg.addColorStop(1, 'rgba(220,60,140,0.45)');
      ctx.fillStyle = wg;
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    }
    return;
  }
  // Grade on a scratch canvas at panel resolution, then blit.
  const tmp = drawPanel._tmp || (drawPanel._tmp = document.createElement('canvas'));
  const tw = Math.max(2, Math.round(w));
  const th = Math.max(2, Math.round(h));
  tmp.width = tw; tmp.height = th;
  const tctx = tmp.getContext('2d');
  tctx.save();
  if (panel.flip) { tctx.translate(tw, 0); tctx.scale(-1, 1); tctx.drawImage(img, sx, sy, sw, sh, 0, 0, tw, th); }
  else tctx.drawImage(img, sx, sy, sw, sh, 0, 0, tw, th);
  tctx.restore();
  const data = tctx.getImageData(0, 0, tw, th);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const [r, g, b, a] = gradePixel(px[i], px[i + 1], px[i + 2], grade);
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
  }
  tctx.putImageData(data, 0, 0);
  if (grade.posterize) {
    // Halftone dot texture: dark dots where the image is dark.
    tctx.globalAlpha = 0.22;
    tctx.fillStyle = grade.ramp ? grade.ramp[0] : '#160a24';
    const step = Math.max(5, Math.round(tw / 90));
    for (let yy = 0; yy < th; yy += step) {
      for (let xx = 0; xx < tw; xx += step) {
        const idx = (yy * tw + xx) * 4;
        const lum = (px[idx] + px[idx + 1] + px[idx + 2]) / 3 / 255;
        const r = (1 - lum) * step * 0.42;
        if (r > 0.6) { tctx.beginPath(); tctx.arc(xx + step / 2, yy + step / 2, r, 0, Math.PI * 2); tctx.fill(); }
      }
    }
    tctx.globalAlpha = 1;
  }
  ctx.drawImage(tmp, x, y, w, h);
}

// A palm tree silhouette anchored at (x, yBottom), total height h.
// Trunk + 5 drooping fronds, drawn small enough to sit inside the tag strip.
function drawPalm(ctx, x, yBottom, h, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  const topX = x + h * 0.05;
  const topY = yBottom - h * 0.72;
  ctx.lineWidth = Math.max(1.5, h * 0.055);
  ctx.beginPath();
  ctx.moveTo(x, yBottom);
  ctx.quadraticCurveTo(x + h * 0.01, yBottom - h * 0.4, topX, topY);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, h * 0.042);
  for (let i = 0; i < 5; i++) {
    const a = (-165 + i * 37) * Math.PI / 180;
    const len = h * (0.46 + (i % 2) * 0.06);
    const tipX = topX + Math.cos(a) * len;
    const tipY = topY + Math.sin(a) * len * 0.45 + len * 0.18;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + Math.cos(a) * len * 0.6, topY - len * 0.18, tipX, tipY);
    ctx.stroke();
  }
  ctx.restore();
}

// Retro sun: a disc with horizontal slits, classic sunset poster mark.
function drawRetroSun(ctx, cx, cy, r, colors) {
  ctx.save();
  const grad = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(1, colors[1]);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Cut slits out of the lower half.
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 4; i++) {
    const yy = cy + r * (0.08 + i * 0.2);
    const half = Math.sqrt(Math.max(0, r * r - (yy - cy) * (yy - cy)));
    ctx.fillRect(cx - half, yy, half * 2, r * 0.055 + i * r * 0.012);
  }
  ctx.restore();
}

// Starburst badge: spiked circle with two lines of text.
function drawBadge(ctx, cx, cy, r, line1, line2) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  const spikes = 16;
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.78;
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffd166';
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.strokeStyle = '#14081f';
  ctx.stroke();
  ctx.fillStyle = '#14081f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `400 ${r * 0.34}px ${FONT_DISPLAY}`;
  ctx.fillText(line1, 0, -r * 0.14);
  ctx.font = `400 ${r * 0.26}px ${FONT_DISPLAY}`;
  ctx.fillText(line2, 0, r * 0.22);
  ctx.restore();
}

// Tape label: a slightly rotated strip with tracked caps text.
function drawTape(ctx, x, y, w, h, text, angle) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(angle);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = 'rgba(20,8,31,0.55)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
  ctx.fillStyle = '#14081f';
  ctx.font = `400 ${h * 0.52}px ${FONT_DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  try { ctx.letterSpacing = `${h * 0.12}px`; } catch (e) { /* older canvas */ }
  ctx.fillText(text, 0, h * 0.03);
  try { ctx.letterSpacing = '0px'; } catch (e) { /* older canvas */ }
  ctx.restore();
}

function drawStars(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = -2; i <= 2; i++) {
    const x = cx + i * size * 1.5;
    star(ctx, x, cy, size);
  }
  ctx.restore();
}

function star(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = cx + Math.cos(a) * rr;
    const py = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

// City skyline silhouette: flat-topped towers with a few lit windows,
// sitting on the top edge of the tag strip.
function drawSkyline(ctx, x, yBase, w, h, color) {
  ctx.save();
  ctx.fillStyle = color;
  const rng = mulberry32(7);
  let px = x;
  const towers = [];
  while (px < x + w) {
    const bw = w * (0.03 + rng() * 0.04);
    const bh = h * (0.45 + rng() * 0.55);
    towers.push({ x: px, w: bw, h: bh });
    ctx.fillRect(px, yBase - bh, bw, bh);
    if (rng() < 0.22) { // antenna on some towers
      ctx.fillRect(px + bw * 0.47, yBase - bh - h * 0.3, Math.max(1.5, w * 0.0012), h * 0.3);
    }
    px += bw + w * 0.006;
  }
  // Lit windows: a few small gold panes per tower.
  ctx.fillStyle = 'rgba(255,209,102,0.85)';
  for (const t of towers) {
    const cols = Math.max(1, Math.floor(t.w / (w * 0.012)));
    const rows = Math.max(1, Math.floor(t.h / (h * 0.3)));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rng() < 0.35) {
          ctx.fillRect(t.x + w * 0.006 + c * w * 0.012, yBase - t.h + h * 0.08 + r * h * 0.3, w * 0.005, h * 0.16);
        }
      }
    }
  }
  ctx.restore();
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cast role tag: black pill with a pink bar, bottom corner of a panel.
function drawRoleTag(ctx, x, yBottom, text, u, alignRight, maxX) {
  const fs = Math.max(11, 17 * u);
  ctx.save();
  ctx.font = `700 ${fs}px "Arial Narrow", sans-serif`;
  const tw = ctx.measureText(text).width;
  const padX = 10 * u;
  const h = fs * 1.9;
  const w = tw + padX * 2 + 5 * u;
  let x0 = alignRight ? Math.min(maxX - w, x) : x;
  if (x0 < 0) x0 = 0;
  const y0 = yBottom - h;
  ctx.fillStyle = 'rgba(10,4,18,0.88)';
  ctx.fillRect(x0, y0, w, h);
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(x0, y0, 5 * u, h);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x0 + padX + 5 * u, y0 + h / 2 + fs * 0.04);
  ctx.restore();
}

// Fake barcode: seeded vertical bars, white on dark.
function drawBarcode(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = '#f5efe4';
  const rng = mulberry32(11);
  let px = x;
  while (px < x + w) {
    const bw = 1 + Math.floor(rng() * 3);
    if (rng() < 0.72) ctx.fillRect(px, y, bw, h);
    px += bw + 1 + Math.floor(rng() * 3);
  }
  ctx.restore();
}

// Fit a font size so the text fits inside maxWidth.
function fitFont(ctx, text, maxWidth, startSize, font) {
  let size = startSize;
  ctx.font = `${size}px ${font}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 1;
    ctx.font = `${size}px ${font}`;
  }
  return size;
}

// Striped retro-chrome fill for the big title: horizontal bands of
// white → gold → orange → pink → purple, with sharp band edges.
function chromeGradient(ctx, yTop, yBottom) {
  const g = ctx.createLinearGradient(0, yTop, 0, yBottom);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.28, '#ffe9a8');
  g.addColorStop(0.3, '#ffb347');
  g.addColorStop(0.52, '#ff7a3d');
  g.addColorStop(0.54, '#ff2e63');
  g.addColorStop(0.74, '#e83e8c');
  g.addColorStop(0.76, '#b5378f');
  g.addColorStop(1, '#7b2a86');
  return g;
}

/** The whole cover. `photos` is an array of images; `state` is defaultState()
 *  (or a shot preset). Draws at the canvas's own pixel size. */
export function drawCover(canvas, photos, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const u = Math.min(W, H) / 1080; // scale unit: 1 at 1080px
  const gap = Math.max(2, 7 * u);
  const { quoteH, tagH, billH, photoY, photoH, skyH } = coverMetrics(W, H, state);
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero4;

  // Cream base; panel gaps read as thin light borders.
  ctx.fillStyle = '#f5efe4';
  ctx.fillRect(0, 0, W, H);

  // Press quote bar along the top.
  if (quoteH > 0) {
    ctx.fillStyle = '#14081f';
    ctx.fillRect(0, 0, W, quoteH);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(0, quoteH - Math.max(2, 3 * u), W, Math.max(2, 3 * u));
    const cy = quoteH / 2;
    let tx = W * 0.02;
    if (state.deco.stars) {
      const starSize = Math.max(5, quoteH * 0.16);
      drawStars(ctx, tx + starSize * 3.6, cy, starSize, '#ffd166');
      tx += starSize * 8.2;
    }
    const quoteText = `\u201C${(state.quote || '').trim()}\u201D`;
    const srcText = state.quoteSource ? `  \u2014  ${state.quoteSource.toUpperCase()}` : '';
    const qSize = fitFont(ctx, quoteText + srcText, W * 0.96 - tx, quoteH * 0.42, FONT_SERIF);
    ctx.font = `${qSize}px ${FONT_SERIF}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(quoteText, tx, cy);
    if (srcText) {
      const qw = ctx.measureText(quoteText).width;
      ctx.fillStyle = '#ffd166';
      ctx.fillText(srcText, tx + qw, cy);
    }
  }

  // Panels first, then the skyline, then the role tags on top of both:
  // the skyline band overlaps the bottom-row panels and would otherwise
  // paint over their tags.
  const tagY = photoY + photoH;
  const rects = [];
  layout.cells.forEach((cell, i) => {
    const panel = state.panels[i] || state.panels[state.panels.length - 1];
    const px = cell.x * W + gap;
    const py = photoY + cell.y * photoH + gap;
    const pw = cell.w * W - gap * 2;
    const ph = cell.h * photoH - gap * 2;
    rects.push({ x: px, y: py, w: pw, h: ph });
    const img = photos[panel.photo] || null;
    ctx.save();
    if (cell.slant) {
      const s = cell.slant * W;
      ctx.beginPath();
      ctx.moveTo(px + s, py);
      ctx.lineTo(px + pw + s, py);
      ctx.lineTo(px + pw - s, py + ph);
      ctx.lineTo(px - s, py + ph);
      ctx.closePath();
      ctx.clip();
    } else {
      ctx.beginPath();
      ctx.rect(px, py, pw, ph);
      ctx.clip();
    }
    if (img) drawPanel(ctx, img, panel, px, py, pw, ph);
    else { ctx.fillStyle = '#2b1838'; ctx.fillRect(px, py, pw, ph); }
    ctx.restore();
  });

  // Skyline silhouette on the top edge of the tag strip.
  if (state.deco.skyline) {
    drawSkyline(ctx, 0, tagY, W, skyH, '#14081f');
  }

  // Cast role tags, after the skyline so they stay readable.
  if (state.deco.roles) {
    layout.cells.forEach((cell, i) => {
      const panel = state.panels[i] || state.panels[state.panels.length - 1];
      const r = rects[i];
      const role = panel.role || ROLES[panel.photo] || 'THE CREW';
      const pad = 8 * u;
      if (cell.slant) {
        // Slanted panels: the title sits over their bottoms, so the tag
        // goes top-right, clear of the lettering.
        const tagH = Math.max(11, 17 * u) * 1.9;
        drawRoleTag(ctx, r.x + r.w - pad, r.y + pad + tagH, role, u, true, r.x + r.w - pad);
      } else {
        drawRoleTag(ctx, r.x + pad, r.y + r.h - pad, role, u, false, r.x + r.w - pad);
      }
    });
  }

  // The big title, overlaid across the lower panels.
  const cx = W / 2;
  const title = (state.title || '').trim().toUpperCase();
  const titleSize = title
    ? fitFont(ctx, title, W * 0.96, Math.min(W * 0.115, photoH * 0.24), FONT_DISPLAY)
    : 0;
  const titleY = tagY - skyH - titleSize * 1.01;
  // Tagline geometry, shared by its scrim (drawn under the title) and the
  // text itself (drawn over it). The tagline sits FULLY below the title's
  // white halo: its ascender tops clear the halo's bottom edge, so no
  // white script ever lands on the white halo. The title moved up to
  // make room without touching the bottom-row role tags.
  const tgSize = title ? Math.max(14, titleSize * 0.20) : 0;
  const tgBase = titleY + titleSize * 0.72;
  let tgW = 0;
  if (state.tagline && tgSize) {
    ctx.font = `${tgSize}px ${FONT_SCRIPT}`;
    tgW = ctx.measureText(state.tagline).width;
  }
  if (state.tagline && tgSize) {
    // Dark scrim pill behind the script: white Pacifico over bright photo
    // (white shirt, bright sky) measured 1.7–3.3:1 without it. The pill
    // sits just below the title's halo with a small gap.
    const padX = tgSize * 0.7;
    const padT = tgSize * 0.95;
    const padB = tgSize * 0.55;
    const sx = cx - tgW / 2 - padX;
    const sy = tgBase - padT;
    const sw = tgW + padX * 2;
    const sh = padT + padB;
    ctx.save();
    ctx.fillStyle = 'rgba(10,4,18,0.82)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(sx, sy, sw, sh, Math.min(sh / 2, tgSize * 0.5));
    else ctx.rect(sx, sy, sw, sh);
    ctx.fill();
    ctx.restore();
  }
  if (title) {
    ctx.font = `${titleSize}px ${FONT_DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    // Double outline: the white outer ring reads against dark photos, the
    // dark inner ring against bright ones. The chrome fill alone fails at
    // both ends — pale top over bright sky, purple bottom over dark water.
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, titleSize * 0.20);
    ctx.strokeText(title, cx, titleY);
    ctx.strokeStyle = '#14081f';
    ctx.lineWidth = Math.max(2, titleSize * 0.09);
    ctx.strokeText(title, cx, titleY);
    ctx.fillStyle = chromeGradient(ctx, titleY - titleSize * 0.5, titleY + titleSize * 0.5);
    ctx.fillText(title, cx, titleY);
  }
  if (state.tagline) {
    // The script sits on its dark scrim just below the title, clear of
    // the halo above and the bottom-row role tags below.
    ctx.font = `${tgSize}px ${FONT_SCRIPT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(20,8,31,0.9)';
    ctx.lineWidth = Math.max(2, tgSize * 0.18);
    ctx.strokeText(state.tagline, cx, tgBase);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(state.tagline, cx, tgBase);
  }

  // Tape label (top-left of the photo area) + seal (bottom-right).
  if (state.deco.tape) {
    drawTape(ctx, W * 0.02, photoY + photoH * 0.03, Math.min(W * 0.13, 150 * u), Math.max(16, 30 * u), 'VOL. 01', -0.05);
  }
  if (state.deco.badge) {
    drawBadge(ctx, W * 0.93, tagY - skyH - Math.max(18, 40 * u) * 1.1, Math.max(18, 40 * u), 'EST.', '2026');
  }

  // Tag strip: sunset gradient (or navy) with sun, palms and the eyebrow.
  const by = tagY;
  if (state.banner === 'sunset') {
    const g = ctx.createLinearGradient(0, by, 0, by + tagH);
    g.addColorStop(0, '#ff7a3d');
    g.addColorStop(0.55, '#e83e8c');
    g.addColorStop(1, '#5b2a86');
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = '#14081f';
  }
  ctx.fillRect(0, by, W, tagH);
  if (state.deco.palms) {
    const ph2 = tagH * 1.15;
    drawPalm(ctx, W * 0.012, by + tagH, ph2, 'rgba(20,8,31,0.9)');
    drawPalm(ctx, W * 0.988, by + tagH, ph2, 'rgba(20,8,31,0.9)');
  }
  if (state.deco.sun) {
    drawRetroSun(ctx, W * 0.07, by + tagH * 0.52, tagH * 0.42, ['#ffd166', '#ff5e3a']);
  }
  if (state.eyebrow) {
    // Set tracking BEFORE measuring, so the fit accounts for it.
    const ebSize = fitFont(ctx, state.eyebrow.toUpperCase(), W * 0.8, tagH * 0.42, '"Arial Narrow", sans-serif');
    ctx.fillStyle = '#ffd166';
    ctx.font = `700 ${ebSize}px "Arial Narrow", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    try { ctx.letterSpacing = `${Math.max(2, ebSize * 0.22)}px`; } catch (e) { /* older canvas */ }
    // Re-fit with tracking applied: tracking widens the text.
    let ebSize2 = ebSize;
    while (ebSize2 > 10 && ctx.measureText(state.eyebrow.toUpperCase()).width > W * 0.8) {
      ebSize2 -= 1;
      ctx.font = `700 ${ebSize2}px "Arial Narrow", sans-serif`;
      try { ctx.letterSpacing = `${Math.max(2, ebSize2 * 0.22)}px`; } catch (e) { /* older canvas */ }
    }
    if (state.banner === 'sunset') {
      // Dark scrim pill behind the gold text: gold on the orange-pink
      // gradient measured 2.3:1. The navy banner needs none (gold on
      // near-black already passes).
      const ebW = ctx.measureText(state.eyebrow.toUpperCase()).width;
      const padX = ebSize2 * 0.9;
      const eby = by + tagH * 0.54;
      const eh = ebSize2 * 1.7;
      ctx.save();
      ctx.fillStyle = 'rgba(10,4,18,0.82)';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') ctx.roundRect(cx - ebW / 2 - padX, eby - eh / 2, ebW + padX * 2, eh, eh / 2);
      else ctx.rect(cx - ebW / 2 - padX, eby - eh / 2, ebW + padX * 2, eh);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillText(state.eyebrow.toUpperCase(), cx, by + tagH * 0.54);
    try { ctx.letterSpacing = '0px'; } catch (e) { /* older canvas */ }
  }

  // Billing strip: COMING SOON + billing line + barcode.
  if (billH > 0) {
    const bby = by + tagH;
    ctx.fillStyle = '#0d0616';
    ctx.fillRect(0, bby, W, billH);
    ctx.fillStyle = '#ff5e8a';
    const csSize = billH * 0.34;
    ctx.font = `700 ${csSize}px "Arial Narrow", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('COMING SOON', W * 0.02, bby + billH / 2);
    const csW = ctx.measureText('COMING SOON').width;
    const bcW = Math.min(W * 0.055, 110 * u);
    const bcX = W * 0.985 - bcW;
    drawBarcode(ctx, bcX, bby + billH * 0.22, bcW, billH * 0.56);
    const billing = 'SUNSET VICE PRESENTS  •  STARRING YOUR CREW  •  SHOT ON YOUR OWN CAMERA  •  NOTHING UPLOADED';
    const bAvail = bcX - W * 0.02 - csW - W * 0.04;
    const bSize = fitFont(ctx, billing, bAvail, billH * 0.26, '"Arial Narrow", sans-serif');
    ctx.fillStyle = 'rgba(245,239,228,0.75)';
    ctx.font = `${bSize}px "Arial Narrow", sans-serif`;
    ctx.textAlign = 'center';
    try { ctx.letterSpacing = `${Math.max(1, bSize * 0.08)}px`; } catch (e) { /* older canvas */ }
    // Re-fit with tracking applied: tracking widens the text.
    let bSize2 = bSize;
    while (bSize2 > 9 && ctx.measureText(billing).width > bAvail) {
      bSize2 -= 1;
      ctx.font = `${bSize2}px "Arial Narrow", sans-serif`;
      try { ctx.letterSpacing = `${Math.max(1, bSize2 * 0.08)}px`; } catch (e) { /* older canvas */ }
    }
    ctx.fillText(billing, (W * 0.02 + csW + W * 0.02 + bcX) / 2, bby + billH / 2 + bSize2 * 0.05);
    try { ctx.letterSpacing = '0px'; } catch (e) { /* older canvas */ }
  }
}

// Panel rects in canvas pixels, for hit-testing clicks in the preview.
export function panelRects(canvas, state) {
  const W = canvas.width;
  const H = canvas.height;
  const { photoY, photoH } = coverMetrics(W, H, state);
  const u = Math.min(W, H) / 1080;
  const gap = Math.max(2, 7 * u);
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero4;
  return layout.cells.map((cell) => ({
    x: cell.x * W + gap,
    y: photoY + cell.y * photoH + gap,
    w: cell.w * W - gap * 2,
    h: cell.h * photoH - gap * 2,
  }));
}

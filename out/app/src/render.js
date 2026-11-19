// Vice Sunset Cover Studio — the one renderer for preview and export.
// drawCover(ctx, state, W, H) paints the whole cover: multi-panel photos with
// per-panel grades, a bottom title banner, and canvas-drawn decorations.
// The live preview and the exported PNG call this same function, so a
// screenshot of the preview is exactly what the app makes.

// Layouts: rects in 0..1 of the photo area (the part above the title banner).
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
export const GRADES = {
  none: { label: 'Original', ramp: null },
  sunset: { label: 'Sunset', ramp: ['#1c0b33', '#ff5e3a', '#ffd166'] },
  neon: { label: 'Neon Night', ramp: ['#0a1030', '#b537f2', '#4de3ff'] },
  gold: { label: 'Vice Gold', ramp: ['#1a1206', '#c98a1b', '#ffe9a8'] },
  halftone: { label: 'Halftone', ramp: ['#160a24', '#ff5e3a', '#ffd166'], posterize: true },
  noir: { label: 'Mono Noir', ramp: null, mono: true },
};

export const GRADE_IDS = Object.keys(GRADES);
export const LAYOUT_IDS = Object.keys(LAYOUTS);

// Default per-panel photo state: { photo, cx, cy, zoom, grade, flip }.
// cx/cy = crop centre in 0..1 of the photo; zoom = 1 fills the panel.
export function defaultPanel(photo, grade = 'sunset') {
  return { photo, cx: 0.5, cy: 0.5, zoom: 1, grade, flip: false };
}

export function defaultState() {
  return {
    layout: 'hero4',
    title: 'SUNSET CHASE',
    tagline: 'Every street is a stage',
    eyebrow: 'EST. 2026  •  LEONIDA',
    banner: 'sunset', // 'sunset' | 'navy'
    deco: { sun: true, palms: true, badge: true, tape: true, stars: true, skyline: true },
    panels: [
      { ...defaultPanel(0, 'sunset'), cy: 0.34 },
      defaultPanel(1, 'neon'),
      defaultPanel(2, 'gold'),
      defaultPanel(3, 'sunset'),
      defaultPanel(0, 'halftone'),
    ],
  };
}

const FONT_DISPLAY = '"Anton", "Arial Narrow", sans-serif';
const FONT_SCRIPT = '"Pacifico", cursive';

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
    tctx.fillStyle = '#160a24';
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
// Trunk + 5 drooping fronds, drawn small enough to sit inside the banner.
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

// Skyline silhouette along the top edge of the banner.
function drawSkyline(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  let px = x;
  const rng = mulberry32(7);
  while (px < x + w) {
    const bw = w * (0.02 + rng() * 0.035);
    const bh = h * (0.3 + rng() * 0.7);
    ctx.lineTo(px, y + h - bh);
    if (rng() < 0.25) { // antenna on some towers
      ctx.lineTo(px + bw * 0.45, y + h - bh);
      ctx.lineTo(px + bw * 0.5, y + h - bh - h * 0.35);
      ctx.lineTo(px + bw * 0.55, y + h - bh);
    }
    ctx.lineTo(px + bw, y + h - bh);
    ctx.lineTo(px + bw, y + h);
    px += bw + w * 0.008;
  }
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
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

// Fit the title font size so the text fits inside maxWidth.
function fitTitleFont(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${size}px ${FONT_DISPLAY}`;
  while (size > 16 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px ${FONT_DISPLAY}`;
  }
  return size;
}

/** The whole cover. `photos` is an array of images; `state` is defaultState()
 *  (or a shot preset). Draws at the canvas's own pixel size. */
export function drawCover(canvas, photos, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const u = Math.min(W, H) / 1080; // scale unit: 1 at 1080px
  const gap = Math.max(2, 7 * u);
  const bannerH = H * 0.235;
  const photoH = H - bannerH;
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero4;

  // Deep navy base; panel gaps read as thin white borders.
  ctx.fillStyle = '#f5efe4';
  ctx.fillRect(0, 0, W, H);

  // Panels.
  layout.cells.forEach((cell, i) => {
    const panel = state.panels[i] || state.panels[state.panels.length - 1];
    const px = cell.x * W + gap;
    const py = cell.y * photoH + gap;
    const pw = cell.w * W - gap * 2;
    const ph = cell.h * photoH - gap * 2;
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

  // Banner.
  const by = photoH;
  if (state.banner === 'sunset') {
    const g = ctx.createLinearGradient(0, by, 0, H);
    g.addColorStop(0, '#ff7a3d');
    g.addColorStop(0.55, '#e83e8c');
    g.addColorStop(1, '#5b2a86');
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = '#14081f';
  }
  ctx.fillRect(0, by, W, bannerH);
  ctx.fillStyle = 'rgba(20,8,31,0.9)';
  ctx.fillRect(0, by, W, Math.max(2, 3 * u));

  if (state.deco.skyline) {
    drawSkyline(ctx, 0, by - 22 * u, W, 22 * u, 'rgba(20,8,31,0.7)');
  }

  // Eyebrow + title + tagline, centred, clear of every photo.
  // Palms first: they sit behind the sun and stars, so fronds read as a
  // silhouette against the sun instead of scratches across it.
  if (state.deco.palms) {
    const ph2 = bannerH * 0.62;
    drawPalm(ctx, W * 0.012, by + bannerH * 0.97, ph2, 'rgba(20,8,31,0.9)');
    drawPalm(ctx, W * 0.988, by + bannerH * 0.97, ph2, 'rgba(20,8,31,0.9)');
  }
  const cx = W / 2;
  const title = (state.title || '').trim().toUpperCase();
  const titleSize = fitTitleFont(ctx, title, W * 0.92, bannerH * 0.42);
  const titleY = by + bannerH * 0.52;
  if (state.deco.sun) {
    drawRetroSun(ctx, W * 0.09, by + bannerH * 0.5, bannerH * 0.22, ['#ffd166', '#ff5e3a']);
  }
  if (state.eyebrow) {
    ctx.fillStyle = '#ffd166';
    ctx.font = `700 ${Math.max(11, bannerH * 0.1)}px "Arial Narrow", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    try { ctx.letterSpacing = `${Math.max(2, bannerH * 0.03)}px`; } catch (e) { /* older canvas */ }
    ctx.fillText(state.eyebrow.toUpperCase(), cx, by + bannerH * 0.2);
    try { ctx.letterSpacing = '0px'; } catch (e) { /* older canvas */ }
  }
  if (title) {
    const tg = ctx.createLinearGradient(0, titleY - titleSize, 0, titleY + titleSize * 0.2);
    tg.addColorStop(0, '#ffffff');
    tg.addColorStop(0.55, '#ffe9a8');
    tg.addColorStop(1, '#ffb347');
    ctx.font = `${titleSize}px ${FONT_DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#14081f';
    ctx.lineWidth = Math.max(2, titleSize * 0.09);
    ctx.strokeText(title, cx, titleY);
    ctx.fillStyle = tg;
    ctx.fillText(title, cx, titleY);
  }
  if (state.tagline) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.max(13, bannerH * 0.13)}px ${FONT_SCRIPT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(state.tagline, cx, by + bannerH * 0.86);
  }
  if (state.deco.stars) {
    drawStars(ctx, W * 0.925, by + bannerH * 0.5, Math.max(5, bannerH * 0.055), '#ffd166');
  }
  if (state.deco.badge) {
    drawBadge(ctx, W * 0.9, photoH * 0.08, Math.max(18, 44 * u), 'EST.', '2026');
  }
  if (state.deco.tape) {
    drawTape(ctx, W * 0.03, photoH * 0.05, Math.min(W * 0.24, 260 * u), Math.max(16, 30 * u), 'COLLECTORS EDITION', -0.05);
  }
}

// Panel rects in canvas pixels, for hit-testing clicks in the preview.
export function panelRects(canvas, state) {
  const W = canvas.width;
  const H = canvas.height;
  const bannerH = H * 0.235;
  const photoH = H - bannerH;
  const u = Math.min(W, H) / 1080;
  const gap = Math.max(2, 7 * u);
  const layout = LAYOUTS[state.layout] || LAYOUTS.hero4;
  return layout.cells.map((cell) => ({
    x: cell.x * W + gap,
    y: cell.y * photoH + gap,
    w: cell.w * W - gap * 2,
    h: cell.h * photoH - gap * 2,
  }));
}

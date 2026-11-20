// render.js — one canvas renderer for the Sunset Vice cover.
//
// drawCover draws the live preview AND the exported PNG at full size, so a
// screenshot of the app is exactly what the app makes. Everything is drawn
// with the 2D canvas API; no image, font or script comes from the network.
//
// A cover is, top to bottom:
//   quote bar (5 gold stars + press quote + gold source)
//   photo panels (one of 4 layouts, Warm Sunset grade over every panel)
//   skyline silhouette along the bottom edge of the photos
//   tag band (sunset gradient with a dark pill, or dark band) with the
//     retro sun icon at the left and the tag strip in gold caps
//   billing strip (COMING SOON / white bold billing line / barcode)
// The title sits over the lower photos, the tagline on its own dark scrim
// pill directly below the title. A yellow VOL. 01 tape labels the first
// panel; a gold EST. 2026 seal sits at the lower right of the photos.

export const SIZES = {
  square: { w: 1080, h: 1080, label: 'Square 1080×1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait 1080×1350' },
  landscape: { w: 1920, h: 1080, label: 'Landscape 1920×1080' },
};

export const LAYOUTS = {
  grid: { label: '3 × 3 Grid', panels: 9 },
  hero2: { label: 'Hero + 2', panels: 3 },
  big4: { label: '1 big + 4', panels: 5 },
  diagonal: { label: 'Diagonal', panels: 3 },
};

export const GRADES = {
  warm: { label: 'Warm Sunset' },
  golden: { label: 'Golden Hour' },
  neon: { label: 'Neon Night' },
  mono: { label: 'Mono Noir' },
};

// The ink and paper of the whole cover. Dark navy is the cover's black;
// gold is its accent; hot pink is its second accent.
const NAVY = '#150a2e';
const NAVY_DEEP = '#0d0618';
const GOLD = '#ffc93c';
const GOLD_DEEP = '#e8a91c';
const PINK = '#ff2e88';
const CREAM = '#f5ead2';
const WHITE = '#ffffff';
const TAPE = '#ffd94d';

// A tiny deterministic generator, so the skyline, the barcode and the
// window lights are the same on every render of the same cover.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ---------------------------------------------------------------- geometry

// The vertical furniture, as fractions of the cover height.
export function furniture(h) {
  const quote = 0.056 * h;
  const band = 0.07 * h;
  const billing = 0.055 * h;
  const photoTop = quote;
  const photoBottom = h - band - billing;
  return { quote, band, billing, photoTop, photoBottom, photoH: photoBottom - photoTop };
}

// Panel rectangles for a layout, inside the photo area. Each rect is
// {x, y, w, h} in cover pixels; diagonal panels also carry the slant of
// their left and right edges (top x minus bottom x) so the photo clip and
// the cast tag can follow the lean.
export function layoutPanels(layout, w, h) {
  const f = furniture(h);
  const gap = Math.max(3, Math.round(0.004 * w));
  const top = f.photoTop;
  const ph = f.photoH;
  if (layout === 'grid') {
    const pw = (w - 2 * gap) / 3;
    const pH = (ph - 2 * gap) / 3;
    const out = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        out.push({ x: c * (pw + gap), y: top + r * (pH + gap), w: pw, h: pH, slant: 0 });
      }
    }
    return out;
  }
  if (layout === 'hero2') {
    const heroW = Math.round(0.62 * w);
    const sideW = w - heroW - gap;
    const sideH = (ph - gap) / 2;
    return [
      { x: 0, y: top, w: heroW, h: ph, slant: 0 },
      { x: heroW + gap, y: top, w: sideW, h: sideH, slant: 0 },
      { x: heroW + gap, y: top + sideH + gap, w: sideW, h: sideH, slant: 0 },
    ];
  }
  if (layout === 'diagonal') {
    // Three leaning panels. Each divider slants by the same amount: its top
    // sits right of its bottom, so the panels lean like a deck of cards.
    const slant = 0.1 * ph;
    const b1 = w / 3;
    const b2 = (2 * w) / 3;
    const edge = (bx, y) => bx + slant * (0.5 - (y - top) / ph);
    return [
      { x: 0, y: top, w: b1 + slant / 2, h: ph, slant, edgeAt: (y) => edge(b1, y), left: 0, right: b1 },
      { x: b1 - slant / 2, y: top, w: b2 - b1 + slant, h: ph, slant, edgeAt: (y) => edge(b2, y), left: b1, right: b2 },
      { x: b2 - slant / 2, y: top, w: w - b2 + slant / 2, h: ph, slant, edgeAt: () => w, left: b2, right: w },
    ];
  }
  // big4: one hero at the left, four small panels in a 2x2 block at right.
  const heroW = Math.round(0.625 * w);
  const sideW = w - heroW - gap;
  const smallW = (sideW - gap) / 2;
  const smallH = (ph - gap) / 2;
  return [
    { x: 0, y: top, w: heroW, h: ph, slant: 0 },
    { x: heroW + gap, y: top, w: smallW, h: smallH, slant: 0 },
    { x: heroW + gap + smallW + gap, y: top, w: smallW, h: smallH, slant: 0 },
    { x: heroW + gap, y: top + smallH + gap, w: smallW, h: smallH, slant: 0 },
    { x: heroW + gap + smallW + gap, y: top + smallH + gap, w: smallW, h: smallH, slant: 0 },
  ];
}

// Which panel, if any, holds the point (x, y) in cover coordinates.
export function panelAt(layout, w, h, x, y) {
  const panels = layoutPanels(layout, w, h);
  const f = furniture(h);
  if (y < f.photoTop || y > f.photoBottom) return -1;
  for (let i = 0; i < panels.length; i++) {
    const p = panels[i];
    if (layout === 'diagonal') {
      const left = i === 0 ? 0 : p.left + p.slant * (0.5 - (y - f.photoTop) / f.photoH);
      const right = i === panels.length - 1 ? w : p.right + p.slant * (0.5 - (y - f.photoTop) / f.photoH);
      if (x >= left && x < right) return i;
    } else if (x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) {
      return i;
    }
  }
  return -1;
}

// ---------------------------------------------------------------- helpers

function roundRectPath(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

// The largest font size (at most `start`) whose text fits `maxW`.
function fitFont(ctx, text, start, maxW, family, weight = '') {
  let size = start;
  const fam = weight ? `${weight} ${size}px ${family}` : `${size}px ${family}`;
  ctx.font = fam;
  while (size > 8 && ctx.measureText(text).width > maxW) {
    size -= 1;
    ctx.font = weight ? `${weight} ${size}px ${family}` : `${size}px ${family}`;
  }
  return size;
}

// ---------------------------------------------------------------- photos

// The grade is one wash over every panel. Warm Sunset keeps the photo's own
// colours and adds a golden wash; it is never a duotone.
function gradePhoto(ctx, panel, grade) {
  const { x, y, w, h } = panel;
  if (grade === 'mono') {
    ctx.fillStyle = 'rgba(20, 12, 40, 0.08)';
    ctx.fillRect(x, y, w, h);
    return;
  }
  if (grade === 'neon') {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, 'rgba(64, 32, 160, 0.20)');
    g.addColorStop(1, 'rgba(255, 46, 136, 0.16)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    return;
  }
  if (grade === 'golden') {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, 'rgba(255, 170, 60, 0.16)');
    g.addColorStop(1, 'rgba(255, 90, 60, 0.18)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    return;
  }
  // Warm Sunset: a light golden wash, stronger at the bottom.
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, 'rgba(255, 178, 92, 0.06)');
  g.addColorStop(1, 'rgba(255, 122, 60, 0.12)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

// A photo drawn cover-fit into its panel, with the panel's zoom and pan.
// zoom 1 is cover-fit; panX/panY run -1..1 across the cropped excess.
function drawPhoto(ctx, panel, img, crop, grade, layout) {
  const { x, y, w, h } = panel;
  ctx.save();
  ctx.beginPath();
  if (layout === 'diagonal') {
    const top = panel.y;
    const ph = panel.h;
    const leftTop = panel.left === 0 ? 0 : panel.left + panel.slant / 2;
    const leftBottom = panel.left === 0 ? 0 : panel.left - panel.slant / 2;
    const rightTop = panel.right === undefined || panel.edgeAt === undefined ? panel.x + panel.w : panel.edgeAt(top);
    const rightBottom = panel.right === undefined ? panel.x + panel.w : panel.edgeAt(top + ph);
    ctx.moveTo(leftTop, top);
    ctx.lineTo(rightTop, top);
    ctx.lineTo(rightBottom, top + ph);
    ctx.lineTo(leftBottom, top + ph);
    ctx.closePath();
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.clip();
  if (img && img.naturalWidth > 0) {
    const zoom = crop?.zoom ?? 1;
    const panX = crop?.panX ?? 0;
    const panY = crop?.panY ?? 0;
    const s0 = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const s = s0 * zoom;
    const dw = img.naturalWidth * s;
    const dh = img.naturalHeight * s;
    const dx = x - (dw - w) * (0.5 + panX / 2);
    const dy = y - (dh - h) * (0.5 + panY / 2);
    if (grade === 'mono') ctx.filter = 'grayscale(1) contrast(1.08)';
    else if (grade === 'neon') ctx.filter = 'saturate(1.35) hue-rotate(-12deg)';
    else if (grade === 'golden') ctx.filter = 'saturate(1.15) sepia(0.22)';
    else ctx.filter = 'none';
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = 'none';
  } else {
    // No photo yet: a warm dusk placeholder, never blank.
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#3a1c5e');
    g.addColorStop(1, '#7a2a6e');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }
  gradePhoto(ctx, panel, grade);
  ctx.restore();
}

// ---------------------------------------------------------------- decorations

// The retro sun: a gold-orange disc with horizontal slits across its lower
// half. `slit` is the colour of the slits (the band behind it).
function drawSun(ctx, cx, cy, r, slit) {
  const g = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  g.addColorStop(0, '#ffd94d');
  g.addColorStop(0.55, '#ff9a3c');
  g.addColorStop(1, '#ff5e3a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = slit;
  const cuts = [0.08, 0.34, 0.6];
  for (const c of cuts) {
    const yy = cy + c * r;
    const half = Math.sqrt(Math.max(0, r * r - (yy - cy) * (yy - cy)));
    ctx.fillRect(cx - half, yy - r * 0.05, half * 2, r * 0.1);
  }
}

// A city skyline along the bottom edge of the photos: dark towers with a
// few lit windows, deterministic so every render matches.
function drawSkyline(ctx, w, photoBottom, hgt) {
  const rand = rng(7);
  ctx.fillStyle = NAVY_DEEP;
  let x = 0;
  const tops = [];
  while (x < w) {
    const bw = (0.018 + rand() * 0.032) * w;
    const bh = (0.35 + rand() * 0.65) * hgt;
    ctx.fillRect(x, photoBottom - bh, bw, bh);
    tops.push({ x, w: bw, top: photoBottom - bh, h: bh });
    x += bw + rand() * 0.004 * w;
  }
  // Lit windows: a sparse scatter of tiny gold dots.
  ctx.fillStyle = 'rgba(255, 201, 60, 0.9)';
  for (const t of tops) {
    const n = Math.floor(t.w / (0.02 * w));
    for (let i = 0; i < n; i++) {
      if (rand() < 0.65) continue;
      const wx = t.x + 0.15 * t.w + rand() * 0.7 * t.w;
      const wy = t.top + 0.15 * t.h + rand() * 0.7 * t.h;
      ctx.fillRect(wx, wy, Math.max(1.5, 0.0035 * w), Math.max(1.5, 0.0035 * w));
    }
  }
}

// The VOL. 01 tape: a yellow label, slightly rotated, dark caps text.
function drawTape(ctx, x, y, w, h, text, boxes) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(-0.07);
  ctx.fillStyle = TAPE;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = 'rgba(21, 10, 46, 0.85)';
  ctx.lineWidth = Math.max(1, 0.03 * h);
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = NAVY;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const size = fitFont(ctx, text, 0.52 * h, w * 0.86, 'Anton, sans-serif');
  ctx.font = `${size}px Anton, sans-serif`;
  try { ctx.letterSpacing = `${0.14 * size}px`; } catch { /* older canvas: no letter-spacing */ }
  ctx.fillText(text, 0, size * 0.04);
  try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  ctx.restore();
  if (boxes) boxes.push({ name: 'tape', x, y, w, h });
}

// The EST. 2026 seal: a gold starburst with two lines of dark caps text.
function drawSeal(ctx, cx, cy, r, boxes) {
  const spikes = 14;
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#ffe27a');
  g.addColorStop(0.6, GOLD);
  g.addColorStop(1, GOLD_DEEP);
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(120, 70, 0, 0.6)';
  ctx.lineWidth = Math.max(1, 0.03 * r);
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.78;
    const a = (Math.PI * i) / spikes - Math.PI / 2;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = NAVY;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const size = 0.26 * r;
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.fillText('EST.', cx, cy - size * 0.55);
  ctx.fillText('2026', cx, cy + size * 0.55);
  if (boxes) boxes.push({ name: 'seal', x: cx - r, y: cy - r, w: 2 * r, h: 2 * r });
}

// A cast tag: dark pill, hot pink bar at the left, white bold caps.
function drawTag(ctx, x, y, text, h, w, boxes, key) {
  const size = 0.022 * h;
  ctx.font = `700 ${size}px Arial, Helvetica, sans-serif`;
  try { ctx.letterSpacing = `${0.1 * size}px`; } catch { /* ignore */ }
  const tw = ctx.measureText(text).width;
  try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  const padX = 0.014 * w;
  const padY = 0.32 * size;
  const bar = Math.max(4, 0.005 * w);
  const bw = bar + padX * 2 + tw;
  const bh = size + padY * 2;
  ctx.fillStyle = 'rgba(13, 6, 24, 0.92)';
  roundRectPath(ctx, x, y, bw, bh, 0.14 * bh);
  ctx.fill();
  ctx.fillStyle = PINK;
  ctx.fillRect(x, y, bar, bh);
  ctx.fillStyle = WHITE;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${size}px Arial, Helvetica, sans-serif`;
  try { ctx.letterSpacing = `${0.1 * size}px`; } catch { /* ignore */ }
  ctx.fillText(text, x + bar + padX, y + bh / 2 + size * 0.04);
  try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  if (boxes) boxes.push({ name: key || `tag:${text}`, x, y, w: bw, h: bh });
}

// The barcode at the right of the billing strip: white bars, fixed pattern.
function drawBarcode(ctx, x, y, w, h) {
  const rand = rng(99);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  let bx = x;
  while (bx < x + w - 2) {
    const bw = (rand() < 0.5 ? 1 : rand() < 0.7 ? 2 : 3) * Math.max(1, w / 42);
    if (rand() < 0.72) ctx.fillRect(bx, y, bw, h);
    bx += bw + Math.max(1, w / 42);
  }
}

// ---------------------------------------------------------------- the cover

// Draw the whole cover into ctx at W x H.
// state: { layout, grade, title, tagline, eyebrow, quote, source, band,
//          panels: [{ photo, tag, tagPos, zoom, panX, panY }] }
// images: Map from photo id to a loaded HTMLImageElement (or null).
// boxes: optional array collecting {name, x, y, w, h} for measured text.
export function drawCover(ctx, W, H, state, images, boxes) {
  const f = furniture(H);
  const panels = layoutPanels(state.layout, W, H);
  const gap = Math.max(3, Math.round(0.004 * W));

  // Backdrop: cream shows through the panel gaps.
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, H);

  // Photos, one grade over every panel.
  for (let i = 0; i < panels.length; i++) {
    const p = state.panels[i];
    const img = p ? images.get(p.photo) : null;
    drawPhoto(ctx, panels[i], img || null, p || {}, state.grade || 'warm', state.layout);
  }

  // Diagonal dividers: cream slashes between the leaning panels.
  if (state.layout === 'diagonal') {
    ctx.strokeStyle = CREAM;
    ctx.lineWidth = Math.max(3, 0.006 * W);
    ctx.lineCap = 'butt';
    for (const bx of [W / 3, (2 * W) / 3]) {
      const slant = 0.1 * f.photoH;
      ctx.beginPath();
      ctx.moveTo(bx + slant / 2, f.photoTop);
      ctx.lineTo(bx - slant / 2, f.photoBottom);
      ctx.stroke();
    }
  }

  // Skyline along the bottom edge of the photos, under the cast tags.
  drawSkyline(ctx, W, f.photoBottom, 0.036 * H);

  // Cast tags: bottom-left of each panel, or top for diagonal panels.
  // A top tag on the first panel sits right of the VOL. 01 tape.
  const tapeW = 0.135 * Math.min(W, H);
  for (let i = 0; i < panels.length; i++) {
    const p = state.panels[i];
    if (!p || !p.tag) continue;
    const panel = panels[i];
    const topTag = state.layout === 'diagonal' || p.tagPos === 'top';
    let tx;
    if (state.layout === 'diagonal') {
      const yRef = topTag ? panel.y + 0.02 * H : panel.y + panel.h - 0.06 * H;
      const leftAt = i === 0 ? 0 : panel.left + panel.slant * (0.5 - (yRef - f.photoTop) / f.photoH);
      tx = leftAt + 0.012 * W;
    } else {
      tx = panel.x + 0.012 * W;
    }
    if (i === 0 && topTag) tx += tapeW + 0.01 * W;
    const size = 0.022 * H;
    const tagH = size + 0.64 * size;
    const ty = topTag ? panel.y + 0.016 * H : panel.y + panel.h - tagH - 0.008 * H;
    drawTag(ctx, tx, ty, p.tag, H, W, boxes, `tag${i + 1}:${p.tag}`);
  }

  // VOL. 01 tape on the first panel.
  const minSide = Math.min(W, H);
  drawTape(
    ctx,
    0.012 * W,
    f.photoTop + 0.016 * H,
    0.135 * minSide,
    0.055 * minSide,
    'VOL. 01',
    boxes,
  );

  // EST. 2026 seal at the lower right of the photo area.
  const sealR = 0.044 * minSide;
  drawSeal(ctx, W - 0.038 * W, f.photoBottom - 0.058 * H, sealR, boxes);

  // Title + tagline, anchored above the skyline: the tagline pill sits a
  // small gap above the photos' bottom edge, the title directly above it.
  const titleText = (state.title || '').toUpperCase();
  const taglineText = state.tagline || '';
  const taglineSize0 = 0.052 * H;
  ctx.font = `${taglineSize0}px Pacifico, cursive`;
  let taglineSize = taglineSize0;
  if (taglineText) {
    taglineSize = fitFont(ctx, taglineText, taglineSize0, 0.6 * W, 'Pacifico, cursive');
  }
  const pillPadX = 0.028 * W;
  const pillPadY = 0.008 * H;
  ctx.font = `${taglineSize}px Pacifico, cursive`;
  const taglineW = taglineText ? ctx.measureText(taglineText).width : 0;
  const pillW = taglineW + pillPadX * 2;
  const pillH = taglineSize * 1.05 + pillPadY * 2;
  const pillBottom = f.photoBottom - 0.04 * H;
  const pillTop = pillBottom - pillH;
  const pillX = (W - pillW) / 2;

  // Title: striped retro chrome (gold to pink), dark outline, THICK white
  // halo, no drop shadow. Sized to fill 70% of the cover width.
  let titleSize = 0.22 * H;
  if (titleText) {
    titleSize = fitFont(ctx, titleText, 0.22 * H, 0.7 * W, 'Anton, sans-serif');
  }
  const titleBottom = pillTop - 0.01 * H;
  const titleTop = titleBottom - titleSize * 1.05;
  if (titleText) {
    const grad = ctx.createLinearGradient(0, titleTop, 0, titleBottom);
    grad.addColorStop(0, '#fff6bf');
    grad.addColorStop(0.25, '#ffd94d');
    grad.addColorStop(0.3, '#ffb347');
    grad.addColorStop(0.5, '#ff9a3c');
    grad.addColorStop(0.55, '#ff8a3c');
    grad.addColorStop(0.68, '#ff6a5e');
    grad.addColorStop(0.72, '#ff5e7a');
    grad.addColorStop(0.85, '#ff2e88');
    grad.addColorStop(1, '#d63384');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.font = `${titleSize}px Anton, sans-serif`;
    // Thick white halo first, then the dark outline, then the chrome fill.
    ctx.strokeStyle = WHITE;
    ctx.lineWidth = titleSize * 0.16;
    ctx.strokeText(titleText, W / 2, titleBottom);
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = titleSize * 0.055;
    ctx.strokeText(titleText, W / 2, titleBottom);
    ctx.fillStyle = grad;
    ctx.fillText(titleText, W / 2, titleBottom);
    if (boxes) {
      const tw = ctx.measureText(titleText).width;
      boxes.push({
        name: 'title',
        x: W / 2 - tw / 2 - titleSize * 0.1,
        y: titleTop - titleSize * 0.08,
        w: tw + titleSize * 0.2,
        h: titleSize * 1.2,
      });
    }
  }

  // Tagline on its own dark scrim pill BELOW the title, never overlapping.
  if (taglineText) {
    ctx.fillStyle = 'rgba(13, 6, 24, 0.88)';
    roundRectPath(ctx, pillX, pillTop, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${taglineSize}px Pacifico, cursive`;
    ctx.fillText(taglineText, W / 2, pillTop + pillH / 2 + taglineSize * 0.05);
    if (boxes) {
      boxes.push({ name: 'tagline', x: pillX, y: pillTop, w: pillW, h: pillH });
    }
  }

  // Quote bar: 5 gold stars + white serif italic quote + gold caps source.
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, f.quote);
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, f.quote - Math.max(1.5, 0.002 * H), W, Math.max(1.5, 0.002 * H));
  {
    const stars = '★★★★★';
    const quoteText = state.quote ? `“${state.quote}”` : '';
    const sourceText = state.source ? `— ${state.source.toUpperCase()}` : '';
    let starSize = 0.034 * H;
    let quoteSize = 0.03 * H;
    let sourceSize = 0.027 * H;
    const lineWidth = () => {
      ctx.font = `${starSize}px Georgia, serif`;
      const a = ctx.measureText(stars).width;
      ctx.font = `italic ${quoteSize}px Georgia, serif`;
      const b = ctx.measureText(quoteText).width;
      ctx.font = `700 ${sourceSize}px Arial, Helvetica, sans-serif`;
      const c = ctx.measureText(sourceText).width;
      return a + b + c + 0.05 * W;
    };
    let guard = 0;
    while (lineWidth() > 0.96 * W && guard < 40) {
      starSize *= 0.96;
      quoteSize *= 0.96;
      sourceSize *= 0.96;
      guard++;
    }
    const total = lineWidth();
    let cx = (W - total) / 2;
    const cy = f.quote / 2;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = GOLD;
    ctx.font = `${starSize}px Georgia, serif`;
    ctx.fillText(stars, cx, cy + starSize * 0.04);
    const starsW = ctx.measureText(stars).width;
    if (boxes) boxes.push({ name: 'stars', x: cx, y: cy - starSize * 0.5, w: starsW, h: starSize });
    cx += starsW + 0.016 * W;
    ctx.fillStyle = WHITE;
    ctx.font = `italic ${quoteSize}px Georgia, serif`;
    ctx.fillText(quoteText, cx, cy);
    const quoteW = ctx.measureText(quoteText).width;
    if (boxes) boxes.push({ name: 'quote', x: cx, y: cy - quoteSize * 0.5, w: quoteW, h: quoteSize });
    cx += quoteW + 0.016 * W;
    ctx.fillStyle = GOLD;
    ctx.font = `700 ${sourceSize}px Arial, Helvetica, sans-serif`;
    try { ctx.letterSpacing = `${0.08 * sourceSize}px`; } catch { /* ignore */ }
    ctx.fillText(sourceText, cx, cy);
    const sourceW = ctx.measureText(sourceText).width;
    try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
    if (boxes) boxes.push({ name: 'source', x: cx, y: cy - sourceSize * 0.5, w: sourceW, h: sourceSize });
    if (boxes) boxes.push({ name: 'quotebar', x: 0, y: 0, w: W, h: f.quote });
  }

  // Tag band: sunset gradient with the tag strip in a dark pill, or a dark
  // band with the strip straight on it. The sun icon sits at the left.
  const bandTop = f.photoBottom;
  const bandH = f.band;
  if (state.band === 'dark') {
    ctx.fillStyle = NAVY;
    ctx.fillRect(0, bandTop, W, bandH);
    drawSun(ctx, 0.045 * W, bandTop + bandH / 2, 0.39 * bandH, NAVY);
  } else {
    const g = ctx.createLinearGradient(0, bandTop, W, bandTop);
    g.addColorStop(0, '#ff9a3c');
    g.addColorStop(0.45, '#ff5e7a');
    g.addColorStop(0.75, '#c94b9e');
    g.addColorStop(1, '#7b2ff7');
    ctx.fillStyle = g;
    ctx.fillRect(0, bandTop, W, bandH);
    drawSun(ctx, 0.035 * W, bandTop + bandH / 2, 0.33 * bandH, 'rgba(21, 10, 46, 0.9)');
  }
  {
    const strip = (state.eyebrow || '').toUpperCase();
    const size0 = 0.026 * H;
    const size = fitFont(ctx, strip, size0, 0.78 * W, 'Anton, sans-serif');
    ctx.font = `${size}px Anton, sans-serif`;
    try { ctx.letterSpacing = `${0.16 * size}px`; } catch { /* ignore */ }
    const tw = ctx.measureText(strip).width;
    const cx = W / 2;
    const cy = bandTop + bandH / 2;
    if (state.band === 'dark') {
      ctx.fillStyle = GOLD;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(strip, cx, cy + size * 0.04);
      if (boxes) boxes.push({ name: 'tagstrip', x: cx - tw / 2, y: cy - size * 0.6, w: tw, h: size * 1.2 });
    } else {
      const padX = 0.025 * W;
      const padY = 0.32 * size;
      const pw = tw + padX * 2;
      const ph2 = size + padY * 2;
      ctx.fillStyle = 'rgba(13, 6, 24, 0.88)';
      roundRectPath(ctx, cx - pw / 2, cy - ph2 / 2, pw, ph2, ph2 / 2);
      ctx.fill();
      ctx.fillStyle = GOLD;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(strip, cx, cy + size * 0.04);
      if (boxes) boxes.push({ name: 'tagstrip', x: cx - pw / 2, y: cy - ph2 / 2, w: pw, h: ph2 });
    }
    try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  }

  // Billing strip: COMING SOON in pink at the left, the billing line in
  // WHITE BOLD at the centre, the barcode at the right.
  const billTop = bandTop + bandH;
  const billH = f.billing;
  ctx.fillStyle = NAVY_DEEP;
  ctx.fillRect(0, billTop, W, billH);
  const comingSize = 0.024 * H;
  ctx.font = `700 ${comingSize}px Arial, Helvetica, sans-serif`;
  try { ctx.letterSpacing = `${0.06 * comingSize}px`; } catch { /* ignore */ }
  const comingW = ctx.measureText('COMING SOON').width;
  ctx.fillStyle = PINK;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('COMING SOON', 0.015 * W, billTop + billH / 2 + comingSize * 0.04);
  if (boxes) {
    boxes.push({ name: 'comingsoon', x: 0.015 * W, y: billTop + billH / 2 - comingSize * 0.6, w: comingW, h: comingSize * 1.2 });
  }
  const barcodeW = 0.045 * W;
  const barcodeX = W - 0.015 * W - barcodeW;
  drawBarcode(ctx, barcodeX, billTop + billH * 0.22, barcodeW, billH * 0.56);
  const billingText = 'SUNSET VICE PRESENTS • STARRING YOUR CREW • SHOT ON YOUR OWN CAMERA • NOTHING UPLOADED';
  const availW = barcodeX - 0.02 * W - (0.015 * W + comingW + 0.03 * W);
  const billSize = fitFont(ctx, billingText, 0.018 * H, availW, 'Arial, Helvetica, sans-serif', '700');
  ctx.font = `700 ${billSize}px Arial, Helvetica, sans-serif`;
  try { ctx.letterSpacing = `${0.1 * billSize}px`; } catch { /* ignore */ }
  const billW = ctx.measureText(billingText).width;
  const billX = 0.015 * W + comingW + 0.03 * W + (availW - billW) / 2;
  ctx.fillStyle = WHITE;
  ctx.textAlign = 'left';
  ctx.fillText(billingText, billX, billTop + billH / 2 + billSize * 0.04);
  try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  if (boxes) {
    boxes.push({ name: 'billing', x: billX, y: billTop + billH / 2 - billSize * 0.6, w: billW, h: billSize * 1.2 });
  }
}

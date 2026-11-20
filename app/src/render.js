// Sunset Vice cover engine: one renderer draws the live preview, the
// exported PNGs and the screenshots, so what the editor shows is exactly
// what a person shares. Every cover is built from the same parts: a press
// quote bar, photo panels in one of four layouts, striped chrome lettering,
// a script tagline on its own dark pill, a skyline, a sunset tag band and a
// billing strip. Nothing here reaches the network; photos and fonts are
// local files under app/.

export const SAMPLE_PHOTOS = [
  { key: 'boulevard', label: 'Boulevard' },
  { key: 'pier', label: 'Pier' },
  { key: 'convertible', label: 'Convertible' },
  { key: 'motel', label: 'Motel' },
  { key: 'helicopter', label: 'Helicopter' },
  { key: 'alligator', label: 'Alligator' },
];

export const SIZES = {
  square: { w: 1080, h: 1080, label: 'Square 1080×1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait 1080×1350' },
  landscape: { w: 1920, h: 1080, label: 'Landscape 1920×1080' },
};

export const LAYOUTS = {
  grid3: { name: '3 × 3 Grid', count: 9 },
  hero2: { name: 'Hero + 2', count: 3 },
  big4: { name: '1 big + 4', count: 5 },
  diagonal: { name: 'Diagonal', count: 3 },
};

// Grades are canvas filter strings plus a translucent wash. Warm Sunset is
// the house grade: a light golden wash over natural colours, never a
// duotone that flattens the photos.
export const GRADES = {
  warm: { name: 'Warm Sunset', filter: 'saturate(1.12) contrast(1.04) sepia(0.12)', wash: 'rgba(255,140,50,0.06)' },
  neon: { name: 'Neon Night', filter: 'saturate(1.5) contrast(1.1) hue-rotate(-18deg)', wash: 'rgba(120,40,180,0.10)' },
  gold: { name: 'Vice Gold', filter: 'sepia(0.45) saturate(1.3) contrast(1.05)', wash: 'rgba(255,180,40,0.08)' },
  noir: { name: 'Mono Noir', filter: 'grayscale(1) contrast(1.15)', wash: 'rgba(0,0,0,0.05)' },
  natural: { name: 'Natural', filter: 'saturate(1.05)', wash: 'rgba(0,0,0,0)' },
};

export const BILLING_LINE = 'SUNSET VICE PRESENTS • STARRING YOUR CREW • SHOT ON YOUR OWN CAMERA • NOTHING UPLOADED';

// The three house covers. A panel names a sample photo, a cast tag, a focus
// point (0..1 across the photo) and a zoom; repeats of one photo use a
// different focus so they read as different shots.
export const COVER_PRESETS = {
  palm: {
    title: 'PALM ROYALE',
    tagline: 'Live fast, shine brighter',
    eyebrow: 'ONE CREW • SIX STORIES • ALL GOLDEN HOUR',
    quote: 'A love letter to the golden hour',
    quoteSource: 'THE COAST REVIEW',
    layout: 'big4',
    grade: 'warm',
    band: 'sunset',
    sizeKey: 'landscape',
    sealPanel: 4,
    panels: [
      { photo: 'boulevard', tag: 'THE DRIVER', cx: 0.5, cy: 0.12, zoom: 1 },
      { photo: 'pier', tag: 'THE ANGLER', cx: 0.5, cy: 0.3, zoom: 1 },
      { photo: 'convertible', tag: 'THE GETAWAY', cx: 0.6, cy: 0.55, zoom: 1 },
      { photo: 'motel', tag: 'THE MOTEL', cx: 0.65, cy: 0.4, zoom: 1 },
      { photo: 'helicopter', tag: 'THE CHOPPER', cx: 0.5, cy: 0.45, zoom: 1 },
    ],
  },
  tidewater: {
    title: 'TIDEWATER',
    tagline: 'After dark, the city glows',
    eyebrow: 'NINE LIVES • ONE HARBOR • ALL TRUE',
    quote: 'Salt air and neon in every frame',
    quoteSource: 'THE BAY HERALD',
    layout: 'grid3',
    grade: 'warm',
    band: 'dark',
    sizeKey: 'portrait',
    sealPanel: 8,
    panels: [
      { photo: 'pier', tag: 'THE ANGLER', cx: 0.5, cy: 0.3, zoom: 1 },
      { photo: 'boulevard', tag: 'THE DRIVER', cx: 0.5, cy: 0.35, zoom: 1 },
      { photo: 'helicopter', tag: 'THE CHOPPER', cx: 0.5, cy: 0.4, zoom: 1 },
      { photo: 'convertible', tag: 'THE GETAWAY', cx: 0.6, cy: 0.55, zoom: 1 },
      { photo: 'alligator', tag: 'THE GATOR', cx: 0.5, cy: 0.6, zoom: 1 },
      { photo: 'motel', tag: 'THE MOTEL', cx: 0.65, cy: 0.4, zoom: 1 },
      { photo: 'boulevard', tag: 'THE LOOKOUT', cx: 0.62, cy: 0.45, zoom: 1.25 },
      { photo: 'pier', tag: 'THE CAPTAIN', cx: 0.35, cy: 0.65, zoom: 1.35 },
      { photo: 'convertible', tag: 'THE RIDER', cx: 0.65, cy: 0.62, zoom: 1.3 },
    ],
  },
  golden: {
    title: 'GOLDEN HOUR',
    tagline: 'Chase the light',
    eyebrow: 'THREE SHORES • ONE LONG EVENING',
    quote: 'Every frame smells like salt and gasoline',
    quoteSource: 'THE COAST REVIEW',
    layout: 'diagonal',
    grade: 'warm',
    band: 'sunset',
    sizeKey: 'square',
    sealPanel: 2,
    panels: [
      { photo: 'convertible', tag: 'THE GETAWAY', cx: 0.62, cy: 0.55, zoom: 1, tagTop: true },
      { photo: 'pier', tag: 'THE ANGLER', cx: 0.5, cy: 0.18, zoom: 1.4, tagTop: true },
      { photo: 'boulevard', tag: 'THE DRIVER', cx: 0.5, cy: 0.3, zoom: 1, tagTop: true },
    ],
  },
};

// Small deterministic random stream, so the skyline is identical on every
// render of a cover at any size.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Panel rectangles for the three straight layouts, inside the photo area.
export function layoutPanels(layout, x, y, w, h) {
  const g = Math.max(3, Math.round(w * 0.004));
  const rects = [];
  if (layout === 'grid3') {
    const cw = (w - g * 2) / 3;
    const ch = (h - g * 2) / 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        rects.push({ x: x + c * (cw + g), y: y + r * (ch + g), w: cw, h: ch });
      }
    }
    return rects;
  }
  if (layout === 'hero2') {
    const heroW = Math.round(w * 0.66);
    const sideX = x + heroW + g;
    const sideW = w - heroW - g;
    const sh = (h - g) / 2;
    return [
      { x, y, w: heroW, h },
      { x: sideX, y, w: sideW, h: sh },
      { x: sideX, y: y + sh + g, w: sideW, h: sh },
    ];
  }
  // big4: one hero panel left, four small panels in a 2x2 block right.
  const heroW = Math.round(w * 0.62);
  const sideX = x + heroW + g;
  const sideW = w - heroW - g;
  const sw = (sideW - g) / 2;
  const sh = (h - g) / 2;
  return [
    { x, y, w: heroW, h },
    { x: sideX, y, w: sw, h: sh },
    { x: sideX + sw + g, y, w: sw, h: sh },
    { x: sideX, y: y + sh + g, w: sw, h: sh },
    { x: sideX + sw + g, y: y + sh + g, w: sw, h: sh },
  ];
}

// Diagonal layout: three slanted strips. Each entry is a polygon of four
// points (top-left, top-right, bottom-right, bottom-left) plus its bounding
// box for hit-testing and tags.
export function diagonalPolys(x, y, w, h) {
  const s = w * 0.045;
  const b1 = x + w / 3;
  const b2 = x + (w * 2) / 3;
  const polys = [
    [
      [x, y],
      [b1 + s, y],
      [b1 - s, y + h],
      [x, y + h],
    ],
    [
      [b1 + s, y],
      [b2 + s, y],
      [b2 - s, y + h],
      [b1 - s, y + h],
    ],
    [
      [b2 + s, y],
      [x + w, y],
      [x + w, y + h],
      [b2 - s, y + h],
    ],
  ];
  return polys.map((pts) => {
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    return {
      pts,
      box: { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) },
    };
  });
}

function drawPhotoInto(ctx, img, rect, panel, grade) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const scale = base * (panel.zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  let dx = rect.x + (rect.w - dw) * (panel.cx ?? 0.5);
  let dy = rect.y + (rect.h - dh) * (panel.cy ?? 0.5);
  dx = Math.min(rect.x, Math.max(rect.x + rect.w - dw, dx));
  dy = Math.min(rect.y, Math.max(rect.y + rect.h - dh, dy));
  // Clip to the panel: without this the photo bleeds over the quote bar,
  // the neighbouring panels and the lettering.
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.save();
  ctx.filter = grade.filter;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  if (grade.wash && grade.wash !== 'rgba(0,0,0,0)') {
    ctx.fillStyle = grade.wash;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.restore();
}

function drawCastTag(ctx, text, x, y, size, boxes, alignTop) {
  ctx.save();
  ctx.font = `700 ${size}px Arial, Helvetica, sans-serif`;
  try {
    ctx.letterSpacing = '1px';
  } catch (e) { /* older canvas: no letter spacing */ }
  const tw = ctx.measureText(text).width;
  const bar = Math.max(3, size * 0.28);
  const padX = size * 0.7;
  const w = bar + padX * 2 + tw;
  const h = size * 1.95;
  ctx.fillStyle = 'rgba(10,3,20,0.88)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(x, y, bar, h);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(text, x + bar + padX, y + h / 2 + size * 0.04);
  if (boxes) boxes.push({ label: `tag:${text}`, x, y, w, h });
  ctx.restore();
  return { x, y, w, h };
}

function starburstPath(ctx, cx, cy, outer, inner, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawSeal(ctx, cx, cy, r, boxes) {
  ctx.save();
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#ffe98a');
  g.addColorStop(0.6, '#ffc93c');
  g.addColorStop(1, '#f0a020');
  starburstPath(ctx, cx, cy, r, r * 0.8, 12);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.strokeStyle = '#8a5a00';
  ctx.stroke();
  ctx.fillStyle = '#40260a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${r * 0.36}px Arial, Helvetica, sans-serif`;
  ctx.fillText('EST.', cx, cy - r * 0.2);
  ctx.font = `700 ${r * 0.4}px Arial, Helvetica, sans-serif`;
  ctx.fillText('2026', cx, cy + r * 0.24);
  if (boxes) boxes.push({ label: 'seal', x: cx - r * 0.62, y: cy - r * 0.5, w: r * 1.24, h: r });
  ctx.restore();
}

function drawTape(ctx, x, y, size, boxes) {
  ctx.save();
  ctx.font = `700 ${size}px Arial, Helvetica, sans-serif`;
  try {
    ctx.letterSpacing = '2px';
  } catch (e) { /* older canvas */ }
  const tw = ctx.measureText('VOL. 01').width;
  const w = tw + size * 1.5;
  const h = size * 2;
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(-0.07);
  ctx.fillStyle = '#ffd94a';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.lineWidth = Math.max(1, size * 0.09);
  ctx.strokeStyle = '#a87c00';
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = '#241505';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VOL. 01', 0, size * 0.05);
  ctx.restore();
  if (boxes) boxes.push({ label: 'tape', x, y, w, h });
}

function drawSunIcon(ctx, cx, cy, r) {
  ctx.save();
  const g = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  g.addColorStop(0, '#ffe27a');
  g.addColorStop(0.55, '#ffb347');
  g.addColorStop(1, '#ff7a3d');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = 'rgba(42,16,64,0.9)';
  const slits = [0.05, 0.38, 0.68];
  slits.forEach((f, i) => {
    const sy = cy + r * (f - 0.15);
    ctx.fillRect(cx - r, sy, r * 2, r * (0.12 + i * 0.03));
  });
  ctx.restore();
}

function drawSkyline(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = '#150826';
  const rand = mulberry32(20261119);
  let bx = x;
  while (bx < x + w) {
    const bw = (14 + rand() * 34) * (w / 1280);
    const bh = h * (0.3 + rand() * 0.7);
    ctx.fillRect(bx, y + h - bh, bw, bh);
    const windows = Math.floor(rand() * 4);
    ctx.fillStyle = 'rgba(255,215,106,0.9)';
    for (let i = 0; i < windows; i++) {
      const wx = bx + 2 + rand() * Math.max(1, bw - 5);
      const wy = y + h - bh + 3 + rand() * Math.max(1, bh - 7);
      ctx.fillRect(wx, wy, 2.5, 3.5);
    }
    ctx.fillStyle = '#150826';
    bx += bw + 2 * (w / 1280);
  }
  // Two small palm silhouettes at the edges.
  const palm = (px, flip) => {
    ctx.save();
    ctx.translate(px, y + h);
    ctx.scale(flip ? -1 : 1, 1);
    ctx.strokeStyle = '#150826';
    ctx.lineWidth = Math.max(2, h * 0.09);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(3, -h * 0.7, 8, -h * 1.05);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.5, h * 0.06);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * (0.15 + i * 0.18);
      ctx.beginPath();
      ctx.moveTo(8, -h * 1.05);
      ctx.quadraticCurveTo(8 + Math.cos(a) * h * 0.55, -h * 1.05 + Math.sin(a) * h * 0.5, 8 + Math.cos(a) * h * 0.8, -h * 1.05 + Math.sin(a) * h * 0.7 + h * 0.25);
      ctx.stroke();
    }
    ctx.restore();
  };
  palm(x + w * 0.012, false);
  palm(x + w * 0.988, true);
  ctx.restore();
}

function drawBarcode(ctx, x, y, w, h) {
  const pattern = [3, 1, 2, 1, 1, 3, 1, 2, 4, 1, 1, 2, 1, 3, 2, 1, 1, 4, 1, 2];
  const total = pattern.reduce((a, b) => a + b, 0) + pattern.length;
  const unit = w / total;
  let bx = x;
  ctx.fillStyle = '#ffffff';
  pattern.forEach((bw, i) => {
    if (i % 2 === 0) ctx.fillRect(bx, y, bw * unit, h);
    bx += (bw + 1) * unit;
  });
}

// The chrome title: striped sunset fill, a dark outline and a thick white
// halo outside it, no drop shadow. Drawn on an offscreen canvas so thin
// shine stripes can be clipped to the letterforms.
function drawChromeTitle(ctx, text, cx, baselineY, fontPx, boxes) {
  const off = document.createElement('canvas');
  const m = document.createElement('canvas').getContext('2d');
  m.font = `${fontPx}px Anton, 'Arial Narrow', sans-serif`;
  const tw = m.measureText(text).width;
  const pad = Math.ceil(fontPx * 0.22) + 4;
  off.width = Math.ceil(tw + pad * 2);
  off.height = Math.ceil(fontPx * 1.7);
  const o = off.getContext('2d');
  o.font = `${fontPx}px Anton, 'Arial Narrow', sans-serif`;
  o.textAlign = 'left';
  o.textBaseline = 'alphabetic';
  const tx = pad;
  const ty = fontPx * 1.18;
  o.lineJoin = 'round';
  o.miterLimit = 2;
  o.strokeStyle = '#ffffff';
  o.lineWidth = fontPx * 0.2;
  o.strokeText(text, tx, ty);
  o.strokeStyle = '#241031';
  o.lineWidth = fontPx * 0.085;
  o.strokeText(text, tx, ty);
  const g = o.createLinearGradient(0, ty - fontPx * 0.78, 0, ty + fontPx * 0.22);
  g.addColorStop(0, '#fff6ae');
  g.addColorStop(0.28, '#ffd23e');
  g.addColorStop(0.3, '#ff9e2c');
  g.addColorStop(0.52, '#ff7a3d');
  g.addColorStop(0.54, '#ff4d6d');
  g.addColorStop(0.78, '#f43f8e');
  g.addColorStop(0.8, '#d63384');
  g.addColorStop(1, '#b3127e');
  o.fillStyle = g;
  o.fillText(text, tx, ty);
  o.globalCompositeOperation = 'source-atop';
  o.fillStyle = 'rgba(255,255,255,0.28)';
  o.fillRect(0, ty - fontPx * 0.72, off.width, Math.max(2, fontPx * 0.03));
  o.fillStyle = 'rgba(255,255,255,0.10)';
  for (let f = 0.32; f < 0.95; f += 0.21) {
    o.fillRect(0, ty - fontPx * 0.78 + fontPx * f, off.width, Math.max(1, fontPx * 0.014));
  }
  o.fillStyle = 'rgba(60,0,40,0.10)';
  for (let f = 0.42; f < 0.95; f += 0.21) {
    o.fillRect(0, ty - fontPx * 0.78 + fontPx * f, off.width, Math.max(1, fontPx * 0.014));
  }
  o.globalCompositeOperation = 'source-over';
  const dx = Math.round(cx - off.width / 2);
  const dy = Math.round(baselineY - ty);
  ctx.drawImage(off, dx, dy);
  if (boxes) {
    boxes.push({ label: 'title', x: dx + pad, y: baselineY - fontPx * 0.8, w: tw, h: fontPx });
  }
  return { x: dx + pad, y: baselineY - fontPx * 0.8, w: tw, h: fontPx };
}

function drawTaglinePill(ctx, text, cx, topY, size, boxes) {
  ctx.save();
  ctx.font = `${size}px Pacifico, cursive`;
  const tw = ctx.measureText(text).width;
  const padX = size * 0.85;
  const padY = size * 0.42;
  const w = tw + padX * 2;
  const h = size + padY * 2;
  const x = cx - w / 2;
  roundRectPath(ctx, x, topY, w, h, h / 2);
  ctx.fillStyle = 'rgba(18,6,28,0.92)';
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, topY + h / 2 + size * 0.05);
  if (boxes) boxes.push({ label: 'tagline', x, y: topY, w, h });
  ctx.restore();
  return { x, y: topY, w, h };
}

function drawQuoteBar(ctx, cover, W, qh, boxes) {
  ctx.save();
  ctx.fillStyle = '#140a24';
  ctx.fillRect(0, 0, W, qh);
  ctx.fillStyle = '#d4a017';
  ctx.fillRect(0, qh - 2, W, 2);
  const stars = '★★★★★';
  const quote = `“${cover.quote}”`;
  const source = `— ${cover.quoteSource}`;
  let fs = qh * 0.5;
  const gap = fs * 0.6;
  const measure = (size) => {
    ctx.font = `700 ${size}px Arial, Helvetica, sans-serif`;
    const sw = ctx.measureText(stars).width;
    ctx.font = `italic ${size}px Georgia, 'Times New Roman', serif`;
    const qw = ctx.measureText(quote).width;
    ctx.font = `700 ${size * 0.88}px Arial, Helvetica, sans-serif`;
    const ow = ctx.measureText(source).width;
    return { sw, qw, ow, total: sw + qw + ow + gap * 2 };
  };
  let m = measure(fs);
  while (m.total > W * 0.97 && fs > 8) {
    fs *= 0.94;
    m = measure(fs);
  }
  let x = (W - m.total) / 2;
  const cy = qh / 2;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = `700 ${fs}px Arial, Helvetica, sans-serif`;
  ctx.fillStyle = '#ffc21a';
  ctx.fillText(stars, x, cy + fs * 0.04);
  if (boxes) boxes.push({ label: 'stars', x, y: cy - fs * 0.5, w: m.sw, h: fs });
  x += m.sw + gap;
  ctx.font = `italic ${fs}px Georgia, 'Times New Roman', serif`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(quote, x, cy + fs * 0.04);
  if (boxes) boxes.push({ label: 'quote', x, y: cy - fs * 0.5, w: m.qw, h: fs });
  x += m.qw + gap;
  ctx.font = `700 ${fs * 0.88}px Arial, Helvetica, sans-serif`;
  ctx.fillStyle = '#ffc21a';
  ctx.fillText(source, x, cy + fs * 0.04);
  if (boxes) boxes.push({ label: 'quote-source', x, y: cy - fs * 0.44, w: m.ow, h: fs * 0.88 });
  ctx.restore();
}

function drawTagBand(ctx, cover, W, y, h, boxes) {
  ctx.save();
  if (cover.band === 'dark') {
    ctx.fillStyle = '#140a24';
    ctx.fillRect(0, y, W, h);
  } else {
    const g = ctx.createLinearGradient(0, y, W, y);
    g.addColorStop(0, '#ff9a3d');
    g.addColorStop(0.35, '#ff5e7a');
    g.addColorStop(0.7, '#c44fd8');
    g.addColorStop(1, '#7c3aed');
    ctx.fillStyle = g;
    ctx.fillRect(0, y, W, h);
  }
  drawSunIcon(ctx, W * 0.045, y + h / 2, h * 0.34);
  ctx.font = `700 ${h * 0.42}px Arial, Helvetica, sans-serif`;
  try {
    ctx.letterSpacing = '3px';
  } catch (e) { /* older canvas */ }
  const tw = ctx.measureText(cover.eyebrow).width;
  const cx = W / 2;
  if (cover.band === 'dark') {
    ctx.fillStyle = '#ffc94d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cover.eyebrow, cx, y + h / 2 + h * 0.03);
    if (boxes) boxes.push({ label: 'tagstrip', x: cx - tw / 2, y: y + h * 0.2, w: tw, h: h * 0.6 });
  } else {
    const padX = h * 0.55;
    const padY = h * 0.16;
    const w = tw + padX * 2;
    const ph = h * 0.68;
    const x = cx - w / 2;
    const py = y + (h - ph) / 2;
    roundRectPath(ctx, x, py, w, ph, ph / 2);
    ctx.fillStyle = 'rgba(18,6,28,0.92)';
    ctx.fill();
    ctx.fillStyle = '#ffc94d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cover.eyebrow, cx, y + h / 2 + h * 0.03);
    if (boxes) boxes.push({ label: 'tagstrip', x, y: py, w, h: ph });
  }
  ctx.restore();
}

function drawBillingStrip(ctx, W, y, h, boxes) {
  ctx.save();
  ctx.fillStyle = '#0d0616';
  ctx.fillRect(0, y, W, h);
  // Pink COMING SOON, left.
  const soonSize = h * 0.46;
  ctx.font = `700 ${soonSize}px Arial, Helvetica, sans-serif`;
  try {
    ctx.letterSpacing = '1px';
  } catch (e) { /* older canvas */ }
  ctx.fillStyle = '#ff4d8d';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const soonX = W * 0.015;
  ctx.fillText('COMING SOON', soonX, y + h / 2 + soonSize * 0.04);
  const soonW = ctx.measureText('COMING SOON').width;
  if (boxes) boxes.push({ label: 'coming-soon', x: soonX, y: y + h * 0.2, w: soonW, h: h * 0.6 });
  // Barcode, right.
  const barW = W * 0.038;
  const barX = W * 0.955;
  drawBarcode(ctx, barX, y + h * 0.19, barW, h * 0.62);
  // Billing line, centre: WHITE BOLD on the near-black strip. Never grey:
  // this is small text and grey on dark fails the contrast standard.
  let bs = h * 0.36;
  const maxW = barX - W * 0.02 - (soonX + soonW + W * 0.03);
  ctx.font = `700 ${bs}px Arial, Helvetica, sans-serif`;
  let bw = ctx.measureText(BILLING_LINE).width;
  while (bw > maxW && bs > 6) {
    bs *= 0.95;
    ctx.font = `700 ${bs}px Arial, Helvetica, sans-serif`;
    bw = ctx.measureText(BILLING_LINE).width;
  }
  const midX = (soonX + soonW + barX) / 2;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(BILLING_LINE, midX, y + h / 2 + bs * 0.04);
  if (boxes) boxes.push({ label: 'billing', x: midX - bw / 2, y: y + h * 0.22, w: bw, h: h * 0.56 });
  ctx.restore();
}

// Draw one whole cover. `cover` holds the lettering, layout, grade and
// panels; `images` maps photo keys to loaded images; `boxes`, when given,
// collects the pixel box of every text element for contrast checks.
export function drawCover(ctx, cover, W, H, images, boxes) {
  const S = Math.min(W, H);
  const qh = Math.round(H * 0.056);
  const bandH = Math.round(H * 0.058);
  const billH = Math.round(H * 0.044);
  const photoTop = qh;
  const photoBottom = H - bandH - billH;
  const photoH = photoBottom - photoTop;
  const grade = GRADES[cover.grade] || GRADES.warm;

  ctx.save();
  ctx.fillStyle = '#f5e6c8';
  ctx.fillRect(0, 0, W, H);

  drawQuoteBar(ctx, cover, W, qh, boxes);

  const panels = cover.panels.slice(0, LAYOUTS[cover.layout].count);
  const skyH = H * 0.032;
  const sealRects = [];
  if (cover.layout === 'diagonal') {
    const polys = diagonalPolys(0, photoTop, W, photoH);
    panels.forEach((panel, i) => {
      const poly = polys[i];
      if (!poly) return;
      const img = images.get(panel.photo);
      ctx.save();
      ctx.beginPath();
      poly.pts.forEach((p, j) => (j === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
      ctx.closePath();
      ctx.clip();
      if (img) drawPhotoInto(ctx, img, poly.box, panel, grade);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      poly.pts.forEach((p, j) => (j === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
      ctx.closePath();
      ctx.lineWidth = Math.max(3, W * 0.004);
      ctx.strokeStyle = '#f5e6c8';
      ctx.stroke();
      ctx.restore();
      sealRects.push(poly.box);
    });
    // Skyline first, tags after, so no tag is ever buried under it.
    drawSkyline(ctx, 0, photoBottom - skyH, W, skyH);
    panels.forEach((panel, i) => {
      const poly = polys[i];
      if (!poly || !panel.tag) return;
      const tagSize = S * 0.021;
      let tx = poly.pts[0][0] + Math.max(6, W * 0.008);
      // The first panel's tag starts clear of the VOL. 01 tape.
      if (i === 0) tx = Math.max(tx, W * 0.14);
      const ty = panel.tagTop ? photoTop + Math.max(6, H * 0.008) : photoBottom - tagSize * 1.95 - Math.max(6, H * 0.008);
      drawCastTag(ctx, panel.tag, tx, ty, tagSize, boxes);
    });
  } else {
    const rects = layoutPanels(cover.layout, 0, photoTop, W, photoH);
    panels.forEach((panel, i) => {
      const rect = rects[i];
      if (!rect) return;
      const img = images.get(panel.photo);
      if (img) drawPhotoInto(ctx, img, rect, panel, grade);
      sealRects.push(rect);
    });
    drawSkyline(ctx, 0, photoBottom - skyH, W, skyH);
    panels.forEach((panel, i) => {
      const rect = rects[i];
      if (!rect || !panel.tag) return;
      const tagSize = S * 0.021;
      const tx = rect.x + Math.max(6, W * 0.006);
      const ty = panel.tagTop
        ? rect.y + Math.max(6, H * 0.008)
        : rect.y + rect.h - tagSize * 1.95 - Math.max(6, H * 0.008);
      drawCastTag(ctx, panel.tag, tx, ty, tagSize, boxes);
    });
  }

  // Chrome title, centred (a touch right on the hero layout, where the
  // hero panel leaves the middle of the cover open). The size is capped
  // both by the short side and by the width, so a portrait cover keeps the
  // same title proportions as a landscape one.
  const titleCx = cover.layout === 'big4' ? W * 0.55 : W / 2;
  let fontPx = Math.min(S * 0.21, W * 0.13);
  ctx.font = `${fontPx}px Anton, 'Arial Narrow', sans-serif`;
  const maxTitleW = W * 0.8;
  while (ctx.measureText(cover.title).width > maxTitleW && fontPx > S * 0.08) {
    fontPx *= 0.94;
    ctx.font = `${fontPx}px Anton, 'Arial Narrow', sans-serif`;
  }
  const baselineY = photoBottom - S * 0.16;
  drawChromeTitle(ctx, cover.title, titleCx, baselineY, fontPx, boxes);

  // Tagline on its own dark pill below the title, never overlapping it.
  drawTaglinePill(ctx, cover.tagline, titleCx, baselineY + S * 0.02, S * 0.042, boxes);

  // Tape label and gold seal.
  drawTape(ctx, W * 0.012, photoTop + H * 0.014, S * 0.024, boxes);
  const sealIdx = cover.sealPanel ?? panels.length - 1;
  const sealRect = sealRects[sealIdx] || sealRects[sealRects.length - 1];
  if (sealRect) {
    const r = S * 0.038;
    drawSeal(ctx, sealRect.x + sealRect.w - r * 1.2, sealRect.y + sealRect.h - r * 1.3, r, boxes);
  }

  drawTagBand(ctx, cover, W, photoBottom, bandH, boxes);
  drawBillingStrip(ctx, W, photoBottom + bandH, billH, boxes);

  // Thin cream frame around the photo area.
  ctx.strokeStyle = '#f5e6c8';
  ctx.lineWidth = Math.max(2, W * 0.002);
  ctx.strokeRect(1, photoTop + 1, W - 2, photoH - 2);
  ctx.restore();
}

// Find which panel a point in preview coordinates falls in.
export function panelAtPoint(cover, px, py, previewW, previewH, photoTop, photoH) {
  const count = LAYOUTS[cover.layout].count;
  if (cover.layout === 'diagonal') {
    const polys = diagonalPolys(0, photoTop, previewW, photoH);
    for (let i = 0; i < Math.min(count, polys.length); i++) {
      const b = polys[i].box;
      if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return i;
    }
    return -1;
  }
  const rects = layoutPanels(cover.layout, 0, photoTop, previewW, photoH);
  for (let i = 0; i < Math.min(count, rects.length); i++) {
    const r = rects[i];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}

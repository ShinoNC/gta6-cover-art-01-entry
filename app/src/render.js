// Canvas renderer: one draw function paints the live preview and the
// exported PNG, so screenshots always show what the app really makes.

export const SIZES = {
  square: { w: 1080, h: 1080, label: 'Square 1080×1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait 1080×1350' },
  landscape: { w: 1920, h: 1080, label: 'Landscape 1920×1080' },
};

export const SAMPLES = [
  { id: 'boulevard', name: 'Boulevard', role: 'THE DRIVER', file: 'samples/boulevard.jpg', fx: 0.5, fy: 0.38 },
  { id: 'pier', name: 'Pier', role: 'THE ANGLER', file: 'samples/pier.jpg', fx: 0.5, fy: 0.32 },
  { id: 'convertible', name: 'Convertible', role: 'THE GETAWAY', file: 'samples/convertible.jpg', fx: 0.5, fy: 0.45 },
  { id: 'motel', name: 'Motel', role: 'THE MOTEL', file: 'samples/motel.jpg', fx: 0.5, fy: 0.45 },
  { id: 'helicopter', name: 'Helicopter', role: 'THE CHOPPER', file: 'samples/helicopter.jpg', fx: 0.5, fy: 0.42 },
  { id: 'alligator', name: 'Alligator', role: 'THE GATOR', file: 'samples/alligator.jpg', fx: 0.5, fy: 0.55 },
];

export const GRADES = {
  warm: { name: 'Warm Sunset', filter: 'saturate(1.18) sepia(0.16) contrast(1.04)', wash: 'rgba(255,110,40,0.10)', mode: 'overlay' },
  duotone: { name: 'Sunset Duotone', filter: 'grayscale(1) contrast(1.12) brightness(1.03)', wash: null, duo: true },
  neon: { name: 'Neon Night', filter: 'saturate(1.35) hue-rotate(-18deg) contrast(1.06) brightness(0.96)', wash: 'rgba(120,40,200,0.16)', mode: 'overlay' },
  gold: { name: 'Vice Gold', filter: 'sepia(0.55) saturate(1.25) contrast(1.05)', wash: 'rgba(255,190,60,0.12)', mode: 'overlay' },
  noir: { name: 'Mono Noir', filter: 'grayscale(1) contrast(1.18)', wash: null },
};

export const PANEL_COUNT = { grid: 9, hero: 3, big4: 5, diagonal: 3 };

// Title centre as a fraction of cover height, per layout.
const TITLE_Y = { grid: 0.77, hero: 0.63, big4: 0.60, diagonal: 0.71 };

export function defaultPanels(layout) {
  const n = PANEL_COUNT[layout] ?? 5;
  const out = [];
  for (let i = 0; i < n; i++) {
    const s = SAMPLES[i % SAMPLES.length];
    out.push({ photo: s.id, role: s.role, zoom: 1, fx: s.fx, fy: s.fy });
  }
  return out;
}

export function sampleById(id) {
  return SAMPLES.find((s) => s.id === id) ?? SAMPLES[0];
}

// Bar metrics shared by the renderer and the editor's click mapping.
export function coverBars(W, H) {
  const quoteH = Math.round(H * 0.05);
  const billH = Math.round(H * 0.042);
  const bandH = Math.round(H * 0.052);
  const skyH = Math.round(H * 0.03);
  return { quoteH, billH, bandH, skyH, py0: quoteH, py1: H - bandH - billH };
}

export function panelRects(layout, x, y, w, h) {
  const g = Math.max(2, Math.round(w * 0.004));
  const rects = [];
  if (layout === 'grid') {
    const cw = (w - 2 * g) / 3, ch = (h - 2 * g) / 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        rects.push({ x: x + c * (cw + g), y: y + r * (ch + g), w: cw, h: ch });
      }
    }
    return rects;
  }
  if (layout === 'hero') {
    const hw = Math.round(w * 0.62);
    const rx = x + hw + g, rw = w - hw - g;
    const rh = (h - g) / 2;
    rects.push({ x, y, w: hw, h });
    rects.push({ x: rx, y, w: rw, h: rh });
    rects.push({ x: rx, y: y + rh + g, w: rw, h: rh });
    return rects;
  }
  if (layout === 'big4') {
    const hw = Math.round(w * 0.575);
    const rx = x + hw + g, rw = w - hw - g;
    const cw = (rw - g) / 2, ch = (h - g) / 2;
    rects.push({ x, y, w: hw, h });
    rects.push({ x: rx, y, w: cw, h: ch });
    rects.push({ x: rx + cw + g, y, w: cw, h: ch });
    rects.push({ x: rx, y: y + ch + g, w: cw, h: ch });
    rects.push({ x: rx + cw + g, y: y + ch + g, w: cw, h: ch });
    return rects;
  }
  // diagonal: three slanted panels; slant shifts the top edge right.
  const slant = w * 0.035;
  const pw = w / 3;
  for (let i = 0; i < 3; i++) {
    rects.push({ x: x + i * pw, y, w: pw, h, slant, tagTop: true });
  }
  return rects;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

function drawPhoto(ctx, img, x, y, w, h, panel, grade) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max(w / iw, h / ih) * (panel.zoom || 1);
  const dw = iw * scale, dh = ih * scale;
  let dx = x + w / 2 - (panel.fx ?? 0.5) * dw;
  let dy = y + h / 2 - (panel.fy ?? 0.5) * dh;
  dx = clamp(dx, x + w - dw, x);
  dy = clamp(dy, y + h - dh, y);
  ctx.save();
  if (grade.filter) ctx.filter = grade.filter;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  if (grade.duo) {
    const grad = ctx.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, 'rgba(255,150,40,0.85)');
    grad.addColorStop(0.55, 'rgba(255,80,120,0.85)');
    grad.addColorStop(1, 'rgba(150,40,180,0.85)');
    ctx.save();
    ctx.globalCompositeOperation = 'color';
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  } else if (grade.wash) {
    ctx.save();
    ctx.globalCompositeOperation = grade.mode || 'overlay';
    ctx.fillStyle = grade.wash;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }
}

function roleTag(ctx, x, y, text, fs) {
  ctx.font = `${fs}px Anton, sans-serif`;
  const tw = ctx.measureText(text).width;
  const padX = fs * 0.55, barW = Math.max(3, fs * 0.22);
  const w = barW + tw + padX * 2, h = fs * 1.7;
  ctx.save();
  rr(ctx, x, y, w, h, 2);
  ctx.fillStyle = 'rgba(12,6,24,0.88)';
  ctx.fill();
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(x, y, barW, h);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + barW + padX, y + h / 2 + fs * 0.04);
  ctx.restore();
}

function drawPanels(ctx, W, H, state, getImage) {
  const bars = coverBars(W, H);
  const rects = panelRects(state.layout, 0, bars.py0, W, bars.py1 - bars.py0);
  const grade = GRADES[state.grade] ?? GRADES.warm;
  const gap = Math.max(2, Math.round(W * 0.004));
  const lw = Math.max(2, W * 0.0022);
  const tagFs = Math.max(11, W * 0.016);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, bars.py0, W, bars.py1 - bars.py0);
  ctx.clip();
  rects.forEach((r, i) => {
    const panel = state.panels[i];
    if (!panel) return;
    const img = getImage(panel.photo);
    ctx.save();
    if (r.slant) {
      const s = r.slant;
      ctx.beginPath();
      ctx.moveTo(r.x + s + gap, r.y);
      ctx.lineTo(r.x + r.w + s - gap, r.y);
      ctx.lineTo(r.x + r.w - gap, r.y + r.h);
      ctx.lineTo(r.x + gap, r.y + r.h);
      ctx.closePath();
      ctx.clip();
      if (img) drawPhoto(ctx, img, r.x, r.y, r.w + s, r.h, panel, grade);
      else { ctx.fillStyle = '#2b1745'; ctx.fillRect(r.x, r.y, r.w + s, r.h); }
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(r.x + s + gap, r.y);
      ctx.lineTo(r.x + r.w + s - gap, r.y);
      ctx.lineTo(r.x + r.w - gap, r.y + r.h);
      ctx.lineTo(r.x + gap, r.y + r.h);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255,246,232,0.9)';
      ctx.lineWidth = lw;
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.rect(r.x, r.y, r.w, r.h);
      ctx.clip();
      if (img) drawPhoto(ctx, img, r.x, r.y, r.w, r.h, panel, grade);
      else { ctx.fillStyle = '#2b1745'; ctx.fillRect(r.x, r.y, r.w, r.h); }
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,246,232,0.95)';
      ctx.lineWidth = lw;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    }
  });
  ctx.restore();
}

// Cast tags in their own pass, after the skyline, so the skyline never
// covers a tag on the bottom row.
function drawRoleTags(ctx, W, H, state) {
  const bars = coverBars(W, H);
  const rects = panelRects(state.layout, 0, bars.py0, W, bars.py1 - bars.py0);
  const gap = Math.max(2, Math.round(W * 0.004));
  const tagFs = Math.max(11, W * 0.016);
  const tagH = tagFs * 1.7;
  rects.forEach((r, i) => {
    const panel = state.panels[i];
    if (!panel) return;
    if (r.slant) {
      // first diagonal panel: keep the tag clear of the VOL. 01 tape
      const tx = i === 0
        ? Math.max(r.x + r.slant + gap + W * 0.008, W * 0.115)
        : r.x + r.slant + gap + W * 0.008;
      roleTag(ctx, tx, r.y + W * 0.008, panel.role, tagFs);
    } else {
      roleTag(ctx, r.x + W * 0.008, r.y + r.h - tagH - W * 0.008, panel.role, tagFs);
    }
  });
}

function drawQuoteBar(ctx, W, H, state) {
  const bars = coverBars(W, H);
  ctx.fillStyle = '#150826';
  ctx.fillRect(0, 0, W, bars.quoteH);
  ctx.fillStyle = '#c9a24d';
  ctx.fillRect(0, bars.quoteH - 2, W, 2);
  const stars = '★★★★★';
  const quote = `“${state.quote}”`;
  const source = ` — ${state.source}`;
  let fs = H * 0.027;
  ctx.textBaseline = 'middle';
  const total = () => {
    ctx.font = `italic ${fs}px Georgia, serif`;
    const qw = ctx.measureText(quote).width;
    ctx.font = `bold ${fs}px Georgia, serif`;
    const sw = ctx.measureText(stars).width + ctx.measureText(source).width;
    return qw + sw + fs * 1.2;
  };
  while (fs > 9 && total() > W * 0.96) fs -= 1;
  let x = (W - total()) / 2;
  const cy = bars.quoteH / 2;
  ctx.textAlign = 'left';
  ctx.font = `bold ${fs}px Georgia, serif`;
  ctx.fillStyle = '#ffc93d';
  ctx.fillText(stars, x, cy);
  x += ctx.measureText(stars).width + fs * 0.4;
  ctx.font = `italic ${fs}px Georgia, serif`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(quote, x, cy);
  x += ctx.measureText(quote).width;
  ctx.font = `bold ${fs}px Georgia, serif`;
  ctx.fillStyle = '#e8c96a';
  ctx.fillText(source, x, cy);
}

function drawTitle(ctx, W, H, state) {
  const title = state.title || '';
  if (!title) return 0;
  const cy = H * (TITLE_Y[state.layout] ?? 0.62);
  let fs = W * 0.125;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${fs}px Anton, sans-serif`;
  while (fs > 12 && ctx.measureText(title).width > W * 0.94) {
    fs -= 2;
    ctx.font = `${fs}px Anton, sans-serif`;
  }
  const top = cy - fs * 0.5, bot = cy + fs * 0.55;
  const grad = ctx.createLinearGradient(0, top, 0, bot);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.18, '#fff3c4');
  grad.addColorStop(0.32, '#ffd94d');
  grad.addColorStop(0.45, '#ffab2e');
  grad.addColorStop(0.58, '#ff7a3d');
  grad.addColorStop(0.72, '#ff2e88');
  grad.addColorStop(0.88, '#e0218a');
  grad.addColorStop(1, '#c2187a');
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = fs * 0.16;
  ctx.strokeText(title, W / 2, cy);
  ctx.strokeStyle = '#2b0a33';
  ctx.lineWidth = fs * 0.05;
  ctx.strokeText(title, W / 2, cy);
  ctx.fillStyle = grad;
  ctx.fillText(title, W / 2, cy);
  ctx.restore();

  // Tagline on its own dark pill below the title, never overlapping it.
  const tag = state.tagline || '';
  if (tag) {
    const tfs = fs * 0.3;
    ctx.font = `${tfs}px Pacifico, cursive`;
    const tw = ctx.measureText(tag).width;
    const pw = tw + tfs * 1.8, ph = tfs * 1.55;
    const px = (W - pw) / 2, py = bot + fs * 0.03;
    ctx.save();
    rr(ctx, px, py, pw, ph, ph / 2);
    ctx.fillStyle = 'rgba(16,6,28,0.9)';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, W / 2, py + ph / 2 + tfs * 0.05);
    ctx.restore();
    return py + ph;
  }
  return bot;
}

function drawTape(ctx, W, H) {
  const bars = coverBars(W, H);
  const w = W * 0.08, h = Math.max(16, H * 0.026);
  const x = W * 0.014, y = bars.py0 + H * 0.014;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(-0.07);
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = '#ffd94d';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#b8932a';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = '#2a1a00';
  ctx.font = `${h * 0.62}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VOL. 01', 0, h * 0.04);
  ctx.restore();
}

function drawSeal(ctx, W, H) {
  const bars = coverBars(W, H);
  const R = W * 0.042;
  const cx = W - W * 0.055;
  const cy = bars.py1 - R * 1.15;
  const points = 16;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.1);
  const grad = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.1, 0, 0, R);
  grad.addColorStop(0, '#ffe98a');
  grad.addColorStop(0.6, '#ffd34d');
  grad.addColorStop(1, '#f0a020');
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? R : R * 0.8;
    const a = (Math.PI * i) / points - Math.PI / 2;
    const px = Math.cos(a) * r, py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = '#a87600';
  ctx.lineWidth = Math.max(1.5, R * 0.04);
  ctx.stroke();
  ctx.fillStyle = '#4a2400';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${R * 0.34}px Anton, sans-serif`;
  ctx.fillText('EST.', 0, -R * 0.14);
  ctx.fillText('2026', 0, R * 0.22);
  ctx.restore();
}

function drawSkyline(ctx, W, H) {
  const bars = coverBars(W, H);
  const base = bars.py1;
  const rnd = mulberry32(20260619);
  ctx.fillStyle = '#160a24';
  let x = -10;
  const unit = W / 1920;
  while (x < W + 10) {
    const bw = (14 + rnd() * 44) * unit;
    const bh = bars.skyH * (0.35 + rnd() * 0.65);
    ctx.fillRect(x, base - bh, bw, bh);
    // lit windows
    ctx.fillStyle = 'rgba(255,217,122,0.85)';
    const cols = Math.max(1, Math.floor(bw / (10 * unit)));
    const rows = Math.max(1, Math.floor(bh / (12 * unit)));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rnd() < 0.28) {
          ctx.fillRect(x + (4 + c * 10) * unit, base - bh + (5 + r * 12) * unit, 3 * unit, 4 * unit);
        }
      }
    }
    ctx.fillStyle = '#160a24';
    x += bw + (2 + rnd() * 8) * unit;
  }
  // palm silhouettes at the far edges
  const palm = (px, flip) => {
    ctx.save();
    ctx.translate(px, base);
    ctx.scale(flip ? -1 : 1, 1);
    ctx.strokeStyle = '#160a24';
    ctx.fillStyle = '#160a24';
    ctx.lineWidth = 3 * unit;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(2 * unit, -bars.skyH * 0.9, 8 * unit, -bars.skyH * 1.5);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (0.15 + i * 0.18);
      ctx.beginPath();
      ctx.moveTo(8 * unit, -bars.skyH * 1.5);
      ctx.quadraticCurveTo(
        8 * unit + Math.cos(a) * 16 * unit,
        -bars.skyH * 1.5 - Math.sin(a) * 12 * unit,
        8 * unit + Math.cos(a) * 26 * unit,
        -bars.skyH * 1.5 - Math.sin(a) * 6 * unit + 6 * unit,
      );
      ctx.stroke();
    }
    ctx.restore();
  };
  palm(W * 0.012, false);
  palm(W * 0.988, true);
}

function drawSun(ctx, cx, cy, r, slit) {
  const grad = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  grad.addColorStop(0, '#ffe066');
  grad.addColorStop(0.5, '#ffab2e');
  grad.addColorStop(1, '#ff7a1a');
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.fillStyle = slit;
  const slits = [[0.08, 0.16], [0.38, 0.14], [0.64, 0.12]];
  for (const [off, th] of slits) {
    const y = cy + r * off;
    const half = Math.sqrt(Math.max(0, r * r - (r * off) * (r * off)));
    ctx.fillRect(cx - half, y, half * 2, r * th);
  }
  ctx.restore();
}

function drawBand(ctx, W, H, state) {
  const bars = coverBars(W, H);
  const y = bars.py1, h = bars.bandH;
  const dark = state.band === 'dark';
  if (dark) {
    ctx.fillStyle = '#150826';
    ctx.fillRect(0, y, W, h);
  } else {
    const grad = ctx.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, '#ff7a1a');
    grad.addColorStop(0.45, '#ff2e88');
    grad.addColorStop(1, '#7a1fa2');
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, W, h);
  }
  drawSun(ctx, W * 0.055, y + h / 2, h * 0.42, dark ? '#150826' : '#3d1150');
  const strip = state.eyebrow || '';
  if (!strip) return;
  let fs = h * 0.42;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // letter spacing is on while measuring, so the pill fits the drawn text
  try { ctx.letterSpacing = '2px'; } catch { /* older canvas: ignore */ }
  const measure = () => {
    ctx.font = `${fs}px Anton, sans-serif`;
    return ctx.measureText(strip).width;
  };
  while (fs > 9 && measure() > W * 0.74) fs -= 1;
  const tw = measure();
  if (!dark) {
    const pw = tw + fs * 2.6, ph = Math.min(fs * 1.9, h * 0.9);
    rr(ctx, (W - pw) / 2, y + (h - ph) / 2, pw, ph, ph / 2);
    ctx.fillStyle = 'rgba(20,8,32,0.92)';
    ctx.fill();
  }
  ctx.font = `${fs}px Anton, sans-serif`;
  ctx.fillStyle = '#ffc93d';
  ctx.fillText(strip, W / 2, y + h / 2 + fs * 0.04);
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas: ignore */ }
}

function drawBilling(ctx, W, H) {
  const bars = coverBars(W, H);
  const y = H - bars.billH, h = bars.billH;
  ctx.fillStyle = '#0d0518';
  ctx.fillRect(0, y, W, h);
  const cy = y + h / 2;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = `${h * 0.5}px Anton, sans-serif`;
  ctx.fillStyle = '#ff5c8a';
  ctx.fillText('COMING SOON', W * 0.015, cy + h * 0.02);
  const csW = ctx.measureText('COMING SOON').width;
  // credits live in the free zone between COMING SOON and the barcode
  const zoneL = W * 0.015 + csW + W * 0.02;
  const zoneR = W * 0.945;
  const credits = 'SUNSET VICE PRESENTS  •  STARRING YOUR CREW  •  SHOT ON YOUR OWN CAMERA  •  NOTHING UPLOADED';
  let fs = h * 0.3;
  // letter spacing is on while measuring, so the text fits its zone
  try { ctx.letterSpacing = '1px'; } catch { /* older canvas: ignore */ }
  ctx.font = `${fs}px 'Segoe UI', sans-serif`;
  while (fs > 7 && ctx.measureText(credits).width > zoneR - zoneL) {
    fs -= 0.5;
    ctx.font = `${fs}px 'Segoe UI', sans-serif`;
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#9a8fb0';
  ctx.fillText(credits, (zoneL + zoneR) / 2, cy);
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas: ignore */ }
  // barcode, fixed pattern
  const pattern = [3, 1, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2];
  const unit = Math.max(1, W / 1920);
  let bx = W * 0.952;
  const bh = h * 0.62, by = cy - bh / 2;
  ctx.fillStyle = '#e8e0f2';
  for (const wdt of pattern) {
    ctx.fillRect(bx, by, wdt * unit, bh);
    bx += (wdt + 1.6) * unit;
  }
}

export function drawCover(ctx, W, H, state, getImage) {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  // warm cream shows through the diagonal gaps
  ctx.fillStyle = '#f4e7d3';
  ctx.fillRect(0, 0, W, H);
  drawPanels(ctx, W, H, state, getImage);
  drawSkyline(ctx, W, H);
  drawRoleTags(ctx, W, H, state);
  drawQuoteBar(ctx, W, H, state);
  drawTitle(ctx, W, H, state);
  drawTape(ctx, W, H);
  drawSeal(ctx, W, H);
  drawBand(ctx, W, H, state);
  drawBilling(ctx, W, H);
  ctx.restore();
}

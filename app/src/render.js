/* Sunset Vice - Cover Studio: the cover renderer.
 *
 * One engine draws every cover: the live preview in the editor and the
 * exported PNG are the same drawCover call at different sizes, so what the
 * user sees is exactly what they share. No library, no network: plain
 * Canvas 2D plus two local fonts (Anton + Pacifico, SIL OFL).
 *
 * A cover is: a press-quote bar on top, a multi-panel photo collage in the
 * middle (four layouts), a striped retro-chrome title overlaid across the
 * panels with a thick white halo, a script tagline on its own dark pill,
 * cast role tags on every panel, a skyline silhouette, palm silhouettes, a
 * retro sun, a starburst badge, a tape label, and a billing strip at the
 * bottom. Grades are per-pixel colour maps applied once per photo and
 * cached, so dragging a panel stays fast.
 */
(function () {
  'use strict';

  /* Post sizes the app exports: square, portrait, landscape. */
  var SIZES = {
    square: { w: 1080, h: 1080, label: '1080 x 1080' },
    portrait: { w: 1080, h: 1350, label: '1080 x 1350' },
    wide: { w: 1920, h: 1080, label: '1920 x 1080' }
  };

  /* Grades: warm sunset wash is the default; the rest are duotone maps. */
  var GRADE_NAMES = ['warm', 'duotone', 'neon', 'gold', 'noir'];
  var LAYOUT_NAMES = ['grid', 'hero', 'big4', 'diagonal'];

  var INK = '#0b0812'; /* deep Vice City navy, used for bands and silhouettes */
  var PAPER = '#ffffff';
  var GOLD = '#ffd76a';
  var PINK = '#ff4d7e';

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  /* ------------------------------------------------------------------ */
  /* Colour grades: 256-entry lookup tables, built once per grade.       */
  /* A grade is either per-channel curves (warm) or a luminance map      */
  /* (duotone / neon / gold / noir) through a three-stop gradient.       */
  /* ------------------------------------------------------------------ */

  function lerp(a, b, t) { return a + (b - a) * t; }

  function gradientLUT(stops) {
    /* stops: [[pos, r, g, b], ...] sorted by pos 0..1. Returns [r,g,b] LUTs. */
    var r = new Uint8Array(256);
    var g = new Uint8Array(256);
    var b = new Uint8Array(256);
    for (var i = 0; i < 256; i++) {
      var t = i / 255;
      var s = 0;
      while (s < stops.length - 2 && t > stops[s + 1][0]) s++;
      var a = stops[s];
      var c = stops[s + 1];
      var f = (t - a[0]) / (c[0] - a[0] || 1);
      r[i] = clamp(Math.round(lerp(a[1], c[1], f)), 0, 255);
      g[i] = clamp(Math.round(lerp(a[2], c[2], f)), 0, 255);
      b[i] = clamp(Math.round(lerp(a[3], c[3], f)), 0, 255);
    }
    return { r: r, g: g, b: b, byLuminance: true };
  }

  function channelLUT(fnR, fnG, fnB) {
    var r = new Uint8Array(256);
    var g = new Uint8Array(256);
    var b = new Uint8Array(256);
    for (var i = 0; i < 256; i++) {
      r[i] = clamp(Math.round(fnR(i)), 0, 255);
      g[i] = clamp(Math.round(fnG(i)), 0, 255);
      b[i] = clamp(Math.round(fnB(i)), 0, 255);
    }
    return { r: r, g: g, b: b, byLuminance: false };
  }

  function contrastCurve(v, amount) {
    return (v - 128) * amount + 128;
  }

  var GRADE_TABLES = null;

  function gradeTables() {
    if (GRADE_TABLES) return GRADE_TABLES;
    GRADE_TABLES = {
      /* Warm Sunset: keep natural colours, add a warm wash + gentle punch. */
      warm: channelLUT(
        function (v) { return contrastCurve(v, 1.07) * 1.06 + 9; },
        function (v) { return contrastCurve(v, 1.05) + 3; },
        function (v) { return contrastCurve(v, 1.04) * 0.88; }
      ),
      /* Sunset duotone: deep purple shadows, magenta mids, amber highs. */
      duotone: gradientLUT([[0, 27, 11, 46], [0.52, 194, 39, 124], [1, 255, 179, 71]]),
      /* Neon Night: navy shadows, violet mids, cyan highlights. */
      neon: gradientLUT([[0, 5, 8, 24], [0.5, 123, 47, 247], [1, 92, 242, 255]]),
      /* Vice Gold: dark umber shadows, rich gold mids, pale gold highs. */
      gold: gradientLUT([[0, 20, 13, 2], [0.5, 201, 150, 46], [1, 255, 233, 168]]),
      /* Mono Noir: high-contrast black and white. */
      noir: channelLUT(
        function (v) { return contrastCurve(v, 1.18); },
        function (v) { return contrastCurve(v, 1.18); },
        function (v) { return contrastCurve(v, 1.18); }
      )
    };
    /* Noir maps through luminance, not per channel. */
    GRADE_TABLES.noir.byLuminance = true;
    return GRADE_TABLES;
  }

  /* Grade one image into an offscreen canvas, capped at 1200 px wide so
   * the pixel loop stays quick. Results are cached per photo + grade. */
  var gradedCache = new Map();

  function gradedPhoto(photo, grade) {
    var key = photo.id + '|' + grade;
    var hit = gradedCache.get(key);
    if (hit) return hit;
    var img = photo.img;
    var scale = Math.min(1, 1200 / img.naturalWidth);
    var w = Math.max(1, Math.round(img.naturalWidth * scale));
    var h = Math.max(1, Math.round(img.naturalHeight * scale));
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    var table = gradeTables()[grade] || gradeTables().warm;
    var data;
    try {
      data = ctx.getImageData(0, 0, w, h);
    } catch (err) {
      /* A tainted canvas (e.g. file://) cannot be read back: fall back to
       * the ungraded photo rather than breaking the whole cover. */
      if (gradedCache.size > 48) gradedCache.clear();
      gradedCache.set(key, canvas);
      return canvas;
    }
    var px = data.data;
    if (table.byLuminance) {
      for (var i = 0; i < px.length; i += 4) {
        var lum = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000 | 0;
        px[i] = table.r[lum];
        px[i + 1] = table.g[lum];
        px[i + 2] = table.b[lum];
      }
    } else {
      for (var j = 0; j < px.length; j += 4) {
        px[j] = table.r[px[j]];
        px[j + 1] = table.g[px[j + 1]];
        px[j + 2] = table.b[px[j + 2]];
      }
    }
    ctx.putImageData(data, 0, 0);
    if (gradedCache.size > 48) gradedCache.clear();
    gradedCache.set(key, canvas);
    return canvas;
  }

  function clearGradeCache() { gradedCache.clear(); }

  /* ------------------------------------------------------------------ */
  /* Layouts: panel rectangles (or polygons for the diagonal layout)     */
  /* inside the panel region, which runs between the quote bar and the   */
  /* billing strip. Every panel carries its corner points plus a         */
  /* bounding box, so photo fitting and hit-testing share one shape.     */
  /* ------------------------------------------------------------------ */

  function rectPanel(x, y, w, h) {
    return {
      x: x, y: y, w: w, h: h,
      pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]
    };
  }

  function polyPanel(pts) {
    var xs = pts.map(function (p) { return p[0]; });
    var ys = pts.map(function (p) { return p[1]; });
    var x = Math.min.apply(null, xs);
    var y = Math.min.apply(null, ys);
    return {
      x: x, y: y,
      w: Math.max.apply(null, xs) - x,
      h: Math.max.apply(null, ys) - y,
      pts: pts
    };
  }

  function lineCross(a, b, c, d) {
    /* Intersection of lines a-b and c-d. */
    var d1x = b[0] - a[0];
    var d1y = b[1] - a[1];
    var d2x = d[0] - c[0];
    var d2y = d[1] - c[1];
    var denom = d1x * d2y - d1y * d2x;
    if (Math.abs(denom) < 1e-6) return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    var t = ((c[0] - a[0]) * d2y - (c[1] - a[1]) * d2x) / denom;
    return [a[0] + d1x * t, a[1] + d1y * t];
  }

  function layoutPanels(layout, W, top, bottom) {
    var pad = Math.max(6, W * 0.012);
    var gap = Math.max(4, W * 0.008);
    var x0 = pad;
    var x1 = W - pad;
    var regionH = bottom - top;
    var panels = [];
    var i, r, c;
    if (layout === 'grid') {
      /* 3x3 uniform grid. */
      var cw = (x1 - x0 - gap * 2) / 3;
      var ch = (regionH - gap * 2) / 3;
      for (r = 0; r < 3; r++) {
        for (c = 0; c < 3; c++) {
          panels.push(rectPanel(x0 + c * (cw + gap), top + r * (ch + gap), cw, ch));
        }
      }
    } else if (layout === 'hero') {
      /* One big hero panel left, two stacked panels right. */
      var heroW = (x1 - x0 - gap) * 0.62;
      panels.push(rectPanel(x0, top, heroW, regionH));
      var sideX = x0 + heroW + gap;
      var sideW = x1 - sideX;
      var sideH = (regionH - gap) / 2;
      panels.push(rectPanel(sideX, top, sideW, sideH));
      panels.push(rectPanel(sideX, top + sideH + gap, sideW, sideH));
    } else if (layout === 'big4') {
      /* One big panel + four small ones in a 2x2 block. */
      var bigW = (x1 - x0 - gap) * 0.56;
      panels.push(rectPanel(x0, top, bigW, regionH));
      var gx = x0 + bigW + gap;
      var gw = (x1 - gx - gap) / 2;
      var gh = (regionH - gap) / 2;
      for (r = 0; r < 2; r++) {
        for (c = 0; c < 2; c++) {
          panels.push(rectPanel(gx + c * (gw + gap), top + r * (gh + gap), gw, gh));
        }
      }
    } else {
      /* Diagonal: a 2x2 grid whose dividers slant, so every seam is a slash. */
      var cx = (x0 + x1) / 2;
      var cy = top + regionH / 2;
      var sx = W * 0.035;
      var sy = regionH * 0.055;
      var vTop = [cx + sx, top];
      var vBot = [cx - sx, bottom];
      var hLeft = [x0, cy - sy];
      var hRight = [x1, cy + sy];
      var cross = lineCross(vTop, vBot, hLeft, hRight);
      panels.push(polyPanel([[x0, top], vTop, cross, hLeft]));
      panels.push(polyPanel([vTop, [x1, top], hRight, cross]));
      panels.push(polyPanel([hLeft, cross, vBot, [x0, bottom]]));
      panels.push(polyPanel([cross, hRight, [x1, bottom], vBot]));
    }
    return panels;
  }

  function panelContains(panel, px, py) {
    /* Point-in-polygon (ray casting) so diagonal panels pick correctly. */
    var inside = false;
    var pts = panel.pts;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var xi = pts[i][0], yi = pts[i][1];
      var xj = pts[j][0], yj = pts[j][1];
      if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  /* ------------------------------------------------------------------ */
  /* Photos: cover-fit a graded photo into a panel, honouring the        */
  /* slot's zoom and focal point, then a white frame and a role tag.     */
  /* ------------------------------------------------------------------ */

  function drawPhotoInPanel(ctx, graded, panel, slot, W) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(panel.pts[0][0], panel.pts[0][1]);
    for (var i = 1; i < panel.pts.length; i++) ctx.lineTo(panel.pts[i][0], panel.pts[i][1]);
    ctx.closePath();
    ctx.clip();
    var iw = graded.width;
    var ih = graded.height;
    var zoom = slot.zoom || 1;
    var scale = Math.max(panel.w / iw, panel.h / ih) * zoom;
    var dw = iw * scale;
    var dh = ih * scale;
    var fx = slot.x === undefined ? 0.5 : slot.x;
    var fy = slot.y === undefined ? 0.5 : slot.y;
    var dx = panel.x + panel.w / 2 - dw * fx;
    var dy = panel.y + panel.h / 2 - dh * fy;
    dx = clamp(dx, panel.x + panel.w - dw, panel.x);
    dy = clamp(dy, panel.y + panel.h - dh, panel.y);
    ctx.drawImage(graded, dx, dy, dw, dh);
    ctx.restore();
    /* Thin white frame so the panels read as a poster collage. */
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(panel.pts[0][0], panel.pts[0][1]);
    for (var k = 1; k < panel.pts.length; k++) ctx.lineTo(panel.pts[k][0], panel.pts[k][1]);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = Math.max(2, W * 0.0022);
    ctx.stroke();
    ctx.restore();
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawRoleTag(ctx, panel, tag, W, H) {
    if (!tag) return;
    var fs = clamp(Math.min(panel.w, panel.h) * 0.11, 11, Math.max(13, H * 0.02));
    ctx.save();
    ctx.font = fs + 'px Anton, sans-serif';
    var tw = ctx.measureText(tag).width;
    var padX = fs * 0.7;
    var padY = fs * 0.42;
    var bw = tw + padX * 2;
    var bh = fs + padY * 2;
    var bx = panel.x + Math.max(6, W * 0.006);
    var by = panel.y + panel.h - bh - Math.max(6, H * 0.006);
    roundRectPath(ctx, bx, by, bw, bh, bh / 2);
    ctx.fillStyle = 'rgba(8,6,16,0.82)';
    ctx.fill();
    ctx.fillStyle = PAPER;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, bx + padX, by + bh / 2 + fs * 0.04);
    ctx.restore();
  }

  /* ------------------------------------------------------------------ */
  /* Decorations, all drawn in code: no external images anywhere.        */
  /* ------------------------------------------------------------------ */

  function drawRetroSun(ctx, cx, cy, radius) {
    /* Sunset disc with widening horizontal slits towards the bottom. */
    var off = document.createElement('canvas');
    var pad = 4;
    off.width = Math.ceil(radius * 2 + pad * 2);
    off.height = Math.ceil(radius * 2 + pad * 2);
    var o = off.getContext('2d');
    var grad = o.createLinearGradient(0, 0, 0, off.height);
    grad.addColorStop(0, '#ffcf5c');
    grad.addColorStop(0.45, '#ff8a5c');
    grad.addColorStop(1, '#ff4d7e');
    o.fillStyle = grad;
    o.beginPath();
    o.arc(off.width / 2, off.height / 2, radius, 0, Math.PI * 2);
    o.fill();
    o.globalCompositeOperation = 'destination-out';
    var slits = [0.12, 0.30, 0.50, 0.70];
    for (var i = 0; i < slits.length; i++) {
      var y = off.height * (0.52 + slits[i] * 0.42);
      var h = radius * (0.05 + i * 0.035);
      o.fillRect(0, y, off.width, h);
    }
    ctx.drawImage(off, cx - off.width / 2, cy - off.height / 2);
  }

  function drawPalmSilhouette(ctx, x, y, size, flip) {
    /* One palm tree silhouette: curved trunk, seven drooping fronds. */
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip ? -1 : 1, 1);
    ctx.fillStyle = INK;
    ctx.globalAlpha = 0.96;
    ctx.beginPath();
    ctx.moveTo(-size * 0.03, 0);
    ctx.quadraticCurveTo(-size * 0.10, -size * 0.55, size * 0.06, -size * 0.92);
    ctx.quadraticCurveTo(size * 0.10, -size * 0.92, size * 0.07, -size * 0.55);
    ctx.quadraticCurveTo(size * 0.05, -size * 0.2, size * 0.05, 0);
    ctx.closePath();
    ctx.fill();
    var topX = size * 0.07;
    var topY = -size * 0.92;
    for (var i = 0; i < 7; i++) {
      var a = Math.PI * (0.08 + i * 0.14);
      var len = size * (0.42 + (i % 3) * 0.06);
      var ex = topX + Math.cos(a) * len;
      var ey = topY - Math.sin(a) * len * 0.55 + len * 0.28;
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(
        topX + Math.cos(a) * len * 0.6, topY - Math.sin(a) * len * 0.6 - size * 0.06,
        ex, ey
      );
      ctx.quadraticCurveTo(
        topX + Math.cos(a) * len * 0.55, topY - Math.sin(a) * len * 0.4 + size * 0.05,
        topX, topY
      );
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSkylineSilhouette(ctx, W, yBase, height) {
    /* Deterministic city skyline: same buildings at every size. */
    var seed = 1234567;
    function rnd() {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    }
    ctx.save();
    ctx.fillStyle = INK;
    ctx.globalAlpha = 0.94;
    var x = 0;
    var windows = [];
    while (x < W) {
      var bw = W * (0.03 + rnd() * 0.05);
      var bh = height * (0.35 + rnd() * 0.65);
      ctx.fillRect(x, yBase - bh, bw, bh);
      var cols = Math.floor(bw / (W * 0.008));
      var rows = Math.floor(bh / (height * 0.16));
      for (var c = 0; c < cols; c++) {
        for (var r = 0; r < rows; r++) {
          if (rnd() < 0.3) {
            windows.push([x + W * 0.005 + c * W * 0.008, yBase - bh + height * 0.05 + r * height * 0.16]);
          }
        }
      }
      x += bw + W * 0.004;
    }
    ctx.fillStyle = GOLD;
    ctx.globalAlpha = 0.9;
    for (var i = 0; i < windows.length; i++) {
      ctx.fillRect(windows[i][0], windows[i][1], Math.max(2, W * 0.0028), Math.max(2, height * 0.07));
    }
    ctx.restore();
  }

  function drawStar(ctx, cx, cy, outer, inner, points) {
    ctx.beginPath();
    for (var i = 0; i < points * 2; i++) {
      var r = i % 2 === 0 ? outer : inner;
      var a = -Math.PI / 2 + i * Math.PI / points;
      var x = cx + Math.cos(a) * r;
      var y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function drawStarburstBadge(ctx, cx, cy, radius, text) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.14);
    drawStar(ctx, 0, 0, radius, radius * 0.78, 12);
    ctx.fillStyle = PINK;
    ctx.fill();
    ctx.lineWidth = Math.max(2, radius * 0.06);
    ctx.strokeStyle = PAPER;
    ctx.stroke();
    ctx.fillStyle = PAPER;
    ctx.font = Math.round(radius * 0.34) + 'px Anton, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, radius * 0.03);
    ctx.restore();
  }

  function drawTapeLabel(ctx, x, y, w, h, text) {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(-0.06);
    ctx.fillStyle = GOLD;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = INK;
    ctx.font = Math.round(h * 0.52) + 'px Anton, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, h * 0.03);
    ctx.restore();
  }

  /* ------------------------------------------------------------------ */
  /* Lettering: striped retro-chrome title with a thick white halo.      */
  /* No drop shadow anywhere on the title: the halo alone separates it   */
  /* from any photo behind it, which keeps contrast measurable.          */
  /* ------------------------------------------------------------------ */

  function fitFontSize(ctx, text, family, startPx, maxWidth, prefix) {
    var px = startPx;
    var head = prefix ? prefix + ' ' : '';
    ctx.font = head + px + 'px ' + family;
    while (px > 12 && ctx.measureText(text).width > maxWidth) {
      px = Math.max(12, Math.floor(px * 0.94));
      ctx.font = head + px + 'px ' + family;
    }
    return px;
  }

  function chromeTextCanvas(text, px) {
    /* The title glyphs filled with a sunset-chrome gradient + stripes. */
    var probe = document.createElement('canvas').getContext('2d');
    probe.font = px + 'px Anton, sans-serif';
    var tw = Math.ceil(probe.measureText(text).width);
    var th = Math.ceil(px * 1.25);
    var pad = Math.ceil(px * 0.12);
    var canvas = document.createElement('canvas');
    canvas.width = tw + pad * 2;
    canvas.height = th + pad * 2;
    var ctx = canvas.getContext('2d');
    ctx.font = px + 'px Anton, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    var grad = ctx.createLinearGradient(0, pad, 0, pad + th);
    grad.addColorStop(0, '#fffbe8');
    grad.addColorStop(0.28, '#ffd76a');
    grad.addColorStop(0.52, '#ff8a5c');
    grad.addColorStop(0.74, '#ff4d7e');
    grad.addColorStop(1, '#fff3c4');
    ctx.fillStyle = grad;
    ctx.fillText(text, pad, pad + px);
    /* Retro stripes: thin dark bands clipped to the glyphs. */
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(22,8,18,0.55)';
    var bands = [0.30, 0.52, 0.74];
    for (var i = 0; i < bands.length; i++) {
      ctx.fillRect(0, pad + th * bands[i], canvas.width, Math.max(2, px * 0.028));
    }
    return { canvas: canvas, w: canvas.width, h: canvas.height, pad: pad, textH: th };
  }

  function drawChromeTitle(ctx, text, cx, cy, maxWidth, startPx) {
    if (!text) return 0;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var px = fitFontSize(ctx, text, 'Anton, sans-serif', startPx, maxWidth);
    ctx.font = px + 'px Anton, sans-serif';
    /* Thick white halo first, then a dark outline, then the chrome fill. */
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeStyle = PAPER;
    ctx.lineWidth = px * 0.17;
    ctx.strokeText(text, cx, cy);
    ctx.strokeStyle = '#160a12';
    ctx.lineWidth = px * 0.055;
    ctx.strokeText(text, cx, cy);
    var chrome = chromeTextCanvas(text, px);
    ctx.drawImage(chrome.canvas, cx - chrome.w / 2, cy - chrome.h / 2);
    ctx.restore();
    return px;
  }

  function drawPill(ctx, cx, cy, text, fontPx, family, textColor) {
    /* Dark scrim pill behind a line of text; returns the pill height. */
    ctx.save();
    ctx.font = fontPx + 'px ' + family;
    var tw = ctx.measureText(text).width;
    var padX = fontPx * 0.85;
    var padY = fontPx * 0.42;
    var bw = tw + padX * 2;
    var bh = fontPx + padY * 2;
    roundRectPath(ctx, cx - bw / 2, cy - bh / 2, bw, bh, bh / 2);
    ctx.fillStyle = 'rgba(10,8,18,0.82)';
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy + fontPx * 0.04);
    ctx.restore();
    return bh;
  }

  /* ------------------------------------------------------------------ */
  /* Bars: press-quote bar on top, billing strip at the bottom.          */
  /* ------------------------------------------------------------------ */

  function drawPressQuoteBar(ctx, W, H, quote, barH) {
    ctx.save();
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, W, barH);
    ctx.fillStyle = GOLD;
    ctx.fillRect(0, barH - Math.max(2, H * 0.002), W, Math.max(2, H * 0.002));
    var starR = barH * 0.26;
    var gap = starR * 0.5;
    var starsW = starR * 2 * 5 + gap * 4;
    ctx.font = '700 ' + Math.round(barH * 0.42) + 'px system-ui, sans-serif';
    var qw = quote ? ctx.measureText(quote).width : 0;
    var totalW = starsW + (quote ? barH * 0.5 + qw : 0);
    var startX = (W - totalW) / 2;
    var cy = barH / 2;
    for (var i = 0; i < 5; i++) {
      drawStar(ctx, startX + starR + i * (starR * 2 + gap), cy, starR, starR * 0.45, 5);
      ctx.fillStyle = GOLD;
      ctx.fill();
    }
    if (quote) {
      ctx.fillStyle = PAPER;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(quote, startX + starsW + barH * 0.5, cy + barH * 0.02);
    }
    ctx.restore();
  }

  function drawBillingStrip(ctx, W, H, billing, stripH) {
    ctx.save();
    var y = H - stripH;
    ctx.fillStyle = INK;
    ctx.fillRect(0, y, W, stripH);
    ctx.fillStyle = GOLD;
    ctx.fillRect(0, y, W, Math.max(2, H * 0.002));
    if (billing) {
      ctx.fillStyle = '#ededf4';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var px = fitFontSize(ctx, billing, 'system-ui, sans-serif', stripH * 0.44, W * 0.94, '700');
      if ('letterSpacing' in ctx) {
        ctx.letterSpacing = Math.max(1, px * 0.08) + 'px';
        /* Re-fit with the tracking applied: it adds real width. */
        px = fitFontSize(ctx, billing, 'system-ui, sans-serif', px, W * 0.94, '700');
      }
      ctx.font = '700 ' + px + 'px system-ui, sans-serif';
      ctx.fillText(billing, W / 2, y + stripH / 2 + px * 0.03);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------------ */
  /* drawCover: the whole poster, from a state object, at any size.      */
  /* The same call draws the editor preview and the exported PNG.        */
  /* ------------------------------------------------------------------ */

  function drawCover(canvas, state) {
    var size = SIZES[state.size] || SIZES.wide;
    var W = size.w;
    var H = size.h;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    var ctx = canvas.getContext('2d');
    var quoteH = Math.round(H * 0.062);
    var billH = Math.round(H * 0.048);
    var panelTop = quoteH;
    var panelBottom = H - billH;

    /* Background + bands. */
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, W, H);
    drawPressQuoteBar(ctx, W, H, state.quote, quoteH);
    drawBillingStrip(ctx, W, H, state.billing, billH);

    /* Photo panels. */
    var panels = layoutPanels(state.layout, W, panelTop, panelBottom);
    var regionH = panelBottom - panelTop;
    for (var i = 0; i < panels.length; i++) {
      var slot = state.slots[i] || { photo: 0, zoom: 1, x: 0.5, y: 0.5, tag: '' };
      var photo = state.photos[slot.photo] || state.photos[0];
      if (photo && photo.img && photo.img.complete && photo.img.naturalWidth > 0) {
        drawPhotoInPanel(ctx, gradedPhoto(photo, state.grade), panels[i], slot, W);
      } else {
        /* Placeholder while a photo still loads: sunset gradient + name. */
        var g = ctx.createLinearGradient(panels[i].x, panels[i].y, panels[i].x, panels[i].y + panels[i].h);
        g.addColorStop(0, '#3a1c5c');
        g.addColorStop(1, '#b83a6e');
        ctx.fillStyle = g;
        ctx.fillRect(panels[i].x, panels[i].y, panels[i].w, panels[i].h);
      }
    }

    /* Skyline + palms along the bottom of the panel region. */
    if (!state.decor || state.decor.skyline !== false) {
      drawSkylineSilhouette(ctx, W, panelBottom, regionH * 0.11);
    }
    if (!state.decor || state.decor.palms !== false) {
      var palmSize = regionH * 0.36;
      drawPalmSilhouette(ctx, W * 0.025, panelBottom, palmSize, false);
      drawPalmSilhouette(ctx, W * 0.965, panelBottom, palmSize * 0.85, true);
    }

    /* Retro sun high in the sky of the cover, clear of the title block. */
    var titleCy = panelTop + regionH * 0.47;
    if (!state.decor || state.decor.sun !== false) {
      drawRetroSun(ctx, W / 2, panelTop + regionH * 0.15, Math.min(W, H) * 0.08);
    }

    /* Cast tags in a second pass, so they sit on top of the skyline and
     * palms instead of hiding behind them — but still under the title. */
    for (var t = 0; t < panels.length; t++) {
      var tagSlot = state.slots[t] || { photo: 0, zoom: 1, x: 0.5, y: 0.5, tag: '' };
      var tagPhoto = state.photos[tagSlot.photo] || state.photos[0];
      drawRoleTag(ctx, panels[t], tagSlot.tag || (tagPhoto ? tagPhoto.role : ''), W, H);
    }

    /* Corner labels: tape top-left, starburst badge top-right. */
    if (!state.decor || state.decor.tape !== false) {
      var tapeW = W * 0.185;
      var tapeH = Math.max(20, H * 0.030);
      drawTapeLabel(ctx, W * 0.02, panelTop + H * 0.012, tapeW, tapeH, 'VOL. 06 - PALMS DISTRICT');
    }
    if (!state.decor || state.decor.badge !== false) {
      drawStarburstBadge(ctx, W * 0.935, panelTop + H * 0.055, Math.min(W, H) * 0.042, 'EST. 2026');
    }

    /* Title block: eyebrow pill, chrome title, tagline pill — each on its
     * own line, never overlapping. */
    var titlePx = drawChromeTitle(ctx, state.title, W / 2, titleCy, W * 0.92, W * 0.105);
    if (state.eyebrow) {
      ctx.save();
      ctx.font = Math.round(titlePx * 0.24) + 'px Anton, sans-serif';
      var ebW = ctx.measureText(state.eyebrow).width;
      ctx.restore();
      var ebPx = Math.round(titlePx * 0.24);
      if ('letterSpacing' in ctx) ctx.letterSpacing = Math.max(2, ebPx * 0.14) + 'px';
      ctx.save();
      ctx.font = ebPx + 'px Anton, sans-serif';
      ebW = ctx.measureText(state.eyebrow).width;
      var ebPadX = ebPx * 0.9;
      var ebPadY = ebPx * 0.5;
      var ebBw = ebW + ebPadX * 2;
      var ebBh = ebPx + ebPadY * 2;
      var ebCy = titleCy - titlePx * 0.72 - ebBh / 2 - H * 0.008;
      roundRectPath(ctx, W / 2 - ebBw / 2, ebCy - ebBh / 2, ebBw, ebBh, ebBh / 2);
      ctx.fillStyle = 'rgba(10,8,18,0.82)';
      ctx.fill();
      ctx.fillStyle = GOLD;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(state.eyebrow, W / 2, ebCy + ebPx * 0.04);
      ctx.restore();
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    }
    if (state.tagline) {
      var tagPx = fitFontSize(ctx, state.tagline, 'Pacifico, cursive', Math.round(titlePx * 0.36), W * 0.8);
      drawPill(ctx, W / 2, titleCy + titlePx * 0.72 + tagPx * 0.9, state.tagline, tagPx, 'Pacifico, cursive', PAPER);
    }
    return canvas;
  }

  function coverCanvasFor(state, sizeKey) {
    var next = {};
    for (var k in state) next[k] = state[k];
    next.size = sizeKey;
    var size = SIZES[sizeKey] || SIZES.wide;
    var canvas = document.createElement('canvas');
    canvas.width = size.w;
    canvas.height = size.h;
    drawCover(canvas, next);
    return canvas;
  }

  window.CoverRender = {
    SIZES: SIZES,
    GRADE_NAMES: GRADE_NAMES,
    LAYOUT_NAMES: LAYOUT_NAMES,
    drawCover: drawCover,
    coverCanvasFor: coverCanvasFor,
    layoutPanels: layoutPanels,
    panelContains: panelContains,
    clearGradeCache: clearGradeCache
  };
})();

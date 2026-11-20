// Sunset Vice editor: photo tray, live canvas preview, layout and grade
// controls, lettering fields and one-click export in all three post sizes.
// The preview and the export share one renderer (drawCover in render.js),
// so the cover on screen is the cover a person downloads.

import {
  SAMPLE_PHOTOS,
  SIZES,
  LAYOUTS,
  GRADES,
  COVER_PRESETS,
  drawCover,
  panelAtPoint,
} from './render.js';
import { applyShot } from './shots.js';

const TAG_POOL = [
  'THE DRIVER',
  'THE ANGLER',
  'THE GETAWAY',
  'THE MOTEL',
  'THE CHOPPER',
  'THE GATOR',
  'THE LOOKOUT',
  'THE CAPTAIN',
  'THE RIDER',
];

const SURPRISE_TITLES = [
  'SUNSET CHASE',
  'NEON SHORES',
  'BOULEVARD QUEEN',
  'VICE NIGHTS',
  'MIDNIGHT HARBOR',
  'CORAL SKIES',
  'LAST LIGHT',
  'PALM ROYALE',
  'TIDEWATER',
  'GOLDEN HOUR',
];

const SURPRISE_TAGLINES = [
  'Live fast, shine brighter',
  'After dark, the city glows',
  'Chase the light',
  'Every street is a stage',
  'One city. No rules.',
  'Salt air and neon',
];

const SURPRISE_EYEBROWS = [
  'ONE CREW • SIX STORIES • ALL GOLDEN HOUR',
  'NINE LIVES • ONE HARBOR • ALL TRUE',
  'THREE SHORES • ONE LONG EVENING',
  'FIVE FRIENDS • ONE SUNSET • NO BRAKES',
];

const SURPRISE_QUOTES = [
  ['A love letter to the golden hour', 'THE COAST REVIEW'],
  ['Salt air and neon in every frame', 'THE BAY HERALD'],
  ['Every frame smells like salt and gasoline', 'THE COAST REVIEW'],
  ['The sunset never looked this good', 'THE BAY HERALD'],
];

function clonePreset(preset) {
  return {
    title: preset.title,
    tagline: preset.tagline,
    eyebrow: preset.eyebrow,
    quote: preset.quote,
    quoteSource: preset.quoteSource,
    layout: preset.layout,
    grade: preset.grade,
    band: preset.band,
    sealPanel: preset.sealPanel,
    panels: preset.panels.map((p) => ({ ...p })),
  };
}

// Editor state starts as the Palm Royale cover in landscape.
const state = {
  sizeKey: 'landscape',
  selected: 0,
  ...clonePreset(COVER_PRESETS.palm),
};

const images = new Map();
const customPhotos = [];
let customCount = 0;

const canvas = document.getElementById('coverCanvas');
const ctx = canvas.getContext('2d');
const tray = document.getElementById('photoTray');
const selectedName = document.getElementById('selectedName');
const panelTag = document.getElementById('panelTag');
const panelZoom = document.getElementById('panelZoom');
const zoomValue = document.getElementById('zoomValue');

function previewSize() {
  if (state.sizeKey === 'square') return { w: 620, h: 620 };
  if (state.sizeKey === 'portrait') return { w: 540, h: 675 };
  return { w: 960, h: 540 };
}

function selectedPanel() {
  return state.panels[state.selected];
}

function renderPreview(boxes) {
  const { w, h } = previewSize();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(ctx, state, w, h, images, boxes || null);
}

function refreshSelectedPanel() {
  const panel = selectedPanel();
  const photo = SAMPLE_PHOTOS.find((p) => p.key === panel.photo)
    || customPhotos.find((p) => p.key === panel.photo);
  selectedName.textContent = `Panel ${state.selected + 1} of ${state.panels.length} — ${photo ? photo.label : panel.photo}`;
  panelTag.value = panel.tag || '';
  panelZoom.value = String(panel.zoom || 1);
  zoomValue.textContent = `${(panel.zoom || 1).toFixed(2)}×`;
  tray.querySelectorAll('.thumb').forEach((el) => {
    el.classList.toggle('active', el.dataset.photo === panel.photo);
  });
}

function redraw() {
  renderPreview();
  refreshSelectedPanel();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`photo failed to load: ${src}`));
    img.src = src;
  });
}

async function loadSamples() {
  const jobs = SAMPLE_PHOTOS.map(async (photo) => {
    const img = await loadImage(`samples/${photo.key}.jpg`);
    images.set(photo.key, img);
  });
  await Promise.all(jobs);
}

function buildTray() {
  tray.innerHTML = '';
  const all = [...SAMPLE_PHOTOS, ...customPhotos];
  all.forEach((photo) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumb';
    button.dataset.photo = photo.key;
    const img = document.createElement('img');
    img.src = photo.src || `samples/${photo.key}.jpg`;
    img.alt = photo.label;
    img.draggable = false;
    const label = document.createElement('span');
    label.textContent = photo.label;
    button.append(img, label);
    button.addEventListener('click', () => {
      selectedPanel().photo = photo.key;
      redraw();
    });
    tray.append(button);
  });
  refreshSelectedPanel();
}

function buildLayoutButtons() {
  const grid = document.getElementById('layoutGrid');
  grid.innerHTML = '';
  Object.entries(LAYOUTS).forEach(([key, layout]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'layout-btn';
    button.dataset.layout = key;
    button.textContent = layout.name;
    button.addEventListener('click', () => setLayout(key));
    grid.append(button);
  });
  syncLayoutButtons();
}

function syncLayoutButtons() {
  document.querySelectorAll('.layout-btn').forEach((el) => {
    el.classList.toggle('selected', el.dataset.layout === state.layout);
  });
}

function setLayout(key) {
  const count = LAYOUTS[key].count;
  const old = state.panels;
  const next = [];
  for (let i = 0; i < count; i++) {
    if (old[i]) {
      next.push(old[i]);
    } else {
      const donor = old[i % old.length];
      next.push({
        photo: donor.photo,
        tag: TAG_POOL[i] || '',
        cx: 0.5,
        cy: 0.4,
        zoom: 1,
        tagTop: key === 'diagonal',
      });
    }
  }
  next.forEach((p) => {
    p.tagTop = key === 'diagonal';
  });
  state.panels = next;
  state.layout = key;
  state.band = key === 'grid3' ? 'dark' : 'sunset';
  state.sealPanel = count - 1;
  state.selected = Math.min(state.selected, count - 1);
  syncLayoutButtons();
  redraw();
}

function buildGradeSelect() {
  const select = document.getElementById('gradeSelect');
  select.innerHTML = '';
  Object.entries(GRADES).forEach(([key, grade]) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = grade.name;
    select.append(option);
  });
  select.value = state.grade;
  select.addEventListener('change', () => {
    state.grade = select.value;
    renderPreview();
  });
}

function buildSizePills() {
  const row = document.getElementById('sizePills');
  row.innerHTML = '';
  Object.entries(SIZES).forEach(([key, size]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'size-pill';
    button.dataset.size = key;
    button.textContent = size.label;
    button.addEventListener('click', () => setSize(key));
    row.append(button);
  });
  syncSizePills();
}

function syncSizePills() {
  document.querySelectorAll('.size-pill').forEach((el) => {
    el.classList.toggle('selected', el.dataset.size === state.sizeKey);
  });
}

function setSize(key) {
  state.sizeKey = key;
  syncSizePills();
  renderPreview();
}

function bindLettering() {
  const fields = [
    ['titleInput', 'title'],
    ['taglineInput', 'tagline'],
    ['eyebrowInput', 'eyebrow'],
    ['quoteInput', 'quote'],
    ['quoteSourceInput', 'quoteSource'],
  ];
  fields.forEach(([id, key]) => {
    const el = document.getElementById(id);
    el.value = state[key];
    el.addEventListener('input', () => {
      state[key] = el.value;
      renderPreview();
    });
  });
}

function syncLettering() {
  const fields = [
    ['titleInput', 'title'],
    ['taglineInput', 'tagline'],
    ['eyebrowInput', 'eyebrow'],
    ['quoteInput', 'quote'],
    ['quoteSourceInput', 'quoteSource'],
  ];
  fields.forEach(([id, key]) => {
    document.getElementById(id).value = state[key];
  });
  document.getElementById('gradeSelect').value = state.grade;
  syncLayoutButtons();
  syncSizePills();
}

function setPreset(name) {
  const preset = COVER_PRESETS[name];
  if (!preset) return;
  const fresh = clonePreset(preset);
  Object.assign(state, fresh);
  state.sizeKey = preset.sizeKey;
  state.selected = 0;
  syncLettering();
  redraw();
}

function surpriseMe() {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const layoutKeys = Object.keys(LAYOUTS);
  const gradeKeys = Object.keys(GRADES);
  state.title = pick(SURPRISE_TITLES);
  state.tagline = pick(SURPRISE_TAGLINES);
  state.eyebrow = pick(SURPRISE_EYEBROWS);
  const [quote, quoteSource] = pick(SURPRISE_QUOTES);
  state.quote = quote;
  state.quoteSource = quoteSource;
  state.grade = pick(gradeKeys);
  setLayout(pick(layoutKeys));
  const pool = [...SAMPLE_PHOTOS.map((p) => p.key)];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  state.panels.forEach((panel, i) => {
    panel.photo = pool[i % pool.length];
    panel.cx = 0.3 + Math.random() * 0.4;
    panel.cy = 0.25 + Math.random() * 0.35;
    panel.zoom = 1 + Math.random() * 0.4;
  });
  syncLettering();
  redraw();
}

function renderCoverToCanvas(cover, w, h) {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off.getContext('2d'), cover, w, h, images, null);
  return off;
}

function downloadCanvas(off, filename) {
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      resolve(true);
    }, 'image/png');
  });
}

async function exportAllSizes() {
  const button = document.getElementById('exportBtn');
  button.disabled = true;
  const label = button.textContent;
  button.textContent = 'Exporting…';
  try {
    for (const [key, size] of Object.entries(SIZES)) {
      const off = renderCoverToCanvas(state, size.w, size.h);
      await downloadCanvas(off, `sunset-vice-${size.w}x${size.h}.png`);
      await new Promise((r) => setTimeout(r, 120));
    }
  } finally {
    button.textContent = label;
    button.disabled = false;
  }
}

function bindCanvasEditing() {
  let drag = null;
  const toCanvasPoint = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  };
  canvas.addEventListener('pointerdown', (event) => {
    const p = toCanvasPoint(event);
    const qh = Math.round(canvas.height * 0.056);
    const bandH = Math.round(canvas.height * 0.058);
    const billH = Math.round(canvas.height * 0.044);
    const photoH = canvas.height - bandH - billH - qh;
    const idx = panelAtPoint(state, p.x, p.y, canvas.width, canvas.height, qh, photoH);
    if (idx < 0) return;
    state.selected = idx;
    refreshSelectedPanel();
    const panel = selectedPanel();
    drag = { x: p.x, y: p.y, cx: panel.cx, cy: panel.cy };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const p = toCanvasPoint(event);
    const panel = selectedPanel();
    const img = images.get(panel.photo);
    if (!img) return;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const qh = Math.round(canvas.height * 0.056);
    const bandH = Math.round(canvas.height * 0.058);
    const billH = Math.round(canvas.height * 0.044);
    const photoH = canvas.height - bandH - billH - qh;
    // Panel rect in preview pixels, from the same geometry the renderer uses.
    const rect = previewPanelRect(state.selected, qh, photoH);
    if (!rect) return;
    const base = Math.max(rect.w / iw, rect.h / ih);
    const scale = base * (panel.zoom || 1);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = p.x - drag.x;
    const dy = p.y - drag.y;
    if (Math.abs(rect.w - dw) > 0.5) {
      panel.cx = Math.min(1, Math.max(0, drag.cx + dx / (rect.w - dw)));
    }
    if (Math.abs(rect.h - dh) > 0.5) {
      panel.cy = Math.min(1, Math.max(0, drag.cy + dy / (rect.h - dh)));
    }
    renderPreview();
  });
  const endDrag = () => {
    drag = null;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const panel = selectedPanel();
    const zoom = (panel.zoom || 1) * Math.exp(-event.deltaY * 0.0012);
    panel.zoom = Math.min(3, Math.max(1, zoom));
    panelZoom.value = String(panel.zoom);
    zoomValue.textContent = `${panel.zoom.toFixed(2)}×`;
    renderPreview();
  }, { passive: false });
}

// Preview-space rectangle of one panel, mirroring render.js geometry.
function previewPanelRect(index, photoTop, photoH) {
  if (state.layout === 'diagonal') {
    const s = canvas.width * 0.045;
    const b1 = canvas.width / 3;
    const b2 = (canvas.width * 2) / 3;
    const boxes = [
      { x: 0, y: photoTop, w: b1 + s, h: photoH },
      { x: b1 - s, y: photoTop, w: b2 - b1 + s * 2, h: photoH },
      { x: b2 - s, y: photoTop, w: canvas.width - b2 + s, h: photoH },
    ];
    return boxes[index] || null;
  }
  const g = Math.max(3, Math.round(canvas.width * 0.004));
  const w = canvas.width;
  const y = photoTop;
  const h = photoH;
  if (state.layout === 'grid3') {
    const cw = (w - g * 2) / 3;
    const ch = (h - g * 2) / 3;
    const r = Math.floor(index / 3);
    const c = index % 3;
    return { x: c * (cw + g), y: y + r * (ch + g), w: cw, h: ch };
  }
  if (state.layout === 'hero2') {
    const heroW = Math.round(w * 0.66);
    const sh = (h - g) / 2;
    if (index === 0) return { x: 0, y, w: heroW, h };
    return { x: heroW + g, y: y + (index - 1) * (sh + g), w: w - heroW - g, h: sh };
  }
  const heroW = Math.round(w * 0.62);
  const sideX = heroW + g;
  const sw = (w - heroW - g * 2) / 2;
  const sh = (h - g) / 2;
  if (index === 0) return { x: 0, y, w: heroW, h };
  const col = (index - 1) % 2;
  const row = Math.floor((index - 1) / 2);
  return { x: sideX + col * (sw + g), y: y + row * (sh + g), w: sw, h: sh };
}

function bindControls() {
  document.getElementById('surpriseBtn').addEventListener('click', surpriseMe);
  document.getElementById('exportBtn').addEventListener('click', exportAllSizes);
  document.getElementById('fillAllBtn').addEventListener('click', () => {
    const photo = selectedPanel().photo;
    state.panels.forEach((panel) => {
      panel.photo = photo;
    });
    redraw();
  });
  panelTag.addEventListener('input', () => {
    selectedPanel().tag = panelTag.value.toUpperCase();
    renderPreview();
  });
  panelZoom.addEventListener('input', () => {
    selectedPanel().zoom = Number(panelZoom.value);
    zoomValue.textContent = `${selectedPanel().zoom.toFixed(2)}×`;
    renderPreview();
  });
  const fileInput = document.getElementById('photoInput');
  document.getElementById('addPhotosBtn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const files = [...fileInput.files].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    let pending = files.length;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        customCount += 1;
        const key = `custom${customCount}`;
        const label = file.name.replace(/\.[^.]+$/, '').slice(0, 18) || `Photo ${customCount}`;
        loadImage(reader.result)
          .then((img) => {
            images.set(key, img);
            customPhotos.push({ key, label, src: reader.result });
            selectedPanel().photo = key;
            buildTray();
            redraw();
          })
          .catch(() => { /* unreadable file: skip it */ })
          .finally(() => {
            pending -= 1;
            if (pending === 0) fileInput.value = '';
          });
      };
      reader.readAsDataURL(file);
    });
  });
}

async function init() {
  buildTray();
  buildLayoutButtons();
  buildGradeSelect();
  buildSizePills();
  bindLettering();
  bindControls();
  bindCanvasEditing();
  await loadSamples();
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.load('700 20px Arial'),
      document.fonts.ready,
    ]);
  } catch (e) { /* system fonts stand in if a webfont fails */ }
  buildTray();
  redraw();

  // Hooks the screenshot scenes and the verification pass use. The app
  // itself never needs them; they only read state and re-render.
  window.__sunsetVice = {
    state,
    images,
    drawCover,
    renderPreview,
    setPreset,
    setSize,
    renderCoverToCanvas,
    async exportSizesForCheck() {
      const out = {};
      for (const [key, size] of Object.entries(SIZES)) {
        const off = renderCoverToCanvas(state, size.w, size.h);
        const blob = await new Promise((r) => off.toBlob(r, 'image/png'));
        out[key] = { w: size.w, h: size.h, bytes: blob ? blob.size : 0 };
      }
      return out;
    },
  };

  const query = new URLSearchParams(window.location.search);
  if (query.has('shot')) {
    await applyShot(query, {
      state,
      images,
      canvas,
      setPreset,
      setSize,
      syncLettering,
      renderPreview,
    });
  } else {
    window.__shotReady = true;
  }
}

init().catch((error) => {
  console.error(error);
  window.__shotError = String(error);
});

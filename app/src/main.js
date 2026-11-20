// Sunset Vice editor: state, photo tray, per-panel editing, export.
// The cover itself is drawn by render.js; this file only wires the UI.
import {
  SIZES, SAMPLES, GRADES, PANEL_COUNT, defaultPanels, sampleById,
  panelRects, coverBars, drawCover,
} from './render.js';
import { SHOTS, shotFromQuery } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const ctx = canvas.getContext('2d');

const state = {
  size: 'landscape',
  layout: 'big4',
  grade: 'warm',
  band: 'sunset',
  title: 'PALM ROYALE',
  tagline: 'Live fast, shine brighter',
  eyebrow: 'ONE CREW • SIX STORIES • ALL GOLDEN HOUR',
  quote: 'A love letter to the golden hour',
  source: 'THE COAST REVIEW',
  panels: defaultPanels('big4'),
  selected: 0,
};

const images = new Map(); // photo id -> Image
const uploads = []; // { id, name }
let traySelected = 'boulevard';
let shotReady = false;

function getImage(id) {
  return images.get(id) ?? null;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function loadSamples() {
  const jobs = SAMPLES.map(async (s) => {
    const img = await loadImage(s.file);
    if (img) images.set(s.id, img);
  });
  await Promise.all(jobs);
}

function render() {
  const size = SIZES[state.size];
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  drawCover(ctx, size.w, size.h, state, getImage);
}

// ---------- photo tray ----------

function allPhotos() {
  return [
    ...SAMPLES.map((s) => ({ id: s.id, name: s.name, file: s.file })),
    ...uploads.map((u) => ({ id: u.id, name: u.name, file: u.url })),
  ];
}

function buildTray() {
  const tray = $('tray');
  tray.innerHTML = '';
  for (const p of allPhotos()) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = p.id === traySelected ? 'sel' : '';
    btn.title = p.name;
    const img = document.createElement('img');
    img.src = p.file;
    img.alt = p.name;
    const label = document.createElement('span');
    label.textContent = p.name;
    btn.append(img, label);
    btn.addEventListener('click', () => {
      traySelected = p.id;
      assignPhoto(state.selected, p.id);
      buildTray();
      syncPanelControls();
      render();
    });
    tray.append(btn);
  }
}

function assignPhoto(index, photoId) {
  const panel = state.panels[index];
  if (!panel) return;
  const sample = SAMPLES.find((s) => s.id === photoId);
  panel.photo = photoId;
  panel.role = sample ? sample.role : 'THE STAR';
  panel.zoom = 1;
  panel.fx = sample ? sample.fx : 0.5;
  panel.fy = sample ? sample.fy : 0.5;
}

function buildPanelPhotoSelect() {
  const sel = $('panelPhoto');
  sel.innerHTML = '';
  for (const p of allPhotos()) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    sel.append(opt);
  }
}

function syncPanelControls() {
  const panel = state.panels[state.selected];
  if (!panel) return;
  buildPanelPhotoSelect();
  $('panelPhoto').value = panel.photo;
  $('panelZoom').value = Math.round((panel.zoom || 1) * 100);
  $('panelRole').value = panel.role;
}

function syncLettering() {
  $('titleInput').value = state.title;
  $('taglineInput').value = state.tagline;
  $('eyebrowInput').value = state.eyebrow;
  $('quoteInput').value = state.quote;
  $('sourceInput').value = state.source;
}

function syncToggles() {
  document.querySelectorAll('#sizePills button').forEach((b) => {
    b.classList.toggle('on', b.dataset.size === state.size);
  });
  document.querySelectorAll('#layoutBtns button').forEach((b) => {
    b.classList.toggle('on', b.dataset.layout === state.layout);
  });
  $('gradeSelect').value = state.grade;
}

// ---------- layout changes ----------

function setLayout(layout) {
  const keep = state.panels;
  const fresh = defaultPanels(layout);
  state.layout = layout;
  state.panels = fresh.map((d, i) => keep[i] ?? d);
  state.selected = Math.min(state.selected, state.panels.length - 1);
  syncToggles();
  syncPanelControls();
  render();
}

// ---------- presets (screenshot scenes) ----------

function applyPreset(name) {
  const preset = SHOTS[name];
  if (!preset) return;
  state.layout = preset.layout;
  state.size = preset.size;
  state.grade = preset.grade;
  state.band = preset.band;
  state.title = preset.title;
  state.tagline = preset.tagline;
  state.eyebrow = preset.eyebrow;
  state.quote = preset.quote;
  state.source = preset.source;
  state.panels = preset.panels.map((p) => {
    const s = sampleById(p.photo);
    return {
      photo: p.photo,
      role: p.role,
      zoom: p.zoom ?? 1,
      fx: p.fx ?? s.fx,
      fy: p.fy ?? s.fy,
    };
  });
  state.selected = 0;
  if (preset.mode === 'cover') document.body.classList.add('shot-cover');
  syncToggles();
  syncLettering();
  syncPanelControls();
}

// ---------- canvas interaction ----------

function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function hitPanel(px, py) {
  const bars = coverBars(canvas.width, canvas.height);
  const rects = panelRects(state.layout, 0, bars.py0, canvas.width, bars.py1 - bars.py0);
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (px >= r.x && px <= r.x + r.w + (r.slant ?? 0) && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}

let drag = null;

canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const i = hitPanel(p.x, p.y);
  if (i < 0) return;
  state.selected = i;
  syncPanelControls();
  const panel = state.panels[i];
  const img = getImage(panel.photo);
  drag = { panel, img, lastX: p.x, lastY: p.y };
  canvas.setPointerCapture(e.pointerId);
  render();
});

canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const { panel, img } = drag;
  const dx = p.x - drag.lastX, dy = p.y - drag.lastY;
  drag.lastX = p.x;
  drag.lastY = p.y;
  if (!img) return;
  const bars = coverBars(canvas.width, canvas.height);
  const rects = panelRects(state.layout, 0, bars.py0, canvas.width, bars.py1 - bars.py0);
  const r = rects[state.selected];
  if (!r) return;
  const scale = Math.max(r.w / img.naturalWidth, r.h / img.naturalHeight) * (panel.zoom || 1);
  panel.fx = Math.min(1, Math.max(0, (panel.fx ?? 0.5) - dx / (img.naturalWidth * scale)));
  panel.fy = Math.min(1, Math.max(0, (panel.fy ?? 0.5) - dy / (img.naturalHeight * scale)));
  render();
});

for (const ev of ['pointerup', 'pointercancel']) {
  canvas.addEventListener(ev, () => { drag = null; });
}

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[state.selected];
  if (!panel) return;
  const next = (panel.zoom || 1) * (e.deltaY < 0 ? 1.12 : 1 / 1.12);
  panel.zoom = Math.min(3, Math.max(1, next));
  $('panelZoom').value = Math.round(panel.zoom * 100);
  render();
}, { passive: false });

// ---------- export ----------

function downloadPNG(sizeKey) {
  const size = SIZES[sizeKey];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  const saved = state.size;
  state.size = sizeKey;
  drawCover(off.getContext('2d'), size.w, size.h, state, getImage);
  state.size = saved;
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      if (!blob) return resolve();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `sunset-vice-${sizeKey}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve();
    }, 'image/png');
  });
}

async function exportAll() {
  for (const key of ['square', 'portrait', 'landscape']) {
    await downloadPNG(key);
    await new Promise((r) => setTimeout(r, 300));
  }
}

// ---------- surprise me ----------

const TITLES = ['PALM ROYALE', 'TIDEWATER', 'GOLDEN HOUR', 'NEON SHORES', 'SUNSET CHASE', 'VICE LIGHTS', 'CORAL DAWN', 'MIDNIGHT PIER'];
const TAGLINES = ['Live fast, shine brighter', 'After dark, the city glows', 'Chase the light', 'Every street is a stage', 'Salt air, neon nights', 'One crew, every sunset'];
const EYEBROWS = ['ONE CREW • SIX STORIES • ALL GOLDEN HOUR', 'NINE LIVES • ONE HARBOR • ALL TRUE', 'THREE SHORES • ONE LONG EVENING', 'FIVE FRIENDS • ONE CITY • NO RULES'];
const QUOTES = [
  ['A love letter to the golden hour', 'THE COAST REVIEW'],
  ['Salt air and neon in every frame', 'THE BAY HERALD'],
  ['Every frame smells like salt and gasoline', 'THE COAST REVIEW'],
  ['The sunset never looked this loud', 'THE BAY HERALD'],
];

function surprise() {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  state.title = pick(TITLES);
  state.tagline = pick(TAGLINES);
  state.eyebrow = pick(EYEBROWS);
  const [q, s] = pick(QUOTES);
  state.quote = q;
  state.source = s;
  state.grade = pick(Object.keys(GRADES));
  state.band = Math.random() < 0.7 ? 'sunset' : 'dark';
  const order = [...SAMPLES].sort(() => Math.random() - 0.5);
  const n = PANEL_COUNT[state.layout];
  state.panels = Array.from({ length: n }, (_, i) => {
    const sm = order[i % order.length];
    return { photo: sm.id, role: sm.role, zoom: 1, fx: sm.fx, fy: sm.fy };
  });
  syncToggles();
  syncLettering();
  syncPanelControls();
  render();
}

// ---------- wiring ----------

document.querySelectorAll('#sizePills button').forEach((b) => {
  b.addEventListener('click', () => {
    state.size = b.dataset.size;
    syncToggles();
    render();
  });
});

document.querySelectorAll('#layoutBtns button').forEach((b) => {
  b.addEventListener('click', () => setLayout(b.dataset.layout));
});

$('gradeSelect').addEventListener('change', (e) => {
  state.grade = e.target.value;
  render();
});

const lettering = [
  ['titleInput', 'title'], ['taglineInput', 'tagline'], ['eyebrowInput', 'eyebrow'],
  ['quoteInput', 'quote'], ['sourceInput', 'source'],
];
for (const [id, key] of lettering) {
  $(id).addEventListener('input', (e) => {
    state[key] = e.target.value;
    render();
  });
}

$('panelPhoto').addEventListener('change', (e) => {
  traySelected = e.target.value;
  assignPhoto(state.selected, e.target.value);
  buildTray();
  syncPanelControls();
  render();
});

$('panelZoom').addEventListener('input', (e) => {
  const panel = state.panels[state.selected];
  if (!panel) return;
  panel.zoom = Number(e.target.value) / 100;
  render();
});

$('panelRole').addEventListener('input', (e) => {
  const panel = state.panels[state.selected];
  if (!panel) return;
  panel.role = e.target.value.toUpperCase();
  render();
});

$('panelResetBtn').addEventListener('click', () => {
  const panel = state.panels[state.selected];
  if (!panel) return;
  const s = sampleById(panel.photo);
  panel.zoom = 1;
  panel.fx = s.fx;
  panel.fy = s.fy;
  syncPanelControls();
  render();
});

$('fillAllBtn').addEventListener('click', () => {
  state.panels.forEach((panel, i) => {
    const keep = panel.role;
    assignPhoto(i, traySelected);
    panel.role = keep;
  });
  render();
});

$('addPhotoBtn').addEventListener('click', () => $('fileInput').click());
$('fileInput').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    const url = URL.createObjectURL(file);
    const img = await loadImage(url);
    if (!img) continue;
    const id = `up${uploads.length + 1}`;
    images.set(id, img);
    uploads.push({ id, name: file.name.replace(/\.[^.]+$/, '').slice(0, 14) || 'Photo', url });
    traySelected = id;
  }
  e.target.value = '';
  buildTray();
  buildPanelPhotoSelect();
  render();
});

$('surpriseBtn').addEventListener('click', surprise);
$('exportAllBtn').addEventListener('click', exportAll);

// ---------- boot ----------

async function boot() {
  const shot = shotFromQuery();
  if (shot) applyPreset(shot);
  buildTray();
  syncToggles();
  syncLettering();
  syncPanelControls();
  try {
    await Promise.all([
      document.fonts.load('40px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.ready,
      loadSamples(),
    ]);
  } catch {
    await loadSamples();
  }
  render();
  if (!shotReady) {
    shotReady = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.__shotReady = true;
    }));
  }
}

boot();

// main.js — the Sunset Vice Cover Studio editor.
//
// The editor is a thin shell around drawCover (render.js): every control
// edits one shared cover state, and every change redraws the same canvas
// the PNG export uses, so the preview is the export.
//
// Photos never leave the machine: samples load from files under app/, and
// uploads are read with FileReader into object URLs.

import { drawCover, layoutPanels, panelAt, SIZES, LAYOUTS, GRADES } from './render.js';
import { SAMPLE_PHOTOS, DEFAULT_TAGS, shotState, defaultState } from './shots.js';

// ---------------------------------------------------------------- state

const params = new URLSearchParams(location.search);
const shot = Number(params.get('shot') || 0);
const shotMode = shot === 1 || shot === 3 || shot === 4;

const state = shotState(shot) || defaultState();

// Every photo the tray knows: the six samples plus anything uploaded.
const photos = [...SAMPLE_PHOTOS];
const images = new Map(); // photo id -> HTMLImageElement (loaded)
let uploadCount = 0;

// ---------------------------------------------------------------- dom

const $ = (sel) => document.querySelector(sel);
const canvas = $('#coverCanvas');
const ctx = canvas.getContext('2d');
const trayEl = $('#photoTray');
const panelInfoEl = $('#panelInfo');
const castTagEl = $('#castTag');
const zoomEl = $('#zoom');
const zoomValEl = $('#zoomVal');
const titleEl = $('#titleInput');
const taglineEl = $('#taglineInput');
const eyebrowEl = $('#eyebrowInput');
const quoteEl = $('#quoteInput');
const sourceEl = $('#sourceInput');
const gradeEl = $('#gradeSelect');
const fileEl = $('#fileInput');

// The preview's pixel size per cover size: big enough to look sharp, small
// enough to redraw instantly.
const PREVIEW = {
  square: { w: 720, h: 720 },
  portrait: { w: 648, h: 810 },
  landscape: { w: 960, h: 540 },
};

// ---------------------------------------------------------------- render

let lastBoxes = [];

function render() {
  const size = shotMode
    ? { w: window.innerWidth, h: window.innerHeight }
    : PREVIEW[state.size];
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  const boxes = [];
  drawCover(ctx, size.w, size.h, state, images, boxes);
  lastBoxes = boxes;
  window.__coverBoxes = boxes;
  window.__coverSize = { w: size.w, h: size.h };
  syncPanelControls();
}

function syncPanelControls() {
  const p = state.panels[state.selected];
  const photo = photos.find((ph) => ph.id === p?.photo);
  panelInfoEl.textContent = p
    ? `Panel ${state.selected + 1} of ${state.panels.length} — ${photo ? photo.name : 'Empty'}`
    : 'No panel selected';
  if (document.activeElement !== castTagEl) castTagEl.value = p?.tag ?? '';
  if (document.activeElement !== zoomEl) zoomEl.value = Math.round((p?.zoom ?? 1) * 100);
  zoomValEl.textContent = `${Math.round((p?.zoom ?? 1) * 100)}%`;
  syncTraySelection();
}

function syncTraySelection() {
  const p = state.panels[state.selected];
  for (const el of trayEl.querySelectorAll('.thumb')) {
    el.classList.toggle('selected', !!p && el.dataset.photo === p.photo);
  }
}

// ---------------------------------------------------------------- photos

function loadImage(photo) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      images.set(photo.id, img);
      resolve(true);
    };
    img.onerror = () => resolve(false);
    img.src = photo.src;
  });
}

function renderTray() {
  trayEl.innerHTML = '';
  for (const photo of photos) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb';
    btn.dataset.photo = photo.id;
    btn.title = photo.name;
    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = photo.name;
    img.draggable = false;
    const label = document.createElement('span');
    label.className = 'thumb-label';
    label.textContent = photo.name;
    btn.append(img, label);
    btn.addEventListener('click', () => assignPhoto(photo.id));
    trayEl.appendChild(btn);
  }
  syncTraySelection();
}

function assignPhoto(photoId) {
  const p = state.panels[state.selected];
  if (!p) return;
  p.photo = photoId;
  p.tag = DEFAULT_TAGS[photoId] ?? p.tag;
  p.zoom = 1;
  p.panX = 0;
  p.panY = 0;
  render();
}

function addUploads(files) {
  let firstId = null;
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    uploadCount += 1;
    const id = `upload-${uploadCount}`;
    const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || `Photo ${uploadCount}`;
    const photo = { id, name: name.slice(0, 24), src: URL.createObjectURL(file) };
    photos.push(photo);
    if (!firstId) firstId = id;
    loadImage(photo).then(() => render());
  }
  renderTray();
  if (firstId) assignPhoto(firstId);
}

// ---------------------------------------------------------------- layout

function setLayout(layout) {
  if (!LAYOUTS[layout]) return;
  const old = state.panels;
  const count = LAYOUTS[layout].panels;
  const next = [];
  for (let i = 0; i < count; i++) {
    const prev = old[i % old.length];
    const photoId = prev ? prev.photo : SAMPLE_PHOTOS[i % SAMPLE_PHOTOS.length].id;
    next.push({
      photo: photoId,
      tag: DEFAULT_TAGS[photoId] ?? '',
      tagPos: layout === 'diagonal' ? 'top' : 'bottom',
      zoom: 1,
      panX: 0,
      panY: 0,
    });
  }
  state.layout = layout;
  state.panels = next;
  state.selected = Math.min(state.selected, count - 1);
  for (const btn of document.querySelectorAll('[data-layout]')) {
    btn.classList.toggle('selected', btn.dataset.layout === layout);
  }
  render();
}

function setSize(size) {
  if (!SIZES[size]) return;
  state.size = size;
  for (const btn of document.querySelectorAll('[data-size]')) {
    btn.classList.toggle('selected', btn.dataset.size === size);
  }
  render();
}

// ---------------------------------------------------------------- surprise

const SURPRISE_TITLES = [
  'NEON SHORES', 'SUNSET CHASE', 'BOULEVARD QUEEN', 'VICE NIGHTS',
  'LEONIDA HEAT', 'MIDNIGHT PALMS', 'CORAL DRIVE', 'PALM ROYALE',
  'TIDEWATER', 'GOLDEN HOUR',
];
const SURPRISE_TAGLINES = [
  'Live fast, shine brighter', 'After dark, the city glows', 'Chase the light',
  'Every street is a stage', 'Salt air and neon', 'One city. No rules.',
  'Drive into the sunset', 'Where the night begins',
];
const SURPRISE_QUOTES = [
  ['A love letter to the golden hour', 'THE COAST REVIEW'],
  ['Salt air and neon in every frame', 'THE BAY HERALD'],
  ['Every frame smells like salt and gasoline', 'THE COAST REVIEW'],
  ['The sunset never looked this good', 'VICE WEEKLY'],
  ['A postcard you can drive through', 'THE BAY HERALD'],
];
const SURPRISE_STRIPS = [
  'ONE CREW • SIX STORIES • ALL GOLDEN HOUR',
  'NINE LIVES • ONE HARBOR • ALL TRUE',
  'THREE SHORES • ONE LONG EVENING',
  'FIVE FRIENDS • ONE SUNSET • NO SPEED LIMIT',
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function surprise() {
  const layouts = Object.keys(LAYOUTS);
  const layout = pick(layouts);
  const [quote, source] = pick(SURPRISE_QUOTES);
  state.title = pick(SURPRISE_TITLES);
  state.tagline = pick(SURPRISE_TAGLINES);
  state.eyebrow = pick(SURPRISE_STRIPS);
  state.quote = quote;
  state.source = source;
  state.band = Math.random() < 0.3 ? 'dark' : 'sunset';
  state.grade = Math.random() < 0.75 ? 'warm' : pick(Object.keys(GRADES));
  const pool = [...photos];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  setLayout(layout);
  state.panels.forEach((p, i) => {
    const photo = pool[i % pool.length];
    p.photo = photo.id;
    p.tag = DEFAULT_TAGS[photo.id] ?? p.tag;
    p.zoom = 1 + Math.random() * 0.4;
    p.panX = (Math.random() - 0.5) * 0.6;
    p.panY = (Math.random() - 0.5) * 0.6;
  });
  syncLetteringInputs();
  gradeEl.value = state.grade;
  render();
}

function syncLetteringInputs() {
  titleEl.value = state.title;
  taglineEl.value = state.tagline;
  eyebrowEl.value = state.eyebrow;
  quoteEl.value = state.quote;
  sourceEl.value = state.source;
}

// ---------------------------------------------------------------- export

// Render the cover at a full export size and return its PNG bytes.
function exportPNG(sizeKey) {
  const size = SIZES[sizeKey];
  if (!size) return Promise.reject(new Error(`unknown size ${sizeKey}`));
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off.getContext('2d'), size.w, size.h, state, images, null);
  return new Promise((resolve, reject) => {
    off.toBlob((blob) => {
      if (!blob) {
        reject(new Error('PNG export failed'));
        return;
      }
      blob.arrayBuffer().then((buf) => {
        resolve({ size: sizeKey, width: size.w, height: size.h, bytes: buf.byteLength, blob });
      });
    }, 'image/png');
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function exportAll() {
  for (const key of ['square', 'portrait', 'landscape']) {
    const { blob, width, height } = await exportPNG(key);
    downloadBlob(blob, `sunset-vice-cover-${width}x${height}.png`);
    await new Promise((r) => setTimeout(r, 250));
  }
}

// ---------------------------------------------------------------- canvas input

function canvasPoint(ev) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((ev.clientX - rect.left) / rect.width) * canvas.width,
    y: ((ev.clientY - rect.top) / rect.height) * canvas.height,
  };
}

let drag = null;

canvas.addEventListener('pointerdown', (ev) => {
  if (shotMode) return;
  const pt = canvasPoint(ev);
  const idx = panelAt(state.layout, canvas.width, canvas.height, pt.x, pt.y);
  if (idx < 0) return;
  state.selected = idx;
  drag = { x: pt.x, y: pt.y, panX: state.panels[idx].panX, panY: state.panels[idx].panY };
  canvas.setPointerCapture(ev.pointerId);
  canvas.classList.add('dragging');
  render();
});

canvas.addEventListener('pointermove', (ev) => {
  if (!drag) return;
  const pt = canvasPoint(ev);
  const p = state.panels[state.selected];
  const panels = layoutPanels(state.layout, canvas.width, canvas.height);
  const panel = panels[state.selected];
  const dx = (pt.x - drag.x) / panel.w;
  const dy = (pt.y - drag.y) / panel.h;
  p.panX = Math.max(-1, Math.min(1, drag.panX + dx * 2));
  p.panY = Math.max(-1, Math.min(1, drag.panY + dy * 2));
  render();
});

function endDrag() {
  drag = null;
  canvas.classList.remove('dragging');
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

canvas.addEventListener('wheel', (ev) => {
  if (shotMode) return;
  ev.preventDefault();
  const pt = canvasPoint(ev);
  const idx = panelAt(state.layout, canvas.width, canvas.height, pt.x, pt.y);
  if (idx < 0) return;
  state.selected = idx;
  const p = state.panels[idx];
  p.zoom = Math.max(1, Math.min(3.5, p.zoom * Math.pow(1.0015, -ev.deltaY)));
  render();
}, { passive: false });

// ---------------------------------------------------------------- wire up

for (const btn of document.querySelectorAll('[data-layout]')) {
  btn.addEventListener('click', () => setLayout(btn.dataset.layout));
}
for (const btn of document.querySelectorAll('[data-size]')) {
  btn.addEventListener('click', () => setSize(btn.dataset.size));
}
gradeEl.addEventListener('change', () => {
  state.grade = gradeEl.value;
  render();
});
for (const [el, key] of [
  [titleEl, 'title'], [taglineEl, 'tagline'], [eyebrowEl, 'eyebrow'],
  [quoteEl, 'quote'], [sourceEl, 'source'],
]) {
  el.addEventListener('input', () => {
    state[key] = el.value;
    render();
  });
}
castTagEl.addEventListener('input', () => {
  const p = state.panels[state.selected];
  if (p) {
    p.tag = castTagEl.value;
    render();
  }
});
zoomEl.addEventListener('input', () => {
  const p = state.panels[state.selected];
  if (p) {
    p.zoom = Number(zoomEl.value) / 100;
    render();
  }
});
$('#addPhotosBtn').addEventListener('click', () => fileEl.click());
fileEl.addEventListener('change', () => {
  addUploads([...fileEl.files]);
  fileEl.value = '';
});
$('#fillAllBtn').addEventListener('click', () => {
  const p = state.panels[state.selected];
  if (!p) return;
  for (const panel of state.panels) panel.photo = p.photo;
  render();
});
$('#surpriseBtn').addEventListener('click', surprise);
$('#exportAllBtn').addEventListener('click', exportAll);

// ---------------------------------------------------------------- boot

async function boot() {
  if (shotMode) document.body.classList.add('shot-cover');
  if (shot === 2) document.body.classList.add('shot-editor');
  renderTray();
  syncLetteringInputs();
  gradeEl.value = state.grade;
  for (const btn of document.querySelectorAll('[data-layout]')) {
    btn.classList.toggle('selected', btn.dataset.layout === state.layout);
  }
  for (const btn of document.querySelectorAll('[data-size]')) {
    btn.classList.toggle('selected', btn.dataset.size === state.size);
  }
  // Fonts first (the lettering is the cover), then the sample photos.
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.ready,
    ]);
  } catch { /* fall back to system fonts; the cover still draws */ }
  await Promise.all(SAMPLE_PHOTOS.map(loadImage));
  render();
  window.__shotReady = true;
  window.__studio = {
    state,
    photos,
    exportPNG,
    exportAll,
    surprise,
    setLayout,
    setSize,
    assignPhoto,
    render,
    boxes: () => lastBoxes,
  };
}

boot();

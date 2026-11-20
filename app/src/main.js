// Vice Sunset Cover Studio — wires the editor: photos, panels, layout,
// grades, lettering, decorations, export. The preview canvas and the
// exported PNG both go through drawCover in render.js, so what you see is
// what the PNG holds.
import { drawCover, panelRects, LAYOUTS, GRADES, GRADE_IDS, LAYOUT_IDS, defaultState, defaultPanel } from './render.js';
import { runShot } from './shots.js';

const TITLES = [
  ['PALM ROYALE', 'Live fast, shine brighter'],
  ['GOLDEN HOUR', 'Chase the light'],
  ['TIDEWATER', 'After dark, the city glows'],
  ['VELVET PALMS', 'Soft light, sharp edges'],
  ['SALT AIR SOCIAL', 'Every hour is golden'],
  ['MIDNIGHT MARINA', 'The tide never sleeps'],
  ['CORAL SKYLINE', 'Where the city meets the sea'],
  ['LAST LIGHT CLUB', 'Members only, sunset only'],
];

const ASPECTS = {
  square: { label: 'Square 1:1', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 4:5', w: 1080, h: 1350 },
  wide: { label: 'Landscape 16:9', w: 1920, h: 1080 },
};

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const statusEl = $('status');

const state = defaultState();
let photos = []; // { img, name } — samples first, uploads appended
let aspect = 'wide';
let selected = 0; // selected panel index
let dragging = null; // { x, y, cx, cy }

function setStatus(msg) { statusEl.textContent = msg; }

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function redraw() {
  drawCover(preview, photos.map((p) => p.img), state);
  updatePanelUI();
}

function updatePanelUI() {
  const panel = state.panels[selected] || state.panels[0];
  $('panelLabel').textContent = `Panel ${selected + 1} of ${state.panels.length}`;
  $('panelGrade').value = panel.grade;
  $('zoomRange').value = panel.zoom;
  $('zoomVal').textContent = `${panel.zoom.toFixed(1)}x`;
  document.querySelectorAll('.layout-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  document.querySelectorAll('.aspect-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.aspect === aspect);
  });
  document.querySelectorAll('.tray-thumb').forEach((t, i) => {
    t.classList.toggle('assigned', panel.photo === i);
  });
}

function ensurePanels() {
  const count = (LAYOUTS[state.layout] || LAYOUTS.hero4).cells.length;
  while (state.panels.length < count) {
    const src = state.panels[state.panels.length - 1] || defaultPanel(0);
    state.panels.push({ ...src });
  }
  state.panels.length = count;
  selected = Math.min(selected, count - 1);
}

// --- Photo tray ---
function buildTray() {
  const tray = $('photoTray');
  tray.innerHTML = '';
  photos.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tray-thumb';
    b.title = `${p.name} — click to put in the selected panel`;
    const img = document.createElement('img');
    img.src = p.img.src;
    img.alt = p.name;
    b.appendChild(img);
    b.appendChild(Object.assign(document.createElement('span'), { textContent: p.name }));
    b.addEventListener('click', () => {
      state.panels[selected].photo = i;
      redraw();
      setStatus(`${p.name} → panel ${selected + 1}`);
    });
    tray.appendChild(b);
  });
}

$('upload').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  for (const f of files) {
    try {
      const img = await loadImage(URL.createObjectURL(f));
      photos.push({ img, name: f.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Photo' });
    } catch (err) { setStatus(`Could not read ${f.name}`); }
  }
  buildTray();
  redraw();
  setStatus(`${files.length} photo(s) added — click one to put it in the selected panel`);
  e.target.value = '';
});

$('fillAll').addEventListener('click', () => {
  const photo = state.panels[selected].photo;
  state.panels.forEach((p) => { p.photo = photo; });
  redraw();
  setStatus(`All panels now show photo ${photo + 1} — vary each panel's grade to make them read as different shots`);
});

// --- Panel interaction on the preview canvas ---
function canvasPoint(e) {
  const r = preview.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (preview.width / r.width),
    y: (e.clientY - r.top) * (preview.height / r.height),
  };
}

function hitPanel(p) {
  const rects = panelRects(preview, state);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return i;
  }
  return -1;
}

preview.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const i = hitPanel(p);
  if (i < 0) return;
  selected = i;
  const panel = state.panels[i];
  dragging = { x: p.x, y: p.y, cx: panel.cx, cy: panel.cy };
  preview.setPointerCapture(e.pointerId);
  redraw();
});

preview.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const p = canvasPoint(e);
  const panel = state.panels[selected];
  const rects = panelRects(preview, state);
  const r = rects[selected];
  const img = photos[panel.photo] ? photos[panel.photo].img : null;
  if (!img || !r) return;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const panelAspect = r.w / r.h;
  const imgAspect = iw / ih;
  let sw, sh;
  if (imgAspect > panelAspect) { sh = ih; sw = ih * panelAspect; } else { sw = iw; sh = iw / panelAspect; }
  sw /= panel.zoom; sh /= panel.zoom;
  panel.cx = Math.max(0, Math.min(1, dragging.cx - ((p.x - dragging.x) * sw / r.w) / iw));
  panel.cy = Math.max(0, Math.min(1, dragging.cy - ((p.y - dragging.y) * sh / r.h) / ih));
  redraw();
});

preview.addEventListener('pointerup', () => { dragging = null; });
preview.addEventListener('pointerleave', () => { dragging = null; });

preview.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[selected];
  panel.zoom = Math.max(1, Math.min(3.5, panel.zoom * (e.deltaY < 0 ? 1.12 : 0.89)));
  redraw();
}, { passive: false });

// --- Panel controls ---
$('panelGrade').addEventListener('change', (e) => {
  state.panels[selected].grade = e.target.value;
  redraw();
});
$('zoomRange').addEventListener('input', (e) => {
  state.panels[selected].zoom = parseFloat(e.target.value);
  redraw();
});
$('flipBtn').addEventListener('click', () => {
  state.panels[selected].flip = !state.panels[selected].flip;
  redraw();
});
$('prevPanel').addEventListener('click', () => {
  selected = (selected - 1 + state.panels.length) % state.panels.length;
  redraw();
});
$('nextPanel').addEventListener('click', () => {
  selected = (selected + 1) % state.panels.length;
  redraw();
});

// --- Layout / grade / lettering / decorations ---
document.querySelectorAll('.layout-btn').forEach((b) => {
  b.addEventListener('click', () => {
    state.layout = b.dataset.layout;
    ensurePanels();
    redraw();
    setStatus(`Layout: ${LAYOUTS[state.layout].label}`);
  });
});

$('globalGrade').addEventListener('change', (e) => {
  state.panels.forEach((p) => { p.grade = e.target.value; });
  redraw();
  setStatus(`Grade ${GRADES[e.target.value].label} applied to every panel`);
});

$('titleInput').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('taglineInput').addEventListener('input', (e) => { state.tagline = e.target.value; redraw(); });
$('eyebrowInput').addEventListener('input', (e) => { state.eyebrow = e.target.value; redraw(); });
$('quoteInput').addEventListener('input', (e) => { state.quote = e.target.value; redraw(); });
$('quoteSourceInput').addEventListener('input', (e) => { state.quoteSource = e.target.value; redraw(); });
$('bannerSelect').addEventListener('change', (e) => { state.banner = e.target.value; redraw(); });

document.querySelectorAll('[data-deco]').forEach((c) => {
  c.addEventListener('change', () => {
    state.deco[c.dataset.deco] = c.checked;
    redraw();
  });
});

document.querySelectorAll('.aspect-btn').forEach((b) => {
  b.addEventListener('click', () => {
    aspect = b.dataset.aspect;
    preview.width = ASPECTS[aspect].w;
    preview.height = ASPECTS[aspect].h;
    redraw();
  });
});

$('surprise').addEventListener('click', () => {
  const [title, tagline] = TITLES[Math.floor(Math.random() * TITLES.length)];
  state.title = title;
  state.tagline = tagline;
  state.layout = LAYOUT_IDS[Math.floor(Math.random() * LAYOUT_IDS.length)];
  const grade = GRADE_IDS[Math.floor(Math.random() * GRADE_IDS.length)];
  state.panels.forEach((p) => { p.grade = grade; });
  state.banner = Math.random() < 0.5 ? 'sunset' : 'navy';
  ensurePanels();
  $('titleInput').value = title;
  $('taglineInput').value = tagline;
  $('globalGrade').value = grade;
  $('bannerSelect').value = state.banner;
  redraw();
  setStatus(`Surprise: ${title} — ${LAYOUTS[state.layout].label}, ${GRADES[grade].label} grade`);
});

// --- Export ---
function exportSize(key) {
  const a = ASPECTS[key];
  const c = document.createElement('canvas');
  c.width = a.w; c.height = a.h;
  drawCover(c, photos.map((p) => p.img), state);
  c.toBlob((blob) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cover-${a.w}x${a.h}.png`;
    link.click();
    setStatus(`Saved cover-${a.w}x${a.h}.png`);
  }, 'image/png');
}

$('expSquare').addEventListener('click', () => exportSize('square'));
$('expPortrait').addEventListener('click', () => exportSize('portrait'));
$('expWide').addEventListener('click', () => exportSize('wide'));
$('expAll').addEventListener('click', () => {
  ['square', 'portrait', 'wide'].forEach((k, i) => setTimeout(() => exportSize(k), i * 400));
  setStatus('Exporting all three sizes…');
});

// --- Boot ---
async function boot() {
  // Fonts first, so the first paint already uses the display face.
  try {
    await Promise.all([
      document.fonts.load('40px Anton'),
      document.fonts.load('20px Pacifico'),
      document.fonts.ready,
    ]);
  } catch (e) { /* fall back to system fonts */ }
  const [b, p, c, m, h, a] = await Promise.all([
    loadImage('samples/boulevard.jpg'),
    loadImage('samples/pier.jpg'),
    loadImage('samples/convertible.jpg'),
    loadImage('samples/motel.jpg'),
    loadImage('samples/helicopter.jpg'),
    loadImage('samples/alligator.jpg'),
  ]);
  photos = [
    { img: b, name: 'Boulevard' },
    { img: p, name: 'Pier' },
    { img: c, name: 'Convertible' },
    { img: m, name: 'Motel' },
    { img: h, name: 'Helicopter' },
    { img: a, name: 'Alligator' },
  ];
  buildTray();
  preview.width = ASPECTS[aspect].w;
  preview.height = ASPECTS[aspect].h;

  const query = new URLSearchParams(location.search);
  if (query.get('shot')) {
    await runShot(query.get('shot'), query, { photos, state, redraw, loadImage });
  } else {
    redraw();
  }
}

boot();

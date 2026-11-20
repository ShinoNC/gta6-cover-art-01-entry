/* Sunset Vice - Cover Studio: the editor.
 *
 * Owns the app state (photos, panel slots, layout, grade, lettering),
 * wires the studio UI to it, and paints the live preview with the same
 * CoverRender.drawCover the export uses. Photos never leave the machine:
 * uploads are read with FileReader into object URLs and drawn locally.
 */
(function () {
  'use strict';

  /* The six sample photos shipped under app/samples/. Each carries the
   * cast role its panel tag shows by default. */
  var SAMPLES = [
    { id: 'boulevard', name: 'Boulevard', role: 'THE DRIVER', file: 'samples/boulevard.jpg' },
    { id: 'pier', name: 'Pier', role: 'THE ANGLER', file: 'samples/pier.jpg' },
    { id: 'convertible', name: 'Convertible', role: 'THE GETAWAY', file: 'samples/convertible.jpg' },
    { id: 'motel', name: 'Motel', role: 'THE MOTEL', file: 'samples/motel.jpg' },
    { id: 'helicopter', name: 'Helicopter', role: 'THE CHOPPER', file: 'samples/helicopter.jpg' },
    { id: 'alligator', name: 'Alligator', role: 'THE GATOR', file: 'samples/alligator.jpg' }
  ];

  /* Nine slots (the 3x3 grid needs nine; smaller layouts use the first
   * few). Repeats vary their zoom and focal point so the same photo reads
   * as a different shot in each panel. */
  var DEFAULT_SLOTS = [
    { photo: 2, zoom: 1.00, x: 0.50, y: 0.45, tag: '' },
    { photo: 0, zoom: 1.25, x: 0.42, y: 0.38, tag: '' },
    { photo: 1, zoom: 1.10, x: 0.55, y: 0.50, tag: '' },
    { photo: 4, zoom: 1.40, x: 0.60, y: 0.42, tag: '' },
    { photo: 5, zoom: 1.15, x: 0.48, y: 0.55, tag: '' },
    { photo: 3, zoom: 1.00, x: 0.50, y: 0.50, tag: '' },
    { photo: 0, zoom: 1.60, x: 0.62, y: 0.30, tag: '' },
    { photo: 2, zoom: 1.30, x: 0.35, y: 0.60, tag: '' },
    { photo: 4, zoom: 1.50, x: 0.40, y: 0.58, tag: '' }
  ];

  var SURPRISE_TITLES = [
    'PALM ROYALE', 'NEON SHORES', 'SUNSET CHASE', 'GOLDEN HOUR',
    'TIDEWATER', 'VELVET HEAT', 'MIDNIGHT PALMS', 'CORAL HEIST'
  ];
  var SURPRISE_TAGLINES = [
    'Every street is a stage.',
    'The tide always comes back.',
    'Chase the light, keep the gold.',
    'One city. No rules. All sunset.',
    'Neon nights, salt air, fast cars.',
    'Where the palms lean, trouble follows.'
  ];
  var SURPRISE_EYEBROWS = [
    'VICE CITY NIGHTS', 'LEONIDA SHORES', 'SUNSET DISTRICT',
    'PALMS DISTRICT', 'NEON BOULEVARD'
  ];

  var state = {
    size: 'wide',
    layout: 'big4',
    grade: 'warm',
    title: 'PALM ROYALE',
    tagline: 'Every street is a stage.',
    eyebrow: 'VICE CITY NIGHTS',
    quote: '"A sun-soaked joyride through neon and noise."',
    billing: 'SUNSET VICE PICTURES  •  A COVER STUDIO PRODUCTION  •  SHOT ON LOCATION IN LEONIDA  •  EST. 2026',
    photos: [],
    slots: JSON.parse(JSON.stringify(DEFAULT_SLOTS)),
    decor: { sun: true, palms: true, skyline: true, badge: true, tape: true },
    selected: 0
  };

  /* Quote bar / billing strip heights, same fractions as the renderer. */
  var QUOTE_FRAC = 0.062;
  var BILL_FRAC = 0.048;

  var previewCanvas = null;
  var trayEl = null;
  var statusEl = null;
  var rafPending = false;

  function $(id) { return document.getElementById(id); }

  function currentSize() {
    return window.CoverRender.SIZES[state.size] || window.CoverRender.SIZES.wide;
  }

  function schedulePreview() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function () {
      rafPending = false;
      drawPreview();
    });
  }

  function drawPreview() {
    if (!previewCanvas) return;
    window.CoverRender.drawCover(previewCanvas, state);
    syncPanelControls();
  }

  function loadImage(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  function loadSamples() {
    var jobs = SAMPLES.map(function (sample) {
      return loadImage(sample.file).then(function (img) {
        if (!img) return null;
        return { id: sample.id, name: sample.name, role: sample.role, img: img, src: sample.file };
      });
    });
    return Promise.all(jobs).then(function (loaded) {
      state.photos = loaded.filter(function (p) { return p !== null; });
      return state.photos;
    });
  }

  function loadFonts() {
    var jobs = [];
    if (document.fonts && document.fonts.load) {
      jobs.push(document.fonts.load('100px Anton').catch(function () {}));
      jobs.push(document.fonts.load('60px Pacifico').catch(function () {}));
      jobs.push(document.fonts.ready.catch(function () {}));
    }
    return Promise.all(jobs);
  }

  /* The app is ready when the samples and the fonts are in; shots.js
   * waits on this promise before it renders a screenshot preset. */
  var readyPromise = Promise.all([loadSamples(), loadFonts()]).then(function () {
    renderTray();
    syncAllInputs();
    drawPreview();
    setStatus('Ready — ' + state.photos.length + ' photos loaded. Click a panel to edit it.');
    return true;
  });

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  /* ------------------------------------------------------------------ */
  /* Photo tray: thumbnails assign a photo to the selected panel.        */
  /* ------------------------------------------------------------------ */

  function renderTray() {
    if (!trayEl) return;
    trayEl.innerHTML = '';
    state.photos.forEach(function (photo, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'thumb';
      button.title = photo.name + ' — ' + photo.role;
      var img = document.createElement('img');
      img.src = photo.src;
      img.alt = photo.name;
      var label = document.createElement('span');
      label.textContent = photo.name;
      button.appendChild(img);
      button.appendChild(label);
      button.addEventListener('click', function () {
        assignPhotoToSelected(index);
      });
      trayEl.appendChild(button);
    });
    markTraySelection();
  }

  function markTraySelection() {
    if (!trayEl) return;
    var slot = state.slots[state.selected];
    var buttons = trayEl.querySelectorAll('.thumb');
    buttons.forEach(function (button, index) {
      button.classList.toggle('active', !!slot && slot.photo === index);
    });
  }

  function assignPhotoToSelected(photoIndex) {
    var slot = state.slots[state.selected];
    if (!slot) return;
    slot.photo = photoIndex;
    slot.tag = '';
    markTraySelection();
    syncPanelControls();
    schedulePreview();
    var photo = state.photos[photoIndex];
    setStatus('Panel ' + (state.selected + 1) + ' now shows ' + (photo ? photo.name : 'photo') + '.');
  }

  function addUploadedPhotos(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;
    var jobs = files.filter(function (f) { return f.type.indexOf('image/') === 0; }).map(function (file) {
      return new Promise(function (resolve) {
        var url = URL.createObjectURL(file);
        loadImage(url).then(function (img) {
          if (!img) { URL.revokeObjectURL(url); resolve(null); return; }
          var base = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Photo';
          resolve({
            id: 'upload-' + Date.now() + '-' + Math.floor(Math.random() * 1e6),
            name: base.slice(0, 24),
            role: 'THE NEWCOMER',
            img: img,
            src: url
          });
        });
      });
    });
    Promise.all(jobs).then(function (added) {
      var fresh = added.filter(function (p) { return p !== null; });
      if (!fresh.length) { setStatus('No image files in that selection.'); return; }
      var firstIndex = state.photos.length;
      state.photos = state.photos.concat(fresh);
      renderTray();
      assignPhotoToSelected(firstIndex);
      setStatus(fresh.length + ' photo(s) added — kept on this machine, never uploaded.');
    });
  }

  /* ------------------------------------------------------------------ */
  /* Panel editing on the preview canvas: click to select, drag to pan,  */
  /* wheel to zoom. Coordinates are mapped to cover pixels first.        */
  /* ------------------------------------------------------------------ */

  function coverPoint(event) {
    var rect = previewCanvas.getBoundingClientRect();
    var size = currentSize();
    return {
      x: (event.clientX - rect.left) * (size.w / rect.width),
      y: (event.clientY - rect.top) * (size.h / rect.height)
    };
  }

  function panelsNow() {
    var size = currentSize();
    return window.CoverRender.layoutPanels(
      state.layout, size.w, size.h * QUOTE_FRAC, size.h * (1 - BILL_FRAC)
    );
  }

  function panelAt(point) {
    var panels = panelsNow();
    for (var i = 0; i < panels.length; i++) {
      if (window.CoverRender.panelContains(panels[i], point.x, point.y)) return i;
    }
    return -1;
  }

  var drag = null;

  function onCanvasPointerDown(event) {
    var point = coverPoint(event);
    var index = panelAt(point);
    if (index < 0) return;
    state.selected = index;
    markTraySelection();
    syncPanelControls();
    var panels = panelsNow();
    drag = { panel: panels[index], lastX: point.x, lastY: point.y, moved: false };
    previewCanvas.setPointerCapture(event.pointerId);
    schedulePreview();
  }

  function onCanvasPointerMove(event) {
    if (!drag) return;
    var point = coverPoint(event);
    var dx = point.x - drag.lastX;
    var dy = point.y - drag.lastY;
    drag.lastX = point.x;
    drag.lastY = point.y;
    if (Math.abs(dx) + Math.abs(dy) > 0.5) drag.moved = true;
    var slot = state.slots[drag.panel ? state.selected : 0];
    if (!slot) return;
    var photo = state.photos[slot.photo];
    if (!photo || !photo.img) return;
    /* Shift the focal point by the dragged distance over the drawn size. */
    var iw = photo.img.naturalWidth;
    var ih = photo.img.naturalHeight;
    var scale = Math.max(drag.panel.w / iw, drag.panel.h / ih) * (slot.zoom || 1);
    slot.x = Math.min(1, Math.max(0, (slot.x || 0.5) - dx / (iw * scale)));
    slot.y = Math.min(1, Math.max(0, (slot.y || 0.5) - dy / (ih * scale)));
    schedulePreview();
  }

  function onCanvasPointerUp() {
    drag = null;
  }

  function onCanvasWheel(event) {
    event.preventDefault();
    var slot = state.slots[state.selected];
    if (!slot) return;
    var zoom = slot.zoom || 1;
    zoom *= Math.exp(-event.deltaY * 0.0012);
    slot.zoom = Math.min(3, Math.max(1, zoom));
    syncPanelControls();
    schedulePreview();
  }

  /* ------------------------------------------------------------------ */
  /* Control sync: keep every input showing the selected panel / state.  */
  /* ------------------------------------------------------------------ */

  function syncPanelControls() {
    var slot = state.slots[state.selected];
    var label = $('panelLabel');
    if (label) label.textContent = 'Panel ' + (state.selected + 1) + ' of ' + panelsNow().length;
    var zoom = $('zoomSlider');
    if (zoom && slot) zoom.value = String(slot.zoom || 1);
    var zoomOut = $('zoomValue');
    if (zoomOut && slot) zoomOut.textContent = (slot.zoom || 1).toFixed(2) + 'x';
    var tag = $('tagInput');
    if (tag && slot) {
      var photo = state.photos[slot.photo];
      tag.value = slot.tag || (photo ? photo.role : '');
      tag.placeholder = photo ? photo.role : 'THE DRIVER';
    }
    var select = $('panelPhotoSelect');
    if (select && slot) select.value = String(slot.photo);
    markTraySelection();
  }

  function syncGroupButtons(groupId, value) {
    var group = $(groupId);
    if (!group) return;
    group.querySelectorAll('button[data-value]').forEach(function (button) {
      button.classList.toggle('active', button.getAttribute('data-value') === value);
    });
  }

  function syncAllInputs() {
    syncGroupButtons('layoutGroup', state.layout);
    syncGroupButtons('gradeGroup', state.grade);
    syncGroupButtons('sizeGroup', state.size);
    var map = {
      titleInput: 'title',
      taglineInput: 'tagline',
      eyebrowInput: 'eyebrow',
      quoteInput: 'quote',
      billingInput: 'billing'
    };
    Object.keys(map).forEach(function (id) {
      var el = $(id);
      if (el) el.value = state[map[id]] || '';
    });
    Object.keys(state.decor).forEach(function (key) {
      var box = $('decor-' + key);
      if (box) box.checked = !!state.decor[key];
    });
    var select = $('panelPhotoSelect');
    if (select) {
      select.innerHTML = '';
      state.photos.forEach(function (photo, index) {
        var option = document.createElement('option');
        option.value = String(index);
        option.textContent = photo.name + ' — ' + photo.role;
        select.appendChild(option);
      });
    }
    syncPanelControls();
  }

  /* ------------------------------------------------------------------ */
  /* Export: render the cover at full size and download it as PNG. The   */
  /* exported file is the same drawCover call as the live preview.       */
  /* ------------------------------------------------------------------ */

  function slug(text) {
    return (text || 'cover').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cover';
  }

  function exportCover(sizeKey) {
    var canvas = window.CoverRender.coverCanvasFor(state, sizeKey);
    var size = window.CoverRender.SIZES[sizeKey];
    var done = function (blob) {
      if (!blob) { setStatus('Export failed — the browser refused the PNG.'); return; }
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = 'sunset-vice-' + slug(state.title) + '-' + size.w + 'x' + size.h + '.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
      setStatus('Exported ' + size.label + ' PNG — ' + state.title + '.');
    };
    try {
      canvas.toBlob(done, 'image/png');
    } catch (err) {
      /* A tainted canvas (e.g. the app opened via file://) cannot export:
       * say so instead of throwing. Served over HTTP this never happens. */
      setStatus('Export needs the app served over HTTP — run node serve.mjs.');
    }
  }

  function exportAllSizes() {
    var keys = ['square', 'portrait', 'wide'];
    keys.forEach(function (key, i) {
      setTimeout(function () { exportCover(key); }, i * 350);
    });
    setStatus('Exporting all 3 sizes…');
  }

  /* ------------------------------------------------------------------ */
  /* Surprise me + fill-all: one click to a fresh cover or one photo.    */
  /* ------------------------------------------------------------------ */

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function surpriseMe() {
    state.layout = pick(window.CoverRender.LAYOUT_NAMES);
    state.grade = pick(window.CoverRender.GRADE_NAMES);
    state.title = pick(SURPRISE_TITLES);
    state.tagline = pick(SURPRISE_TAGLINES);
    state.eyebrow = pick(SURPRISE_EYEBROWS);
    state.slots.forEach(function (slot) {
      slot.photo = Math.floor(Math.random() * state.photos.length);
      slot.zoom = 1 + Math.random() * 0.6;
      slot.x = 0.3 + Math.random() * 0.4;
      slot.y = 0.3 + Math.random() * 0.4;
      slot.tag = '';
    });
    window.CoverRender.clearGradeCache();
    syncAllInputs();
    schedulePreview();
    setStatus('Surprise: ' + state.title + ' — ' + state.layout + ' layout, ' + state.grade + ' grade.');
  }

  function fillAllWithSelected() {
    var slot = state.slots[state.selected];
    if (!slot) return;
    var photoIndex = slot.photo;
    state.slots.forEach(function (s) {
      s.photo = photoIndex;
      s.tag = '';
    });
    schedulePreview();
    var photo = state.photos[photoIndex];
    setStatus('Every panel now shows ' + (photo ? photo.name : 'one photo') + '.');
  }

  /* ------------------------------------------------------------------ */
  /* Presets (used by shots.js): apply a named cover setup, then redraw. */
  /* ------------------------------------------------------------------ */

  function applyPreset(preset) {
    if (!preset) return;
    ['size', 'layout', 'grade', 'title', 'tagline', 'eyebrow', 'quote', 'billing'].forEach(function (key) {
      if (preset[key] !== undefined) state[key] = preset[key];
    });
    if (preset.slots) {
      preset.slots.forEach(function (slot, i) {
        if (state.slots[i]) {
          state.slots[i].photo = slot.photo;
          state.slots[i].zoom = slot.zoom === undefined ? 1 : slot.zoom;
          state.slots[i].x = slot.x === undefined ? 0.5 : slot.x;
          state.slots[i].y = slot.y === undefined ? 0.5 : slot.y;
          state.slots[i].tag = slot.tag || '';
        }
      });
    }
    if (preset.decor) {
      Object.keys(preset.decor).forEach(function (key) {
        state.decor[key] = !!preset.decor[key];
      });
    }
    if (preset.selected !== undefined) state.selected = preset.selected;
    syncAllInputs();
    drawPreview();
  }

  /* ------------------------------------------------------------------ */
  /* Wiring + init.                                                      */
  /* ------------------------------------------------------------------ */

  function wireGroup(groupId, apply) {
    var group = $(groupId);
    if (!group) return;
    group.querySelectorAll('button[data-value]').forEach(function (button) {
      button.addEventListener('click', function () {
        apply(button.getAttribute('data-value'));
        syncGroupButtons(groupId, button.getAttribute('data-value'));
        schedulePreview();
      });
    });
  }

  function wireText(id, key) {
    var el = $(id);
    if (!el) return;
    el.addEventListener('input', function () {
      state[key] = el.value;
      schedulePreview();
    });
  }

  function init() {
    previewCanvas = $('previewCanvas');
    trayEl = $('photoTray');
    statusEl = $('statusLine');

    wireGroup('layoutGroup', function (v) { state.layout = v; });
    wireGroup('gradeGroup', function (v) { state.grade = v; window.CoverRender.clearGradeCache(); });
    wireGroup('sizeGroup', function (v) { state.size = v; });

    wireText('titleInput', 'title');
    wireText('taglineInput', 'tagline');
    wireText('eyebrowInput', 'eyebrow');
    wireText('quoteInput', 'quote');
    wireText('billingInput', 'billing');

    Object.keys(state.decor).forEach(function (key) {
      var box = $('decor-' + key);
      if (box) {
        box.addEventListener('change', function () {
          state.decor[key] = box.checked;
          schedulePreview();
        });
      }
    });

    var zoom = $('zoomSlider');
    if (zoom) {
      zoom.addEventListener('input', function () {
        var slot = state.slots[state.selected];
        if (!slot) return;
        slot.zoom = parseFloat(zoom.value);
        syncPanelControls();
        schedulePreview();
      });
    }

    var tag = $('tagInput');
    if (tag) {
      tag.addEventListener('input', function () {
        var slot = state.slots[state.selected];
        if (!slot) return;
        slot.tag = tag.value.trim();
        schedulePreview();
      });
    }

    var select = $('panelPhotoSelect');
    if (select) {
      select.addEventListener('change', function () {
        assignPhotoToSelected(parseInt(select.value, 10));
      });
    }

    var upload = $('uploadInput');
    var uploadBtn = $('uploadBtn');
    if (uploadBtn && upload) {
      uploadBtn.addEventListener('click', function () { upload.click(); });
      upload.addEventListener('change', function () {
        addUploadedPhotos(upload.files);
        upload.value = '';
      });
    }

    var fillAll = $('fillAllBtn');
    if (fillAll) fillAll.addEventListener('click', fillAllWithSelected);

    var surprise = $('surpriseBtn');
    if (surprise) surprise.addEventListener('click', surpriseMe);

    var exportAll = $('exportAllBtn');
    if (exportAll) exportAll.addEventListener('click', exportAllSizes);
    ['square', 'portrait', 'wide'].forEach(function (key) {
      var btn = $('export-' + key + 'Btn');
      if (btn) btn.addEventListener('click', function () { exportCover(key); });
    });

    if (previewCanvas) {
      previewCanvas.addEventListener('pointerdown', onCanvasPointerDown);
      previewCanvas.addEventListener('pointermove', onCanvasPointerMove);
      previewCanvas.addEventListener('pointerup', onCanvasPointerUp);
      previewCanvas.addEventListener('pointercancel', onCanvasPointerUp);
      previewCanvas.addEventListener('wheel', onCanvasWheel, { passive: false });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.SunsetVice = {
    state: state,
    ready: readyPromise,
    drawPreview: drawPreview,
    exportCover: exportCover,
    applyPreset: applyPreset,
    surpriseMe: surpriseMe
  };
})();

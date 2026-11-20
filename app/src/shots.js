// Fixed scenes for screenshots: each ?shot= value stages one of the four
// screenshots and sets window.__shotReady once the cover is painted.
//   ?shot=cover1  Palm Royale, landscape, the 1 big + 4 cover alone
//   ?shot=editor  the editor with the Palm Royale cover loaded
//   ?shot=cover3  Tidewater, portrait, the 3x3 grid cover alone
//   ?shot=cover4  Golden Hour, square, the diagonal cover alone
// Cover shots draw the cover full-frame at the viewport size, using the
// same drawCover the editor and the export use.

import { drawCover } from './render.js';

function paintWhenReady(paint) {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        paint();
        requestAnimationFrame(() => {
          window.__shotReady = true;
          resolve();
        });
      });
    });
  });
}

export async function applyShot(query, app) {
  const shot = query.get('shot');
  const { canvas, images } = app;
  const ctx = canvas.getContext('2d');

  if (shot === 'editor') {
    app.setPreset('palm');
    app.setSize('landscape');
    app.syncLettering();
    await paintWhenReady(() => app.renderPreview());
    return;
  }

  const presetName = shot === 'cover3' ? 'tidewater' : shot === 'cover4' ? 'golden' : 'palm';
  app.setPreset(presetName);
  document.body.classList.add('shot-cover');
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  await paintWhenReady(() => {
    const boxes = [];
    drawCover(ctx, app.state, w, h, images, boxes);
    window.__coverBoxes = boxes;
    window.__coverSize = { w, h };
  });
}

// Fixed scenes for screenshots: ?shot=cover1|editor|cover2|cover3.
// Cover shots hide the editor and draw one exported cover full-screen;
// the editor shot shows the app with a photo loaded. window.__shotReady
// is set once the scene is painted, so a headless screenshot can wait on it.
import { defaultPanel } from './render.js';

const SHOTS = {
  cover1: {
    aspect: 'wide', w: 1920, h: 1080, hideEditor: true,
    state: {
      layout: 'hero4', title: 'SUNSET CHASE', tagline: 'Every street is a stage',
      eyebrow: 'EST. 2026  •  LEONIDA', banner: 'sunset',
      panels: [
        { ...defaultPanel(0, 'sunset'), cy: 0.34 },
        defaultPanel(1, 'neon'),
        defaultPanel(2, 'gold'),
        defaultPanel(3, 'sunset'),
        defaultPanel(0, 'halftone'),
      ],
    },
  },
  editor: {
    aspect: 'wide', w: 1920, h: 1080, hideEditor: false,
    state: {
      layout: 'hero4', title: 'SUNSET CHASE', tagline: 'Every street is a stage',
      eyebrow: 'EST. 2026  •  LEONIDA', banner: 'sunset',
      panels: [
        { ...defaultPanel(0, 'sunset'), cy: 0.34 },
        defaultPanel(1, 'neon'),
        defaultPanel(2, 'gold'),
        defaultPanel(3, 'sunset'),
        defaultPanel(0, 'halftone'),
      ],
    },
  },
  cover2: {
    aspect: 'portrait', w: 1080, h: 1350, hideEditor: true,
    state: {
      layout: 'grid33', title: 'NEON SHORES', tagline: 'One city. No rules.',
      eyebrow: 'VOL. 06  •  PALM DISTRICT', banner: 'navy',
      panels: [
        defaultPanel(1, 'neon'), { ...defaultPanel(0, 'neon'), cy: 0.32 }, defaultPanel(3, 'neon'),
        { ...defaultPanel(2, 'neon'), cy: 0.6 }, defaultPanel(1, 'sunset'), { ...defaultPanel(0, 'neon'), cy: 0.32 },
        defaultPanel(3, 'gold'), { ...defaultPanel(2, 'neon'), cy: 0.6 }, defaultPanel(1, 'neon'),
      ],
    },
  },
  cover3: {
    aspect: 'square', w: 1080, h: 1080, hideEditor: true,
    state: {
      layout: 'diagonal', title: 'BOULEVARD QUEEN', tagline: 'She owns the night',
      eyebrow: 'PALM DISTRICT NIGHTS', banner: 'sunset',
      panels: [
        { ...defaultPanel(2, 'gold'), cy: 0.6 },
        { ...defaultPanel(1, 'gold'), cx: 0.42 },
        { ...defaultPanel(0, 'sunset'), cy: 0.34 },
      ],
    },
  },
};

export async function runShot(name, query, env) {
  const shot = SHOTS[name] || SHOTS.cover1;
  const { state, redraw } = env;
  Object.assign(state, shot.state);
  state.deco = { sun: true, palms: true, badge: true, tape: true, stars: true, skyline: true };
  const canvas = document.getElementById('preview');
  canvas.width = shot.w;
  canvas.height = shot.h;
  if (shot.hideEditor) document.body.classList.add('shot-cover');
  // Keep the form inputs in sync so the editor shot shows the same words.
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  set('titleInput', state.title);
  set('taglineInput', state.tagline);
  set('eyebrowInput', state.eyebrow);
  set('bannerSelect', state.banner);
  document.querySelectorAll('.layout-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  redraw();
  await document.fonts.ready;
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

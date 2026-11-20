// Fixed scenes for screenshots: ?shot=cover1|editor|cover2|cover3.
// Cover shots hide the editor and draw one exported cover full-screen;
// the editor shot shows the app with a photo loaded. window.__shotReady
// is set once the scene is painted, so a headless screenshot can wait on it.
import { defaultPanel } from './render.js';

// All three covers use the unified warm wash: natural photos, one
// golden-hour light. Roles are set per panel so the 3x3 never repeats
// a role even where a photo repeats with a different crop.
const SHOTS = {
  cover1: {
    aspect: 'wide', w: 1920, h: 1080, hideEditor: true,
    state: {
      layout: 'hero4', title: 'PALM ROYALE', tagline: 'Live fast, shine brighter',
      eyebrow: 'ONE CREW  •  SIX STORIES  •  ALL GOLDEN HOUR',
      quote: 'A love letter to the golden hour', quoteSource: 'THE COAST REVIEW',
      banner: 'sunset',
      panels: [
        { ...defaultPanel(0, 'warm'), cy: 0.34 },
        defaultPanel(1, 'warm'),
        defaultPanel(2, 'warm'),
        defaultPanel(3, 'warm'),
        { ...defaultPanel(4, 'warm'), cx: 0.68, cy: 0.32 },
      ],
    },
  },
  editor: {
    aspect: 'wide', w: 1920, h: 1080, hideEditor: false,
    state: {
      layout: 'hero4', title: 'PALM ROYALE', tagline: 'Live fast, shine brighter',
      eyebrow: 'ONE CREW  •  SIX STORIES  •  ALL GOLDEN HOUR',
      quote: 'A love letter to the golden hour', quoteSource: 'THE COAST REVIEW',
      banner: 'sunset',
      panels: [
        { ...defaultPanel(0, 'warm'), cy: 0.34 },
        defaultPanel(1, 'warm'),
        defaultPanel(2, 'warm'),
        defaultPanel(3, 'warm'),
        { ...defaultPanel(4, 'warm'), cx: 0.68, cy: 0.32 },
      ],
    },
  },
  cover2: {
    aspect: 'portrait', w: 1080, h: 1350, hideEditor: true,
    state: {
      layout: 'grid33', title: 'TIDEWATER', tagline: 'After dark, the city glows',
      eyebrow: 'NINE LIVES  •  ONE HARBOR  •  ALL TRUE',
      quote: 'Salt air and neon in every frame', quoteSource: 'THE BAY HERALD',
      banner: 'navy',
      panels: [
        { ...defaultPanel(1, 'warm'), role: 'THE ANGLER' },
        { ...defaultPanel(0, 'warm'), cy: 0.32, role: 'THE DRIVER' },
        { ...defaultPanel(4, 'warm'), cx: 0.68, cy: 0.32, role: 'THE CHOPPER' },
        { ...defaultPanel(2, 'warm'), cy: 0.6, role: 'THE GETAWAY' },
        { ...defaultPanel(5, 'warm'), cy: 0.58, role: 'THE GATOR' },
        { ...defaultPanel(3, 'warm'), role: 'THE MOTEL' },
        { ...defaultPanel(0, 'warm'), cy: 0.3, zoom: 1.4, role: 'THE LOOKOUT' },
        { ...defaultPanel(1, 'warm'), cx: 0.35, zoom: 1.5, role: 'THE CAPTAIN' },
        { ...defaultPanel(2, 'warm'), cy: 0.6, zoom: 1.4, role: 'THE RIDER' },
      ],
    },
  },
  cover3: {
    aspect: 'square', w: 1080, h: 1080, hideEditor: true,
    state: {
      layout: 'diagonal', title: 'GOLDEN HOUR', tagline: 'Chase the light',
      eyebrow: 'THREE SHORES  •  ONE LONG EVENING',
      quote: 'Every frame smells like salt and gasoline', quoteSource: 'THE COAST REVIEW',
      banner: 'sunset',
      panels: [
        { ...defaultPanel(2, 'warm'), cy: 0.6 },
        { ...defaultPanel(1, 'warm'), cx: 0.42 },
        { ...defaultPanel(0, 'warm'), cy: 0.34 },
      ],
    },
  },
};

export async function runShot(name, query, env) {
  const shot = SHOTS[name] || SHOTS.cover1;
  const { state, redraw } = env;
  Object.assign(state, shot.state);
  state.deco = { sun: true, palms: true, badge: true, tape: true, stars: true, skyline: true, roles: true, quote: true, billing: true };
  const canvas = document.getElementById('preview');
  canvas.width = shot.w;
  canvas.height = shot.h;
  if (shot.hideEditor) document.body.classList.add('shot-cover');
  // Keep the form inputs in sync so the editor shot shows the same words.
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  set('titleInput', state.title);
  set('taglineInput', state.tagline);
  set('eyebrowInput', state.eyebrow);
  set('quoteInput', state.quote);
  set('quoteSourceInput', state.quoteSource);
  set('bannerSelect', state.banner);
  document.querySelectorAll('.layout-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  redraw();
  await document.fonts.ready;
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

// Fixed scenes for screenshots: ?shot=cover1 / editor / cover3 / cover4.
// Each preset is a full cover state. main.js applies it, paints once, then
// sets window.__shotReady so the screenshot tool knows the frame is done.

const P = (photo, role, extra = {}) => ({ photo, role, zoom: 1, ...extra });

export const SHOTS = {
  cover1: {
    mode: 'cover',
    layout: 'big4',
    size: 'landscape',
    grade: 'warm',
    band: 'sunset',
    title: 'PALM ROYALE',
    tagline: 'Live fast, shine brighter',
    eyebrow: 'ONE CREW • SIX STORIES • ALL GOLDEN HOUR',
    quote: 'A love letter to the golden hour',
    source: 'THE COAST REVIEW',
    panels: [
      P('boulevard', 'THE DRIVER'),
      P('pier', 'THE ANGLER'),
      P('convertible', 'THE GETAWAY'),
      P('motel', 'THE MOTEL'),
      P('helicopter', 'THE CHOPPER'),
    ],
  },
  editor: {
    mode: 'editor',
    layout: 'big4',
    size: 'landscape',
    grade: 'warm',
    band: 'sunset',
    title: 'PALM ROYALE',
    tagline: 'Live fast, shine brighter',
    eyebrow: 'ONE CREW • SIX STORIES • ALL GOLDEN HOUR',
    quote: 'A love letter to the golden hour',
    source: 'THE COAST REVIEW',
    panels: [
      P('boulevard', 'THE DRIVER'),
      P('pier', 'THE ANGLER'),
      P('convertible', 'THE GETAWAY'),
      P('motel', 'THE MOTEL'),
      P('helicopter', 'THE CHOPPER'),
    ],
  },
  cover3: {
    mode: 'cover',
    layout: 'grid',
    size: 'portrait',
    grade: 'warm',
    band: 'dark',
    title: 'TIDEWATER',
    tagline: 'After dark, the city glows',
    eyebrow: 'NINE LIVES • ONE HARBOR • ALL TRUE',
    quote: 'Salt air and neon in every frame',
    source: 'THE BAY HERALD',
    panels: [
      P('pier', 'THE ANGLER'),
      P('boulevard', 'THE DRIVER'),
      P('helicopter', 'THE CHOPPER'),
      P('convertible', 'THE GETAWAY'),
      P('alligator', 'THE GATOR'),
      P('motel', 'THE MOTEL'),
      P('boulevard', 'THE LOOKOUT', { zoom: 1.1 }),
      P('pier', 'THE CAPTAIN', { zoom: 1.7, fy: 0.22 }),
      P('convertible', 'THE RIDER', { zoom: 1.15 }),
    ],
  },
  cover4: {
    mode: 'cover',
    layout: 'diagonal',
    size: 'square',
    grade: 'warm',
    band: 'sunset',
    title: 'GOLDEN HOUR',
    tagline: 'Chase the light',
    eyebrow: 'THREE SHORES • ONE LONG EVENING',
    quote: 'Every frame smells like salt and gasoline',
    source: 'THE COAST REVIEW',
    panels: [
      P('convertible', 'THE GETAWAY'),
      P('pier', 'THE ANGLER', { zoom: 1.7, fy: 0.22 }),
      P('boulevard', 'THE DRIVER', { zoom: 1.1, fy: 0.35 }),
    ],
  },
};

export function shotFromQuery() {
  const name = new URLSearchParams(window.location.search).get('shot');
  return name && SHOTS[name] ? name : null;
}

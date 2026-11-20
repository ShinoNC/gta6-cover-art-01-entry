// shots.js — the four reproducible shots and the app's default state.
//
// Every screenshot of this entry is taken from the app itself through a
// ?shot= query param, so the screenshots are exactly what the app draws:
//   ?shot=1  PALM ROYALE, landscape cover (1 big + 4)
//   ?shot=2  the editor, with the PALM ROYALE cover loaded in the preview
//   ?shot=3  TIDEWATER, portrait cover (3x3 grid)
//   ?shot=4  GOLDEN HOUR, square cover (Diagonal)
// No shot is composited or edited outside the app.

// The six sample photos shipped with the app. The kit's two free photos
// (boulevard, pier) plus four more made for this entry; none of them is a
// real person's photo and none of them is GTA artwork.
export const SAMPLE_PHOTOS = [
  { id: 'boulevard', name: 'Boulevard', src: 'samples/boulevard.jpg' },
  { id: 'pier', name: 'Pier', src: 'samples/pier.jpg' },
  { id: 'convertible', name: 'Convertible', src: 'samples/convertible.jpg' },
  { id: 'motel', name: 'Motel', src: 'samples/motel.jpg' },
  { id: 'helicopter', name: 'Helicopter', src: 'samples/helicopter.jpg' },
  { id: 'alligator', name: 'Alligator', src: 'samples/alligator.jpg' },
];

// The cast tag each photo carries by default.
export const DEFAULT_TAGS = {
  boulevard: 'THE DRIVER',
  pier: 'THE ANGLER',
  convertible: 'THE GETAWAY',
  motel: 'THE MOTEL',
  helicopter: 'THE CHOPPER',
  alligator: 'THE GATOR',
};

// One panel: which photo it shows, its cast tag, where the tag sits, and
// the photo's crop (zoom 1 is cover-fit; pan runs -1..1 across the excess).
function panel(photo, tag, crop = {}) {
  return {
    photo,
    tag: tag ?? DEFAULT_TAGS[photo] ?? '',
    tagPos: crop.tagPos ?? 'bottom',
    zoom: crop.zoom ?? 1,
    panX: crop.panX ?? 0,
    panY: crop.panY ?? 0,
  };
}

// PALM ROYALE — the landscape cover and the editor's default state.
export function palmRoyaleState() {
  return {
    size: 'landscape',
    layout: 'big4',
    grade: 'warm',
    band: 'sunset',
    title: 'PALM ROYALE',
    tagline: 'Live fast, shine brighter',
    eyebrow: 'ONE CREW • SIX STORIES • ALL GOLDEN HOUR',
    quote: 'A love letter to the golden hour',
    source: 'THE COAST REVIEW',
    panels: [
      panel('boulevard', 'THE DRIVER', { panY: -0.65 }),
      panel('pier', 'THE ANGLER'),
      panel('convertible', 'THE GETAWAY'),
      panel('motel', 'THE MOTEL'),
      panel('helicopter', 'THE CHOPPER'),
    ],
    selected: 0,
  };
}

// TIDEWATER — the portrait cover. The third row repeats three photos with
// different crops, so the repeats read as different shots.
export function tidewaterState() {
  return {
    size: 'portrait',
    layout: 'grid',
    grade: 'warm',
    band: 'dark',
    title: 'TIDEWATER',
    tagline: 'After dark, the city glows',
    eyebrow: 'NINE LIVES • ONE HARBOR • ALL TRUE',
    quote: 'Salt air and neon in every frame',
    source: 'THE BAY HERALD',
    panels: [
      panel('pier', 'THE ANGLER'),
      panel('boulevard', 'THE DRIVER', { panY: -0.1 }),
      panel('helicopter', 'THE CHOPPER'),
      panel('convertible', 'THE GETAWAY'),
      panel('alligator', 'THE GATOR'),
      panel('motel', 'THE MOTEL'),
      panel('boulevard', 'THE LOOKOUT', { zoom: 1.15, panX: -0.3, panY: -0.6 }),
      panel('pier', 'THE CAPTAIN', { zoom: 2.0, panY: -0.75 }),
      panel('convertible', 'THE RIDER', { zoom: 1.5, panX: 0.4, panY: 0.25 }),
    ],
    selected: 0,
  };
}

// GOLDEN HOUR — the square cover. Diagonal panels, tags at the top.
export function goldenHourState() {
  return {
    size: 'square',
    layout: 'diagonal',
    grade: 'warm',
    band: 'sunset',
    title: 'GOLDEN HOUR',
    tagline: 'Chase the light',
    eyebrow: 'THREE SHORES • ONE LONG EVENING',
    quote: 'Every frame smells like salt and gasoline',
    source: 'THE COAST REVIEW',
    panels: [
      panel('convertible', 'THE GETAWAY', { tagPos: 'top' }),
      panel('pier', 'THE ANGLER', { tagPos: 'top', zoom: 1.9, panX: -0.1, panY: -0.75 }),
      panel('boulevard', 'THE DRIVER', { tagPos: 'top', panY: -0.1 }),
    ],
    selected: 0,
  };
}

// The state a ?shot= number asks for, or null for the plain editor.
export function shotState(n) {
  if (n === 1 || n === 2) return palmRoyaleState();
  if (n === 3) return tidewaterState();
  if (n === 4) return goldenHourState();
  return null;
}

// The editor's default state: PALM ROYALE, ready to edit.
export function defaultState() {
  return palmRoyaleState();
}

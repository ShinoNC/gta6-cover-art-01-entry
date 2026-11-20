/* Sunset Vice - Cover Studio: reproducible screenshots.
 *
 * ?shot=<name> applies a named cover setup once the app is ready, then
 * either leaves the editor visible (the editor shot) or shows only the
 * cover canvas full-bleed (the cover shots). Every screenshot pixel comes
 * from the app itself: the cover shots draw with the same drawCover the
 * export uses, at full export size. window.__shotReady flips to true
 * once the frame is painted, so a headless browser knows when to shoot.
 */
(function () {
  'use strict';

  /* The four screenshots, in dossier order. */
  var SHOT_PRESETS = {
    '1-cover': {
      coverOnly: true,
      size: 'wide',
      layout: 'big4',
      grade: 'warm',
      title: 'PALM ROYALE',
      tagline: 'Every street is a stage.',
      eyebrow: 'VICE CITY NIGHTS',
      quote: '"A sun-soaked joyride through neon and noise."',
      billing: 'SUNSET VICE PICTURES  •  A COVER STUDIO PRODUCTION  •  SHOT ON LOCATION IN LEONIDA  •  EST. 2026',
      selected: 0,
      slots: [
        { photo: 2, zoom: 1.00, x: 0.50, y: 0.45, tag: '' },
        { photo: 0, zoom: 1.30, x: 0.42, y: 0.38, tag: '' },
        { photo: 1, zoom: 1.10, x: 0.55, y: 0.50, tag: '' },
        { photo: 4, zoom: 1.35, x: 0.60, y: 0.42, tag: '' },
        { photo: 5, zoom: 1.15, x: 0.48, y: 0.55, tag: '' }
      ]
    },
    'editor': {
      coverOnly: false,
      size: 'wide',
      layout: 'big4',
      grade: 'warm',
      title: 'PALM ROYALE',
      tagline: 'Every street is a stage.',
      eyebrow: 'VICE CITY NIGHTS',
      quote: '"A sun-soaked joyride through neon and noise."',
      billing: 'SUNSET VICE PICTURES  •  A COVER STUDIO PRODUCTION  •  SHOT ON LOCATION IN LEONIDA  •  EST. 2026',
      selected: 0,
      slots: [
        { photo: 2, zoom: 1.00, x: 0.50, y: 0.45, tag: '' },
        { photo: 0, zoom: 1.30, x: 0.42, y: 0.38, tag: '' },
        { photo: 1, zoom: 1.10, x: 0.55, y: 0.50, tag: '' },
        { photo: 4, zoom: 1.35, x: 0.60, y: 0.42, tag: '' },
        { photo: 5, zoom: 1.15, x: 0.48, y: 0.55, tag: '' }
      ]
    },
    '3-cover': {
      coverOnly: true,
      size: 'portrait',
      layout: 'grid',
      grade: 'neon',
      title: 'TIDEWATER',
      tagline: 'The tide always comes back.',
      eyebrow: 'LEONIDA SHORES',
      quote: '"Neon after dark, salt on the lens."',
      billing: 'SUNSET VICE PICTURES  •  A COVER STUDIO PRODUCTION  •  NINE PANELS, ONE CITY  •  EST. 2026',
      selected: 0,
      slots: [
        { photo: 0, zoom: 1.20, x: 0.45, y: 0.35, tag: '' },
        { photo: 1, zoom: 1.05, x: 0.55, y: 0.50, tag: '' },
        { photo: 2, zoom: 1.35, x: 0.38, y: 0.55, tag: '' },
        { photo: 3, zoom: 1.00, x: 0.50, y: 0.50, tag: '' },
        { photo: 4, zoom: 1.50, x: 0.62, y: 0.40, tag: '' },
        { photo: 5, zoom: 1.10, x: 0.48, y: 0.58, tag: '' },
        { photo: 0, zoom: 1.70, x: 0.60, y: 0.28, tag: '' },
        { photo: 2, zoom: 1.25, x: 0.65, y: 0.45, tag: '' },
        { photo: 4, zoom: 1.45, x: 0.35, y: 0.60, tag: '' }
      ]
    },
    '4-cover': {
      coverOnly: true,
      size: 'square',
      layout: 'diagonal',
      grade: 'gold',
      title: 'GOLDEN HOUR',
      tagline: 'Chase the light, keep the gold.',
      eyebrow: 'SUNSET DISTRICT',
      quote: '"Golden from the first frame to the last."',
      billing: 'SUNSET VICE PICTURES  •  A COVER STUDIO PRODUCTION  •  SHOT AT GOLDEN HOUR  •  EST. 2026',
      selected: 0,
      slots: [
        { photo: 4, zoom: 1.10, x: 0.50, y: 0.45, tag: '' },
        { photo: 2, zoom: 1.25, x: 0.42, y: 0.50, tag: '' },
        { photo: 5, zoom: 1.05, x: 0.55, y: 0.55, tag: '' },
        { photo: 1, zoom: 1.30, x: 0.48, y: 0.42, tag: '' }
      ]
    }
  };

  window.__shotReady = false;
  window.__shotError = null;

  function fitShotCanvas(canvas) {
    /* Scale the full-size cover to the viewport, keeping its aspect. */
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var scale = Math.min(vw / canvas.width, vh / canvas.height);
    canvas.style.width = Math.floor(canvas.width * scale) + 'px';
    canvas.style.height = Math.floor(canvas.height * scale) + 'px';
  }

  function runShot(name) {
    var preset = SHOT_PRESETS[name];
    if (!preset) {
      window.__shotError = 'unknown shot: ' + name;
      return;
    }
    document.title = 'Shot — ' + name;
    window.SunsetVice.ready.then(function () {
      window.SunsetVice.applyPreset(preset);
      if (preset.coverOnly) {
        document.body.classList.add('shot-cover');
        var stage = document.getElementById('shotStage');
        var canvas = document.getElementById('shotCanvas');
        stage.hidden = false;
        window.CoverRender.drawCover(canvas, window.SunsetVice.state);
        fitShotCanvas(canvas);
        window.addEventListener('resize', function () { fitShotCanvas(canvas); });
      }
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          window.__shotReady = true;
        });
      });
    }).catch(function (err) {
      window.__shotError = String(err && err.message || err);
    });
  }

  var params = new URLSearchParams(window.location.search);
  var shot = params.get('shot');
  if (shot) runShot(shot);
})();

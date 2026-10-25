/* Eddie's Couch 2 — pixel art. Every sprite is drawn in code at 1x, outlined once, and cached. */
(function () {
  'use strict';
  const EC = window.EC;
  const art = (EC.art = {});
  const paint = (EC.paint = {});

  const C = (EC.C = {
    ink: '#1d1519',
    white: '#ffffff',
    skin: '#f1c493',
    skinS: '#d39b6b',
    skinD: '#a86f45',
    // Zach: dark hair pushed up, stubble, grey shawl-collar cardigan over a dark tee
    zSkin: '#c08458',
    zSkinS: '#9e6a44',
    zSkinD: '#7a4d2e',
    zStubble: '#93633f',
    zHair: '#241915',
    zHairL: '#3f2e25',
    zKnit: '#8d8b87',
    zKnitS: '#64625e',
    zKnitL: '#c4c1ba',
    zKnitD: '#4a4845',
    zTee: '#2c2f36',
    jeans: '#344a7a',
    jeansS: '#253558',
    shoe: '#f1ede3',
    shoeS: '#bdb5a5',
    // Alex: blonde and pulled back, sunglasses up, dark chore jacket, white tee, gold hoops
    aSkin: '#f7d3bb',
    aSkinS: '#e0ab8e',
    aHair: '#e6c579',
    aHairS: '#c49d52',
    aHairL: '#f6e2a8',
    aJacket: '#363a48',
    aJacketS: '#262833',
    aJacketL: '#4d5264',
    aCollar: '#3d2c25',
    aJeans: '#4a6fa5',
    aJeansS: '#36557f',
    aBoot: '#8a5a3a',
    aBootS: '#6a4228',
    lips: '#d0606a',
    pink: '#ff5aa5',
    yellow: '#ffd23e',
    blue: '#3fa9ff',
    dHair: '#bdb8ae',
    dHairS: '#908a80',
    stache: '#6f5d4c',
    stacheS: '#4f4237',
    stacheL: '#8a7663',
    cardi: '#7d2e3b',
    cardiS: '#5b1f29',
    cardiL: '#9b4352',
    shirtW: '#f2eee4',
    shirtWS: '#cfc8b8',
    khaki: '#cdb47e',
    khakiS: '#a68e5b',
    belt: '#3b2a20',
    slipper: '#6e4a36',
    slipperS: '#4f3426',
    slipperL: '#93705a',
    glass: '#d6dbe1',
    lens: '#a9c1d3',
    brass: '#e2b84a',
    brassS: '#a8822a',
    bSkin: '#d88a6d',
    bSkinS: '#b0644e',
    bSkinL: '#f0a68b',
    horn: '#ece0c3',
    hornS: '#b6a882',
    eye: '#ff2b2b',
    mouth: '#3a0d10',
    sock: '#f4f1ea',
    sockS: '#cdc8bd',
    chair: '#7b6a3a',
    chairS: '#5b4d27',
    chairL: '#9b8a55',
    wood: '#7a4a2a',
    woodS: '#5a3419',
    woodL: '#9a6438',
    woodD: '#3e2312',
    metal: '#9aa0a6',
    metalL: '#c9ced3',
    night: '#1c2340',
    nightL: '#2c3762',
  });

  function R(g, x, y, w, h, c) {
    g.fillStyle = c;
    g.fillRect(x, y, w, h);
  }
  function disc(g, cx, cy, r, c) {
    for (let y = -r; y <= r; y++) {
      const w = Math.round(Math.sqrt(r * r - y * y));
      R(g, cx - w, cy + y, w * 2, 1, c);
    }
  }
  // Rect with a 1px ink border.
  function box(g, x, y, w, h, fill) {
    R(g, x, y, w, h, C.ink);
    R(g, x + 1, y + 1, w - 2, h - 2, fill);
  }
  art.R = R;
  art.box = box;
  art.disc = disc;

  const cache = new Map();
  function canvasOf(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d').imageSmoothingEnabled = false;
    return c;
  }
  art.canvasOf = canvasOf;

  // Draws raw art, adds a 1px ink outline, caches. Anchor is bottom-centre (feet) unless center is set.
  function sprite(key, w, h, draw, center) {
    let s = cache.get(key);
    if (s) return s;
    const raw = canvasOf(w, h);
    draw(raw.getContext('2d'));
    const c = canvasOf(w + 2, h + 2);
    const g = c.getContext('2d');
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => g.drawImage(raw, 1 + dx, 1 + dy));
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = C.ink;
    g.fillRect(0, 0, w + 2, h + 2);
    g.globalCompositeOperation = 'source-over';
    g.drawImage(raw, 1, 1);
    s = { img: c, w: w + 2, h: h + 2, ax: center ? (w + 2) / 2 : 1 + w / 2, ay: center ? (h + 2) / 2 : 1 + h };
    cache.set(key, s);
    return s;
  }
  art.sprite = sprite;

  art.put = function (g, s, x, y, o) {
    o = o || {};
    g.save();
    g.translate(Math.round(x), Math.round(y));
    if (o.rot) g.rotate(o.rot);
    if (o.sx || o.sy) g.scale(o.sx || 1, o.sy || 1);
    if (o.flip) g.scale(-1, 1);
    if (o.alpha != null) g.globalAlpha = o.alpha;
    g.drawImage(s.img, -s.ax, -s.ay);
    g.restore();
  };

  // A soft glow, used for the beast's eyes and lamps.
  art.glow = function (g, x, y, r, color, alpha) {
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, color);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = alpha == null ? 1 : alpha;
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
    g.restore();
  };

  // ================================================================ ZACH
  function zHead(g, x, y, face) {
    R(g, x, y + 1, 9, 9, C.zSkin);
    // short at the sides, pushed up in front
    R(g, x, y - 1, 8, 4, C.zHair);
    R(g, x + 3, y - 2, 6, 2, C.zHair);
    R(g, x + 7, y - 1, 2, 3, C.zHair);
    R(g, x, y, 2, 5, C.zHair);
    R(g, x + 4, y - 2, 3, 1, C.zHairL);
    R(g, x + 3, y + 5, 2, 2, C.zSkinS);
    R(g, x + 9, y + 5, 1, 2, C.zSkin);
    // stubble
    R(g, x + 2, y + 5, 1, 3, C.zStubble);
    R(g, x + 3, y + 9, 6, 1, C.zStubble);
    R(g, x + 5, y + 8, 4, 1, C.zStubble);
    R(g, x + 6, y + 6, 3, 1, C.zStubble);
    switch (face) {
      case 'grin':
        R(g, x + 6, y + 4, 1, 2, C.ink);
        R(g, x + 5, y + 3, 3, 1, C.zHair);
        R(g, x + 5, y + 7, 4, 2, C.ink);
        R(g, x + 5, y + 7, 4, 1, C.white);
        break;
      case 'worry':
        R(g, x + 6, y + 4, 1, 2, C.ink);
        R(g, x + 6, y + 3, 2, 1, C.zHair);
        R(g, x + 5, y + 2, 1, 1, C.zHair);
        R(g, x + 6, y + 7, 2, 1, C.ink);
        break;
      case 'shock':
        R(g, x + 5, y + 3, 3, 3, C.white);
        R(g, x + 6, y + 4, 1, 1, C.ink);
        R(g, x + 5, y + 2, 3, 1, C.zHair);
        R(g, x + 6, y + 6, 2, 3, C.ink);
        break;
      case 'hurt':
        R(g, x + 5, y + 3, 1, 1, C.ink);
        R(g, x + 7, y + 3, 1, 1, C.ink);
        R(g, x + 6, y + 4, 1, 1, C.ink);
        R(g, x + 5, y + 5, 1, 1, C.ink);
        R(g, x + 7, y + 5, 1, 1, C.ink);
        R(g, x + 6, y + 7, 3, 2, C.ink);
        break;
      case 'down':
        R(g, x + 6, y + 5, 2, 1, C.ink);
        R(g, x + 5, y + 3, 3, 1, C.zHair);
        R(g, x + 6, y + 8, 2, 1, C.zSkinD);
        break;
      case 'blow':
        R(g, x + 6, y + 4, 1, 2, C.ink);
        R(g, x + 5, y + 3, 3, 1, C.zHair);
        R(g, x + 3, y + 6, 3, 2, '#d99a72');
        R(g, x + 8, y + 7, 2, 1, C.ink);
        break;
      default:
        R(g, x + 6, y + 4, 1, 2, C.ink);
        R(g, x + 5, y + 3, 3, 1, C.zHair);
        R(g, x + 6, y + 7, 2, 1, C.zSkinD);
    }
  }
  function zLeg(g, x, y, len, lift, col, shoe) {
    const pants = len - 2 - lift;
    R(g, x, y, 3, pants, col);
    R(g, x, y + pants, 4, 2, shoe);
  }
  // Heathered knit: a few light and dark flecks over the grey.
  function knit(g, x, y, w, h) {
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        const n = (xx * 7 + yy * 13 + x * 3) % 11;
        if (n === 0) R(g, x + xx, y + yy, 1, 1, C.zKnitL);
        else if (n === 5) R(g, x + xx, y + yy, 1, 1, C.zKnitD);
      }
    }
  }
  function zachBody(g, o) {
    const b = o.bob | 0;
    const lf = o.lf || [0, 0];
    const lb = o.lb || [0, 0];
    const af = o.af || [0, 0];
    const ab = o.ab || [0, 0];
    zLeg(g, 10 + lb[0], 25 + b, 9 - b, lb[1], C.jeansS, C.shoeS);
    R(g, 9 + ab[0], 17 + b + ab[1], 2, 6, C.zKnitS);
    R(g, 9 + ab[0], 23 + b + ab[1], 2, 2, C.zSkinS);
    R(g, 8, 16 + b, 8, 10, C.zKnit);
    knit(g, 8, 16 + b, 8, 10);
    R(g, 8, 16 + b, 2, 10, C.zKnitS);
    // shawl collar, the dark tee under it, two buttons
    R(g, 12, 16 + b, 3, 5, C.zKnitL);
    R(g, 14, 16 + b, 2, 3, C.zTee);
    R(g, 14, 21 + b, 1, 1, '#3a2a20');
    R(g, 14, 23 + b, 1, 1, '#3a2a20');
    R(g, 8, 25 + b, 8, 1, C.zKnitS);
    zLeg(g, 11 + lf[0], 25 + b, 9 - b, lf[1], C.jeans, C.shoe);
    zHead(g, 8, 6 + b, o.face || 'ok');
    R(g, 12 + af[0], 17 + b + af[1], 2, 6, C.zKnit);
    R(g, 12 + af[0], 18 + b + af[1], 1, 3, C.zKnitL);
    R(g, 12 + af[0], 23 + b + af[1], 2, 2, C.zSkin);
    if (o.phone) {
      R(g, 15, 13 + b, 3, 6, '#20242c');
      R(g, 16, 14 + b, 1, 4, '#7fd7ff');
    }
  }
  function zachDuck(g) {
    R(g, 7, 32, 5, 2, C.shoeS);
    R(g, 14, 32, 5, 2, C.shoe);
    R(g, 8, 28, 4, 4, C.jeansS);
    R(g, 13, 28, 5, 4, C.jeans);
    R(g, 7, 24, 11, 6, C.zKnit);
    knit(g, 7, 24, 11, 6);
    R(g, 7, 24, 2, 6, C.zKnitS);
    zHead(g, 9, 18, 'worry');
    R(g, 8, 18, 10, 2, C.zKnit);
    R(g, 17, 18, 2, 2, C.zSkin);
  }
  function zachSlide(g) {
    R(g, 21, 27, 2, 5, C.shoe);
    R(g, 12, 29, 10, 3, C.jeans);
    R(g, 10, 31, 9, 2, C.jeansS);
    R(g, 6, 24, 9, 7, C.zKnit);
    knit(g, 6, 24, 9, 7);
    R(g, 6, 24, 2, 7, C.zKnitS);
    R(g, 3, 30, 3, 3, C.zSkinS);
    R(g, 4, 28, 3, 3, C.zKnitS);
    zHead(g, 2, 17, 'shock');
    R(g, 12, 22, 6, 2, C.zKnit);
    R(g, 18, 21, 2, 2, C.zSkin);
  }
  const ZRUN = [
    { lf: [4, 0], lb: [-4, 1], af: [-3, -1], ab: [3, -1], face: 'worry' },
    { lf: [1, 2], lb: [-1, 0], af: [-1, 0], ab: [1, 0], bob: 1, face: 'worry' },
    { lf: [-4, 1], lb: [4, 0], af: [3, -1], ab: [-3, -1], face: 'worry' },
    { lf: [-1, 0], lb: [1, 2], af: [1, 0], ab: [-1, 0], bob: 1, face: 'worry' },
  ];
  const ZWALK = [
    { lf: [2, 0], lb: [-2, 0], af: [-1, 0], ab: [1, 0] },
    { lf: [0, 1], lb: [0, 0], bob: 1 },
    { lf: [-2, 0], lb: [2, 0], af: [1, 0], ab: [-1, 0] },
    { lf: [0, 0], lb: [0, 1], bob: 1 },
  ];
  const ZPOSE = {
    idle: { lf: [1, 0], lb: [-2, 0] },
    grin: { lf: [1, 0], lb: [-2, 0], face: 'grin', af: [1, -1] },
    worry: { lf: [1, 0], lb: [-2, 0], face: 'worry' },
    shock: { lf: [2, 0], lb: [-3, 0], af: [2, -7], ab: [-1, -7], face: 'shock' },
    jump: { lf: [2, 3], lb: [-3, 1], af: [1, -5], ab: [-1, -4], face: 'worry' },
    fall: { lf: [2, 1], lb: [-2, 2], af: [2, -7], ab: [-2, -7], face: 'shock' },
    hurt: { lf: [-2, 1], lb: [3, 0], af: [-3, -6], ab: [3, -7], face: 'hurt' },
    sorry: { lf: [1, 0], lb: [-2, 0], af: [2, -3], ab: [3, -3], face: 'worry' },
    phone: { lf: [1, 0], lb: [-2, 0], af: [3, -4], ab: [2, -3], face: 'down', phone: true },
    horn: { lf: [1, 0], lb: [-2, 0], af: [3, -6], face: 'blow' },
    poof: { lf: [1, 0], lb: [-2, 0], af: [3, -8], ab: [-2, -7], face: 'grin' },
    turn: { lf: [1, 0], lb: [-2, 0], face: 'shock' },
  };
  art.zach = function (pose, frame) {
    if (pose === 'duck' || pose === 'slide') return sprite('z-' + pose, 24, 34, pose === 'duck' ? zachDuck : zachSlide);
    let o;
    let key;
    if (pose === 'run') {
      o = ZRUN[frame & 3];
      key = 'z-run' + (frame & 3);
    } else if (pose === 'walk') {
      o = ZWALK[frame & 3];
      key = 'z-walk' + (frame & 3);
    } else {
      o = ZPOSE[pose] || ZPOSE.idle;
      key = 'z-' + pose;
    }
    return sprite(key, 24, 34, (g) => zachBody(g, o));
  };
  // Where a party hat sits, relative to the feet, facing right.
  art.zachHatAt = { x: 1, y: -29 };

  // ================================================================ ALEX
  function aHead(g, x, y, face) {
    // blonde, pulled back into a low bun
    R(g, x - 3, y + 5, 3, 4, C.aHairS);
    R(g, x - 1, y + 1, 3, 7, C.aHair);
    R(g, x, y + 1, 9, 9, C.aSkin);
    R(g, x, y, 9, 3, C.aHair);
    R(g, x + 1, y - 1, 7, 1, C.aHair);
    R(g, x, y, 3, 6, C.aHair);
    R(g, x + 3, y + 1, 4, 1, C.aHairL);
    R(g, x + 7, y + 2, 1, 2, C.aHair);
    R(g, x + 9, y + 5, 1, 2, C.aSkin);
    R(g, x + 2, y + 9, 7, 1, C.aSkinS);
    R(g, x + 3, y + 5, 2, 2, C.aSkinS);
    // gold hoop
    R(g, x + 3, y + 7, 1, 2, C.brass);
    // sunglasses pushed up on her head
    R(g, x + 3, y - 1, 6, 2, C.ink);
    R(g, x + 7, y - 1, 1, 1, '#7d8b99');
    switch (face) {
      case 'scream':
        R(g, x + 6, y + 4, 1, 1, C.ink);
        R(g, x + 5, y + 3, 3, 1, C.aHairS);
        R(g, x + 5, y + 6, 3, 3, C.mouth);
        break;
      case 'away':
        R(g, x + 4, y + 4, 1, 2, C.ink);
        R(g, x + 4, y + 3, 2, 1, C.aHairS);
        R(g, x + 6, y + 7, 2, 1, C.lips);
        break;
      case 'worry':
        R(g, x + 6, y + 4, 1, 2, C.ink);
        R(g, x + 6, y + 3, 2, 1, C.aHairS);
        R(g, x + 6, y + 7, 2, 2, C.mouth);
        break;
      case 'smile':
        R(g, x + 6, y + 4, 1, 2, C.ink);
        R(g, x + 7, y + 4, 1, 1, C.ink);
        R(g, x + 5, y + 7, 4, 2, C.lips);
        R(g, x + 5, y + 7, 4, 1, C.white);
        break;
      default:
        R(g, x + 6, y + 4, 1, 2, C.ink);
        R(g, x + 7, y + 4, 1, 1, C.ink);
        R(g, x + 6, y + 7, 2, 1, C.lips);
    }
  }
  function alexBody(g, o) {
    const b = o.bob | 0;
    const lf = o.lf || [0, 0];
    const lb = o.lb || [0, 0];
    const af = o.af || [0, 0];
    const ab = o.ab || [0, 0];
    zLeg(g, 10 + lb[0], 25 + b, 9 - b, lb[1], C.aJeansS, C.aBootS);
    R(g, 9 + ab[0], 17 + b + ab[1], 2, 6, C.aJacketS);
    R(g, 9 + ab[0], 23 + b + ab[1], 2, 2, C.aSkinS);
    // chore jacket, open over a white tee, corduroy collar
    R(g, 8, 16 + b, 8, 10, C.aJacket);
    R(g, 8, 16 + b, 2, 10, C.aJacketS);
    R(g, 14, 16 + b, 2, 6, C.shirtW);
    R(g, 13, 16 + b, 1, 10, C.aJacketL);
    R(g, 14, 19 + b, 1, 1, C.brass);
    R(g, 9, 16 + b, 5, 1, C.aCollar);
    R(g, 10, 21 + b, 3, 1, C.aJacketS);
    R(g, 8, 25 + b, 8, 1, C.aJacketS);
    zLeg(g, 11 + lf[0], 25 + b, 9 - b, lf[1], C.aJeans, C.aBoot);
    aHead(g, 8, 7 + b, o.face || 'ok');
    R(g, 12 + af[0], 17 + b + af[1], 2, 6, C.aJacket);
    R(g, 12 + af[0], 23 + b + af[1], 2, 2, C.aSkin);
    if (o.gift) {
      R(g, 13, 17 + b, 9, 8, '#d8433a');
      R(g, 16, 17 + b, 2, 8, C.brass);
    }
  }
  function alexKneel(g) {
    R(g, 2, 30, 10, 4, C.aJeansS);
    R(g, 0, 31, 3, 3, C.aBoot);
    R(g, 7, 26, 9, 5, C.aJeans);
    R(g, 8, 18, 8, 9, C.aJacket);
    R(g, 8, 18, 2, 9, C.aJacketS);
    R(g, 14, 18, 2, 4, C.shirtW);
    R(g, 9, 18, 5, 1, C.aCollar);
    aHead(g, 8, 9, 'scream');
    R(g, 13, 17, 8, 2, C.aJacketS);
    R(g, 14, 15, 8, 2, C.aJacket);
    R(g, 21, 13, 2, 3, C.aSkin);
    R(g, 20, 17, 2, 2, C.aSkinS);
  }
  function alexPeek(g) {
    aHead(g, 4, 4, 'worry');
    R(g, 12, 11, 3, 3, C.aSkin);
  }
  const AWALK = [
    { lf: [2, 0], lb: [-2, 0], af: [-1, 0], ab: [1, 0] },
    { lf: [0, 1], lb: [0, 0], bob: 1 },
    { lf: [-2, 0], lb: [2, 0], af: [1, 0], ab: [-1, 0] },
    { lf: [0, 0], lb: [0, 1], bob: 1 },
  ];
  const APOSE = {
    idle: { lf: [1, 0], lb: [-1, 0] },
    smile: { lf: [1, 0], lb: [-1, 0], face: 'smile' },
    worry: { lf: [1, 0], lb: [-1, 0], face: 'worry', af: [1, -3] },
    away: { lf: [1, 0], lb: [-1, 0], face: 'away' },
    gift: { lf: [1, 0], lb: [-1, 0], face: 'smile', af: [3, -2], gift: true },
  };
  art.alex = function (pose, frame) {
    if (pose === 'kneel') return sprite('a-kneel', 24, 34, alexKneel);
    if (pose === 'peek') return sprite('a-peek', 16, 16, alexPeek);
    if (pose === 'walk') return sprite('a-walk' + (frame & 3), 24, 34, (g) => alexBody(g, AWALK[frame & 3]));
    return sprite('a-' + pose, 24, 34, (g) => alexBody(g, APOSE[pose] || APOSE.idle));
  };
  art.alexHatAt = { x: 1, y: -28 };

  // Party hats: 9x11, anchored at the brim.
  art.hat = function (who) {
    const a = who === 'alex' ? C.blue : C.pink;
    const b = who === 'alex' ? '#f4f1ea' : C.yellow;
    return sprite('hat-' + who, 9, 11, (g) => {
      const rows = [[4, 1], [4, 1], [3, 3], [3, 3], [2, 5], [2, 5], [1, 7], [1, 7], [0, 9]];
      rows.forEach(([x, w], i) => R(g, x, i + 2, w, 1, Math.floor(i / 2) % 2 ? b : a));
      R(g, 3, 0, 3, 2, who === 'alex' ? C.yellow : '#ffffff');
    });
  };

  // ================================================================ DAD
  function recliner(g, crushed) {
    if (crushed) {
      R(g, 4, 44, 56, 9, C.chair);
      R(g, 6, 44, 52, 2, C.chairL);
      R(g, 1, 40, 13, 11, C.chairS);
      R(g, 50, 40, 13, 11, C.chairS);
      R(g, 14, 37, 2, 7, C.metal);
      R(g, 12, 35, 6, 2, C.metalL);
      R(g, 44, 36, 2, 8, C.metal);
      R(g, 42, 34, 6, 2, C.metalL);
      R(g, 28, 39, 2, 5, C.metal);
      R(g, 9, 53, 46, 3, C.chairS);
      R(g, 20, 47, 6, 2, C.chairS);
      R(g, 34, 49, 8, 2, C.chairS);
      return;
    }
    R(g, 11, 1, 42, 36, C.chair);
    R(g, 13, 0, 38, 1, C.chair);
    R(g, 11, 1, 3, 36, C.chairS);
    R(g, 50, 1, 3, 36, C.chairS);
    R(g, 14, 12, 36, 1, C.chairS);
    R(g, 14, 24, 36, 1, C.chairS);
    R(g, 16, 3, 32, 2, C.chairL);
    R(g, 2, 22, 11, 22, C.chair);
    R(g, 51, 22, 11, 22, C.chair);
    R(g, 1, 19, 13, 5, C.chairL);
    R(g, 50, 19, 13, 5, C.chairL);
    R(g, 2, 38, 11, 6, C.chairS);
    R(g, 51, 38, 11, 6, C.chairS);
    R(g, 12, 35, 40, 8, C.chairL);
    R(g, 14, 44, 36, 7, C.chair);
    R(g, 14, 50, 36, 1, C.chairS);
    R(g, 18, 51, 4, 5, C.woodD);
    R(g, 42, 51, 4, 5, C.woodD);
  }
  function dadFace(g, cx, y, o) {
    // cx = centre column of a 12px-wide head whose top row is y
    const x = cx - 6;
    R(g, x, y, 12, 13, C.skin);
    R(g, x + 1, y - 1, 10, 1, C.skin);
    R(g, x + 2, y, 4, 2, '#f8dbb6');
    R(g, x - 1, y + 4, 2, 7, C.dHair);
    R(g, x + 11, y + 4, 2, 7, C.dHair);
    R(g, x - 2, y + 6, 2, 3, C.skinS);
    R(g, x + 12, y + 6, 2, 3, C.skinS);
    const glare = o.eyes === 'glare' || o.eyes === 'glow';
    if (glare) {
      R(g, x + 1, y + 4, 4, 1, C.dHairS);
      R(g, x + 2, y + 3, 2, 1, C.dHairS);
      R(g, x + 7, y + 4, 4, 1, C.dHairS);
      R(g, x + 8, y + 3, 2, 1, C.dHairS);
    } else {
      R(g, x + 2, y + 4, 3, 1, C.dHairS);
      R(g, x + 7, y + 4, 3, 1, C.dHairS);
    }
    const ec = o.eyes === 'glow' ? C.eye : C.ink;
    if (o.eyes === 'blink') {
      R(g, x + 2, y + 6, 3, 1, C.skinD);
      R(g, x + 7, y + 6, 3, 1, C.skinD);
    } else {
      R(g, x + 3, y + 6, 1, 1, ec);
      R(g, x + 8, y + 6, 1, 1, ec);
      if (o.eyes === 'glow') {
        R(g, x + 2, y + 6, 3, 1, ec);
        R(g, x + 7, y + 6, 3, 1, ec);
      }
    }
    if (o.glasses) {
      R(g, x + 1, y + 5, 4, 1, C.glass);
      R(g, x + 1, y + 8, 4, 1, C.glass);
      R(g, x + 1, y + 5, 1, 4, C.glass);
      R(g, x + 4, y + 5, 1, 4, C.glass);
      R(g, x + 7, y + 5, 4, 1, C.glass);
      R(g, x + 7, y + 8, 4, 1, C.glass);
      R(g, x + 7, y + 5, 1, 4, C.glass);
      R(g, x + 10, y + 5, 1, 4, C.glass);
      R(g, x + 5, y + 6, 2, 1, C.glass);
    }
    R(g, x + 5, y + 7, 2, 3, C.skinS);
    const thick = o.stache ? 1 : 0;
    R(g, x + 2, y + 10, 8, 2 + thick, C.stache);
    R(g, x + 3, y + 10, 6, 1, C.stacheL);
    if (thick) {
      R(g, x + 1, y + 11, 1, 3, C.stache);
      R(g, x + 10, y + 11, 1, 3, C.stache);
    }
    R(g, x + 4, y + 12 + thick, 4, 1, C.skinD);
  }
  art.dadSeated = function (o) {
    o = o || {};
    const key = 'dad-seat-' + (o.remote ? 'r' : '') + (o.glasses === false ? '' : 'g') + (o.eyes || 'calm');
    return sprite(key, 64, 56, (g) => {
      recliner(g, false);
      R(g, 21, 34, 10, 8, C.khaki);
      R(g, 33, 34, 10, 8, C.khaki);
      R(g, 21, 41, 10, 2, C.khakiS);
      R(g, 33, 41, 10, 2, C.khakiS);
      R(g, 22, 43, 8, 3, C.khaki);
      R(g, 34, 43, 8, 3, C.khaki);
      R(g, 21, 45, 10, 6, C.slipper);
      R(g, 33, 45, 10, 6, C.slipper);
      R(g, 22, 45, 8, 2, C.slipperL);
      R(g, 34, 45, 8, 2, C.slipperL);
      R(g, 20, 19, 24, 16, C.cardi);
      R(g, 20, 19, 3, 16, C.cardiS);
      R(g, 41, 19, 3, 16, C.cardiS);
      R(g, 28, 19, 8, 4, C.shirtW);
      R(g, 29, 23, 6, 2, C.shirtW);
      R(g, 30, 25, 4, 2, C.shirtW);
      R(g, 31, 27, 2, 7, C.cardiS);
      for (let i = 0; i < 4; i++) R(g, 33, 27 + i * 2, 1, 1, C.brass);
      R(g, 22, 33, 20, 2, C.belt);
      R(g, 15, 20, 6, 9, C.cardi);
      R(g, 43, 20, 6, 9, C.cardi);
      R(g, 13, 25, 7, 4, C.skin);
      R(g, 44, 25, 7, 4, C.skin);
      if (o.remote) {
        R(g, 14, 20, 3, 7, '#2b2b30');
        R(g, 15, 21, 1, 1, '#ff4040');
      }
      R(g, 29, 17, 6, 3, C.skinS);
      dadFace(g, 32, 4, { glasses: o.glasses !== false, eyes: o.eyes || 'calm' });
    });
  };
  art.recliner = function (crushed) {
    return sprite('recliner-' + (crushed ? 'x' : 'ok'), 64, 56, (g) => recliner(g, crushed));
  };
  // Standing, front view. Somehow taller standing than sitting.
  art.dadStand = function (o) {
    o = o || {};
    const buttons = o.buttons == null ? 4 : o.buttons;
    const key = 'dad-stand-' + (o.pose || 'down') + buttons + (o.glasses === false ? '' : 'g') + (o.eyes || 'calm');
    return sprite(key, 40, 52, (g) => {
      R(g, 11, 48, 8, 4, C.slipper);
      R(g, 21, 48, 8, 4, C.slipper);
      R(g, 12, 48, 6, 1, C.slipperL);
      R(g, 22, 48, 6, 1, C.slipperL);
      R(g, 13, 31, 6, 17, C.khaki);
      R(g, 21, 31, 6, 17, C.khaki);
      R(g, 15, 33, 1, 14, C.khakiS);
      R(g, 24, 33, 1, 14, C.khakiS);
      R(g, 19, 31, 2, 6, C.khakiS);
      R(g, 12, 30, 16, 2, C.belt);
      R(g, 19, 30, 2, 2, C.brass);
      R(g, 10, 14, 20, 16, C.cardi);
      R(g, 9, 21, 22, 9, C.cardi);
      R(g, 10, 14, 2, 16, C.cardiS);
      R(g, 28, 14, 2, 16, C.cardiS);
      R(g, 17, 14, 6, 16, C.shirtW);
      R(g, 17, 14, 1, 16, C.shirtWS);
      R(g, 16, 14, 1, 16, C.cardiL);
      R(g, 23, 14, 1, 16, C.cardiS);
      for (let i = 0; i < buttons; i++) R(g, 15, 16 + i * 3, 1, 2, C.brass);
      const pose = o.pose || 'down';
      if (pose === 'point') {
        R(g, 6, 15, 4, 13, C.cardi);
        R(g, 6, 28, 4, 3, C.skin);
        R(g, 30, 15, 7, 4, C.cardi);
        R(g, 37, 15, 3, 3, C.skin);
      } else if (pose === 'glasses') {
        R(g, 7, 15, 4, 8, C.cardi);
        R(g, 29, 15, 4, 8, C.cardi);
        R(g, 10, 21, 6, 3, C.cardi);
        R(g, 24, 21, 6, 3, C.cardi);
        R(g, 15, 20, 4, 3, C.skin);
        R(g, 21, 20, 4, 3, C.skin);
        R(g, 16, 19, 8, 2, C.glass);
      } else {
        R(g, 6, 15, 4, 13, C.cardi);
        R(g, 30, 15, 4, 13, C.cardi);
        R(g, 6, 15, 1, 13, C.cardiS);
        R(g, 6, 28, 4, 3, C.skin);
        R(g, 30, 28, 4, 3, C.skin);
      }
      R(g, 17, 12, 6, 2, C.skinS);
      dadFace(g, 20, 1, { glasses: o.glasses !== false, eyes: o.eyes || 'calm', stache: o.stache });
    });
  };

  // ================================================================ THE GIRLFRIEND'S DAD BEAST
  // Front view, 84x106. The khakis hold. They are good khakis.
  art.beastFront = function (o) {
    o = o || {};
    const key = 'beast-f-' + (o.roar ? 'r' : '') + (o.stomp ? 's' : '') + (o.look || '');
    return sprite(key, 84, 106, (g) => {
      if (o.stomp) {
        R(g, 44, 74, 7, 17, C.khaki);
        R(g, 43, 90, 9, 5, C.slipper);
        R(g, 44, 90, 7, 1, C.slipperL);
      } else {
        R(g, 44, 84, 7, 17, C.khaki);
        R(g, 43, 100, 9, 5, C.slipper);
        R(g, 44, 100, 7, 1, C.slipperL);
        R(g, 46, 86, 1, 14, C.khakiS);
      }
      R(g, 33, 84, 7, 17, C.khaki);
      R(g, 32, 100, 9, 5, C.slipper);
      R(g, 33, 100, 7, 1, C.slipperL);
      R(g, 35, 86, 1, 14, C.khakiS);
      R(g, 40, 84, 4, 6, C.khakiS);
      for (let y = 26; y < 83; y++) {
        const t = (y - 26) / 56;
        const w = Math.round(EC.lerp(72, 22, Math.pow(t, 0.75)));
        R(g, 42 - (w >> 1), y, w, 1, C.bSkin);
      }
      R(g, 31, 81, 22, 4, C.belt);
      R(g, 40, 81, 4, 4, C.brass);
      R(g, 41, 30, 2, 48, C.bSkinS);
      R(g, 17, 43, 22, 2, C.bSkinS);
      R(g, 45, 43, 22, 2, C.bSkinS);
      for (let i = 0; i < 3; i++) {
        R(g, 34, 52 + i * 8, 6, 1, C.bSkinS);
        R(g, 44, 52 + i * 8, 6, 1, C.bSkinS);
      }
      R(g, 21, 31, 14, 2, C.bSkinL);
      R(g, 49, 31, 14, 2, C.bSkinL);
      R(g, 8, 26, 16, 8, C.cardi);
      R(g, 60, 26, 16, 8, C.cardi);
      R(g, 9, 34, 4, 4, C.cardi);
      R(g, 17, 34, 3, 6, C.cardi);
      R(g, 71, 34, 4, 5, C.cardi);
      R(g, 63, 34, 3, 3, C.cardi);
      R(g, 8, 26, 16, 2, C.cardiL);
      R(g, 60, 26, 16, 2, C.cardiL);
      R(g, 34, 26, 5, 4, C.shirtW);
      R(g, 45, 26, 5, 4, C.shirtW);
      if (o.roar) {
        R(g, 1, 6, 12, 28, C.bSkin);
        R(g, 1, 6, 3, 28, C.bSkinS);
        R(g, 0, 0, 14, 10, C.bSkin);
        R(g, 71, 6, 12, 28, C.bSkin);
        R(g, 80, 6, 3, 28, C.bSkinS);
        R(g, 70, 0, 14, 10, C.bSkin);
      } else {
        R(g, 0, 30, 14, 44, C.bSkin);
        R(g, 0, 30, 3, 44, C.bSkinS);
        R(g, 3, 36, 10, 10, C.bSkinL);
        R(g, 0, 72, 15, 12, C.bSkin);
        R(g, 1, 82, 13, 2, C.bSkinS);
        R(g, 70, 30, 14, 44, C.bSkin);
        R(g, 81, 30, 3, 44, C.bSkinS);
        R(g, 71, 36, 10, 10, C.bSkinL);
        R(g, 69, 72, 15, 12, C.bSkin);
        R(g, 70, 82, 13, 2, C.bSkinS);
      }
      R(g, 34, 22, 16, 6, C.bSkinS);
      R(g, 32, 6, 20, 18, C.bSkin);
      R(g, 33, 5, 18, 1, C.bSkin);
      R(g, 35, 7, 6, 2, C.bSkinL);
      R(g, 31, 11, 2, 9, C.dHair);
      R(g, 51, 11, 2, 9, C.dHair);
      R(g, 29, 13, 2, 4, C.bSkinS);
      R(g, 53, 13, 2, 4, C.bSkinS);
      R(g, 31, 4, 5, 4, C.horn);
      R(g, 27, 1, 6, 4, C.horn);
      R(g, 24, 2, 4, 5, C.horn);
      R(g, 23, 6, 3, 3, C.hornS);
      R(g, 48, 4, 5, 4, C.horn);
      R(g, 51, 1, 6, 4, C.horn);
      R(g, 56, 2, 4, 5, C.horn);
      R(g, 58, 6, 3, 3, C.hornS);
      R(g, 34, 10, 6, 2, C.stacheS);
      R(g, 44, 10, 6, 2, C.stacheS);
      R(g, 39, 11, 2, 1, C.stacheS);
      R(g, 43, 11, 2, 1, C.stacheS);
      const ey = o.look === 'down' ? 14 : 12;
      const ex = o.look === 'side' ? -2 : 0;
      R(g, 35 + ex, ey, 4, 2, C.eye);
      R(g, 45 + ex, ey, 4, 2, C.eye);
      R(g, 40, 13, 4, 5, C.bSkinS);
      R(g, 33, 17, 18, 4, C.stache);
      R(g, 31, 19, 3, 6, C.stache);
      R(g, 50, 19, 3, 6, C.stache);
      R(g, 34, 17, 16, 1, C.stacheL);
      if (o.roar) {
        R(g, 36, 21, 12, 6, C.mouth);
        R(g, 37, 21, 10, 1, C.white);
        R(g, 37, 26, 10, 1, C.white);
      } else R(g, 37, 22, 10, 1, C.bSkinS);
    });
  };
  art.beastFrontEyes = [[-5, -93], [5, -93]];

  // Side view for the chase, 78x88, facing right.
  function bLeg(g, x, y, len, lift, col, shoe) {
    const pants = len - 4 - lift;
    R(g, x, y, 6, pants, col);
    R(g, x - 1, y + pants, 10, 4, shoe);
  }
  function bArm(g, arm, b, back) {
    // The front arm gets an ink pass first so it reads against his chest.
    if (!back) {
      const ink = (x, y, w, h) => R(g, x - 1, y - 1, w + 2, h + 2, C.ink);
      armShape(ink, arm, b, 0);
    }
    armShape((x, y, w, h) => R(g, x, y, w, h, back ? C.bSkinS : C.bSkin), arm, b, back ? -16 : 0, back, g);
  }
  function armShape(R, arm, b, dx, back, g) {
    switch (arm) {
      case 'swing1':
        R(46 + dx, 28 + b, 11, 15);
        R(41 + dx, 41 + b, 10, 13);
        R(38 + dx, 52 + b, 12, 10);
        break;
      case 'up':
        R(44 + dx, 12 + b, 10, 20);
        R(36 + dx, 3 + b, 11, 12);
        R(33 + dx, 0 + b, 12, 9);
        break;
      case 'fwd':
        R(50 + dx, 28 + b, 18, 11);
        R(66 + dx, 27 + b, 11, 11);
        break;
      case 'down':
        R(52 + dx, 38 + b, 10, 16);
        R(54 + dx, 52 + b, 11, 10);
        break;
      case 'wide':
        R(54 + dx, 18 + b, 16, 10);
        R(66 + dx, 9 + b, 11, 12);
        break;
      case 'hold':
        R(50 + dx, 28 + b, 10, 12);
        R(52 + dx, 38 + b, 14, 8);
        if (g && !back) {
          art.R(g, 58, 31 + b, 13, 4, C.slipper);
          art.R(g, 58, 35 + b, 13, 3, C.slipperS);
          art.R(g, 59, 31 + b, 11, 1, C.slipperL);
        }
        R(62 + dx, 36 + b, 9, 9);
        break;
      default:
        R(50 + dx, 28 + b, 11, 15);
        R(54 + dx, 41 + b, 10, 13);
        R(55 + dx, 52 + b, 12, 10);
    }
  }
  function bHead(g, hx, hy, roar) {
    R(g, hx - 5, hy - 3, 4, 4, C.hornS);
    R(g, hx - 2, hy - 5, 5, 5, C.hornS);
    R(g, hx + 2, hy - 2, 5, 5, C.hornS);
    R(g, hx - 1, hy + 1, 20, 20, C.ink);
    R(g, hx, hy + 2, 18, 18, C.bSkin);
    R(g, hx + 1, hy + 1, 15, 1, C.bSkin);
    R(g, hx + 4, hy + 3, 7, 2, C.bSkinL);
    R(g, hx, hy + 8, 4, 8, C.dHair);
    R(g, hx + 3, hy + 10, 3, 4, C.bSkinS);
    R(g, hx + 9, hy - 1, 5, 4, C.horn);
    R(g, hx + 12, hy - 5, 5, 5, C.horn);
    R(g, hx + 16, hy - 4, 4, 4, C.horn);
    R(g, hx + 18, hy - 1, 3, 3, C.hornS);
    R(g, hx + 10, hy + 6, 9, 2, C.stacheS);
    R(g, hx + 13, hy + 8, 4, 2, C.eye);
    R(g, hx + 18, hy + 9, 3, 5, C.bSkin);
    R(g, hx + 18, hy + 13, 3, 1, C.bSkinS);
    if (roar) {
      R(g, hx + 11, hy + 17, 9, 6, C.mouth);
      R(g, hx + 12, hy + 17, 7, 1, C.white);
      R(g, hx + 12, hy + 22, 7, 1, C.white);
      R(g, hx + 10, hy + 14, 11, 3, C.stache);
      R(g, hx + 19, hy + 15, 3, 4, C.stache);
    } else {
      R(g, hx + 10, hy + 19, 10, 2, C.bSkinS);
      R(g, hx + 11, hy + 14, 11, 4, C.stache);
      R(g, hx + 19, hy + 17, 3, 4, C.stache);
      R(g, hx + 12, hy + 14, 9, 1, C.stacheL);
    }
  }
  const BLEGS = [
    { lf: [5, 0], lb: [-5, 1] },
    { lf: [1, 2], lb: [-1, 0], bob: 1 },
    { lf: [-5, 1], lb: [5, 0] },
    { lf: [-1, 0], lb: [1, 2], bob: 1 },
  ];
  // o: { frame, arm, armB, head: 'n'|'roar'|'low', drop, socks }
  art.beastSide = function (o) {
    const legs = o.still ? { lf: [2, 0], lb: [-3, 0] } : BLEGS[(o.frame || 0) & 3];
    const arm = o.arm || ((o.frame || 0) & 2 ? 'swing1' : 'swing0');
    const armB = o.armB || (arm === 'swing0' ? 'swing1' : arm === 'swing1' ? 'swing0' : arm);
    const key = 'beast-s-' + (o.still ? 's' : (o.frame || 0) & 3) + arm + armB + (o.head || 'n') + (o.drop | 0) + (o.socks ? 'x' : '') + (o.legUp || '');
    return sprite(key, 78, 88, (g) => {
      const b = (legs.bob | 0) + (o.drop | 0);
      const foot = o.socks ? C.sock : C.slipper;
      const footB = o.socks ? C.sockS : C.slipperS;
      bLeg(g, 30 + legs.lb[0], 68, 20, legs.lb[1], C.khakiS, footB);
      bArm(g, armB, b, true);
      R(g, 22, 22 + b, 40, 10, C.bSkin);
      R(g, 16, 30 + b, 50, 18, C.bSkin);
      R(g, 22, 48 + b, 36, 12, C.bSkin);
      R(g, 28, 58 + b, 24, Math.max(2, 9 - b), C.bSkin);
      R(g, 16, 30 + b, 4, 18, C.bSkinS);
      R(g, 22, 22 + b, 6, 8, C.bSkinS);
      R(g, 40, 38 + b, 22, 2, C.bSkinS);
      R(g, 44, 48 + b, 12, 1, C.bSkinS);
      R(g, 46, 54 + b, 10, 1, C.bSkinS);
      R(g, 28, 24 + b, 16, 3, C.bSkinL);
      R(g, 30, 21 + b, 18, 7, C.cardi);
      R(g, 31, 28 + b, 4, 4, C.cardi);
      R(g, 39, 28 + b, 3, 3, C.cardi);
      R(g, 30, 21 + b, 18, 2, C.cardiL);
      R(g, 28, 64, 24, 4, C.belt);
      R(g, 47, 64, 3, 4, C.brass);
      if (o.legUp === 'kick') {
        // a slipper, straight out
        R(g, 38, 61, 17, 7, C.khaki);
        R(g, 38, 61, 17, 1, C.khakiS);
        R(g, 54, 57, 5, 12, foot);
      } else if (o.legUp === 'stomp') {
        // knee up, slipper raised
        R(g, 37, 56, 13, 6, C.khaki);
        R(g, 45, 56, 6, 14, C.khaki);
        R(g, 43, 69, 11, 4, foot);
      } else bLeg(g, 36 + legs.lf[0], 68, 20, legs.lf[1], C.khaki, foot);
      if (o.head === 'low') bHead(g, 54, 36 + b, false);
      else if (o.head === 'roar') bHead(g, 52, 4 + b, true);
      else bHead(g, 51, 9 + b, false);
      bArm(g, arm, b, false);
    });
  };
  // Eye position relative to the feet anchor (facing right) for each head pose.
  art.beastSideEye = { n: [26, -70], roar: [27, -75], low: [29, -43] };
  // Hand positions relative to feet anchor (facing right), for thrown objects.
  art.beastHand = { up: [-1, -84], fwd: [33, -55], hold: [27, -47], grab: [33, -52] };

  // ================================================================ WHAT'S LEFT OF ZACH
  const BLOOD = (C.blood = '#d6102b');
  const BLOODD = (C.bloodD = '#8c0a1d');
  function zTorso(g, x, y) {
    R(g, x + 2, y, 8, 10, C.zKnit);
    knit(g, x + 2, y, 8, 10);
    R(g, x + 2, y, 2, 10, C.zKnitS);
    R(g, x + 6, y, 3, 5, C.zKnitL);
    R(g, x + 8, y, 2, 3, C.zTee);
    R(g, x, y + 1, 2, 6, C.zKnitS);
    R(g, x + 10, y + 1, 2, 6, C.zKnit);
    R(g, x, y + 7, 2, 2, C.zSkinS);
    R(g, x + 10, y + 7, 2, 2, C.zSkin);
  }
  function zLegs(g, x, y) {
    R(g, x, y, 3, 8, C.jeansS);
    R(g, x + 4, y, 3, 8, C.jeans);
    R(g, x, y + 8, 4, 2, C.shoeS);
    R(g, x + 4, y + 8, 4, 2, C.shoe);
  }
  function cube(g) {
    R(g, 0, 0, 13, 13, C.zKnit);
    knit(g, 0, 0, 13, 13);
    R(g, 1, 0, 11, 2, C.zHair);
    R(g, 2, 2, 7, 5, C.zSkin);
    R(g, 3, 3, 1, 1, C.ink);
    R(g, 7, 3, 1, 1, C.ink);
    R(g, 4, 5, 3, 1, C.ink);
    R(g, 1, 8, 6, 4, C.jeans);
    R(g, 8, 10, 4, 2, C.shoe);
    R(g, 9, 7, 3, 1, BLOOD);
    R(g, 0, 12, 13, 1, BLOODD);
  }
  const GIBS = {
    head: [12, 13, (g) => {
      zHead(g, 1, 2, 'hurt');
      R(g, 3, 12, 5, 1, BLOOD);
    }],
    headOk: [12, 13, (g) => zHead(g, 1, 2, 'worry')],
    headBlink: [12, 13, (g) => {
      zHead(g, 1, 2, 'down');
      R(g, 3, 12, 5, 1, BLOOD);
    }],
    torso: [12, 12, (g) => {
      zTorso(g, 0, 1);
      R(g, 4, 0, 4, 1, BLOOD);
      R(g, 2, 11, 8, 1, BLOOD);
    }],
    legs: [9, 11, (g) => {
      zLegs(g, 0, 1);
      R(g, 0, 0, 7, 1, BLOOD);
    }],
    leg: [5, 11, (g) => {
      R(g, 1, 1, 3, 8, C.jeans);
      R(g, 0, 9, 5, 2, C.shoe);
      R(g, 1, 0, 3, 1, BLOOD);
    }],
    arm: [3, 9, (g) => {
      R(g, 0, 1, 2, 6, C.zKnit);
      R(g, 0, 7, 2, 2, C.zSkin);
      R(g, 0, 0, 2, 1, BLOOD);
    }],
    shoe: [6, 3, (g) => {
      R(g, 0, 0, 6, 3, C.shoe);
      R(g, 0, 2, 6, 1, C.shoeS);
      R(g, 4, 0, 2, 1, C.ink);
    }],
    bone: [7, 3, (g) => {
      R(g, 1, 1, 5, 1, '#f4f1ea');
      R(g, 0, 0, 2, 3, '#f4f1ea');
      R(g, 5, 0, 2, 3, '#f4f1ea');
    }],
    top: [12, 24, (g) => {
      zHead(g, 1, 3, 'hurt');
      zTorso(g, 0, 13);
      R(g, 2, 23, 8, 1, BLOOD);
    }],
    body: [12, 22, (g) => {
      zTorso(g, 0, 1);
      zLegs(g, 2, 11);
      R(g, 4, 0, 4, 1, BLOOD);
      R(g, 5, 0, 2, 1, BLOODD);
    }],
    flat: [32, 5, (g) => {
      R(g, 0, 1, 3, 3, C.zHair);
      R(g, 3, 0, 7, 5, C.zSkin);
      R(g, 5, 1, 1, 1, C.ink);
      R(g, 7, 1, 1, 1, C.ink);
      R(g, 5, 3, 3, 1, C.ink);
      R(g, 10, 0, 10, 5, C.zKnit);
      knit(g, 10, 0, 10, 5);
      R(g, 20, 0, 8, 5, C.jeans);
      R(g, 20, 2, 8, 1, C.jeansS);
      R(g, 28, 0, 4, 5, C.shoe);
      R(g, 0, 4, 32, 1, BLOOD);
      R(g, 2, 0, 1, 1, BLOOD);
      R(g, 15, 0, 2, 1, BLOOD);
    }],
    cube: [15, 13, (g) => {
      cube(g);
      R(g, 13, 6, 1, 5, C.woodD);
      R(g, 13, 5, 2, 2, C.wood);
    }],
    cubeFeet: [22, 13, (g) => {
      cube(g);
      R(g, 13, 7, 6, 2, C.jeans);
      R(g, 18, 6, 4, 3, C.shoe);
      R(g, 13, 10, 6, 2, C.jeansS);
      R(g, 18, 9, 4, 3, C.shoe);
      R(g, 13, 7, 1, 6, BLOOD);
    }],
    framed: [24, 34, (g) => {
      R(g, 0, 0, 24, 32, C.brass);
      R(g, 2, 2, 20, 28, '#e9dcc0');
      R(g, 6, 3, 12, 2, C.zHair);
      R(g, 5, 5, 14, 6, C.zSkin);
      R(g, 8, 7, 1, 1, C.ink);
      R(g, 15, 7, 1, 1, C.ink);
      R(g, 10, 9, 4, 1, C.ink);
      R(g, 4, 11, 16, 8, C.zKnit);
      knit(g, 4, 11, 16, 8);
      R(g, 2, 12, 2, 6, C.zKnit);
      R(g, 20, 12, 2, 6, C.zKnit);
      R(g, 6, 19, 12, 7, C.jeans);
      R(g, 11, 19, 2, 7, C.jeansS);
      R(g, 5, 26, 6, 2, C.shoe);
      R(g, 13, 26, 6, 2, C.shoe);
      R(g, 4, 10, 2, 3, BLOOD);
      R(g, 17, 20, 2, 4, BLOOD);
      R(g, 7, 28, 3, 2, BLOOD);
      R(g, 8, 32, 1, 2, BLOOD);
      R(g, 15, 32, 1, 1, BLOOD);
    }],
  };
  art.gib = function (name) {
    const d = GIBS[name];
    return sprite('gib-' + name, d[0], d[1], d[2], true);
  };

  // ================================================================ PROPS
  const PROPS = {
    // a casserole in a floral glass dish, still warm
    casserole: [16, 9, (g) => {
      R(g, 1, 3, 14, 6, '#f4f1ea');
      R(g, 0, 4, 1, 2, '#f4f1ea');
      R(g, 15, 4, 1, 2, '#f4f1ea');
      R(g, 2, 6, 12, 1, '#3d6fc4');
      R(g, 4, 6, 1, 1, '#d8433a');
      R(g, 9, 6, 1, 1, '#d8433a');
      R(g, 2, 1, 12, 3, '#e0913a');
      R(g, 3, 0, 4, 1, '#f2b45a');
      R(g, 9, 0, 3, 1, '#f2b45a');
      R(g, 4, 2, 2, 1, '#b8642a');
      R(g, 10, 1, 2, 1, '#b8642a');
    }, true],
    remote: [12, 5, (g) => {
      R(g, 0, 0, 12, 5, '#2b2b30');
      R(g, 9, 1, 2, 2, '#ff4040');
      R(g, 2, 1, 1, 1, '#9a9aa6');
      R(g, 4, 1, 1, 1, '#9a9aa6');
      R(g, 2, 3, 1, 1, '#9a9aa6');
      R(g, 4, 3, 1, 1, '#9a9aa6');
      R(g, 6, 2, 2, 1, '#9a9aa6');
    }, true],
    plate: [13, 13, (g) => {
      disc(g, 6.5, 6.5, 6, '#3d6fc4');
      disc(g, 6.5, 6.5, 5, '#f4f1ea');
      disc(g, 6.5, 6.5, 3, '#dfe6f0');
      R(g, 5, 5, 3, 3, '#3d6fc4');
    }, true],
    gravy: [15, 8, (g) => {
      R(g, 2, 2, 10, 5, '#f4f1ea');
      R(g, 0, 1, 4, 2, '#f4f1ea');
      R(g, 12, 2, 3, 3, '#f4f1ea');
      R(g, 4, 7, 6, 1, '#cfc8b8');
      R(g, 3, 2, 8, 1, '#8a5a2b');
      R(g, 4, 4, 6, 1, '#3d6fc4');
    }, true],
    tvguide: [9, 11, (g) => {
      R(g, 0, 0, 9, 11, '#f2d14a');
      R(g, 1, 1, 7, 2, '#d8433a');
      R(g, 1, 4, 7, 5, '#5a7fc4');
      R(g, 2, 5, 3, 3, '#f1c493');
    }, true],
    trophy: [9, 12, (g) => {
      R(g, 1, 0, 7, 5, C.brass);
      R(g, 0, 1, 1, 3, C.brass);
      R(g, 8, 1, 1, 3, C.brass);
      R(g, 3, 5, 3, 3, C.brassS);
      R(g, 1, 8, 7, 4, '#3e2312');
      R(g, 2, 1, 2, 2, '#fff2b0');
    }, true],
    coaster: [9, 9, (g) => {
      disc(g, 4.5, 4.5, 4, '#b98a52');
      disc(g, 4.5, 4.5, 2, '#9a6d3a');
    }, true],
    disk: [10, 10, (g) => {
      R(g, 0, 0, 10, 10, '#3f7fd9');
      R(g, 8, 0, 2, 2, '#2d5fae');
      R(g, 2, 0, 5, 3, '#c9ced6');
      R(g, 5, 0, 1, 2, C.ink);
      R(g, 1, 5, 8, 5, '#f3ebd9');
      R(g, 2, 6, 6, 1, '#d8433a');
      R(g, 2, 8, 4, 1, '#9a8e7a');
    }, true],
    key: [11, 6, (g) => {
      R(g, 0, 0, 4, 6, C.brass);
      R(g, 1, 2, 2, 2, C.ink);
      R(g, 4, 2, 7, 2, C.brass);
      R(g, 8, 4, 1, 2, C.brass);
      R(g, 6, 4, 1, 1, C.brass);
      R(g, 0, 0, 4, 1, '#fff2b0');
    }, true],
    gift: [14, 14, (g) => {
      R(g, 0, 4, 14, 10, '#d8433a');
      R(g, 0, 4, 14, 2, '#b8322a');
      R(g, 6, 4, 2, 10, C.brass);
      R(g, 0, 8, 14, 2, C.brass);
      R(g, 2, 0, 4, 4, C.brass);
      R(g, 8, 0, 4, 4, C.brass);
      R(g, 3, 1, 2, 2, '#d8433a');
      R(g, 9, 1, 2, 2, '#d8433a');
      R(g, 9, 11, 4, 2, '#f3ebd9');
    }, false],
    basket: [22, 15, (g) => {
      R(g, 0, 3, 22, 12, '#efe6d2');
      for (let x = 2; x < 22; x += 4) R(g, x, 4, 1, 11, '#c9bfa6');
      R(g, 0, 8, 22, 1, '#c9bfa6');
      R(g, 0, 3, 22, 2, '#d9cfb8');
      R(g, 2, 0, 6, 4, '#d8433a');
      R(g, 8, 1, 7, 3, '#3fa9ff');
      R(g, 14, 0, 6, 4, '#7ab55c');
    }, false],
    roomba: [18, 6, (g) => {
      R(g, 1, 1, 16, 5, '#2a2c33');
      R(g, 0, 3, 18, 3, '#2a2c33');
      R(g, 3, 0, 12, 1, '#3c3f48');
      R(g, 6, 1, 6, 2, '#5a5f6a');
      R(g, 13, 2, 2, 1, '#6cff8a');
    }, false],
    bucket: [16, 16, (g) => {
      R(g, 1, 5, 14, 11, '#f2c43a');
      R(g, 0, 5, 16, 2, '#d9a92a');
      R(g, 3, 8, 10, 1, '#d9a92a');
      R(g, 9, 0, 2, 7, '#c9ced6');
      R(g, 6, 3, 8, 3, '#e8e2d2');
      R(g, 2, 7, 12, 1, '#7fb8d9');
    }, false],
    coffee: [56, 14, (g) => {
      R(g, 0, 0, 56, 4, C.woodL);
      R(g, 0, 3, 56, 1, C.woodS);
      R(g, 2, 4, 52, 4, C.wood);
      R(g, 3, 4, 4, 10, C.woodS);
      R(g, 49, 4, 4, 10, C.woodS);
      R(g, 16, 0, 10, 1, '#c9a26e');
      R(g, 34, 1, 6, 2, '#f4f1ea');
    }, false],
    ottoman: [24, 14, (g) => {
      R(g, 0, 0, 24, 11, '#c77c56');
      R(g, 0, 0, 24, 2, '#e09a70');
      for (let x = 3; x < 24; x += 6) R(g, x, 5, 2, 2, '#f4e1a0');
      R(g, 2, 11, 3, 3, C.woodD);
      R(g, 19, 11, 3, 3, C.woodD);
    }, false],
    slippers: [16, 4, (g) => {
      R(g, 0, 0, 7, 4, C.slipper);
      R(g, 9, 0, 7, 4, C.slipper);
      R(g, 1, 0, 5, 1, C.slipperL);
      R(g, 10, 0, 5, 1, C.slipperL);
    }, false],
    glasses: [9, 3, (g) => {
      R(g, 0, 0, 4, 3, C.glass);
      R(g, 5, 0, 4, 3, C.glass);
      R(g, 1, 1, 2, 1, C.lens);
      R(g, 6, 1, 2, 1, C.lens);
      R(g, 4, 1, 1, 1, C.glass);
    }, false],
    remoteFlat: [10, 3, (g) => {
      R(g, 0, 0, 10, 3, '#2b2b30');
      R(g, 7, 1, 2, 1, '#ff4040');
    }, false],
    button: [2, 2, (g) => R(g, 0, 0, 2, 2, C.brass), true],
    phone: [5, 8, (g) => {
      R(g, 0, 0, 5, 8, '#20242c');
      R(g, 1, 1, 3, 5, '#7fd7ff');
    }, true],
  };
  art.prop = function (name) {
    const p = PROPS[name];
    return sprite('p-' + name, p[0], p[1], p[2], p[3]);
  };

  // Lane furniture: these sit in front of the wall and collide.
  art.couch = function () {
    return sprite('couch', 122, 40, (g) => {
      R(g, 6, 0, 110, 18, '#e9c9b4');
      R(g, 6, 0, 110, 3, '#f5dccb');
      for (let x = 10; x < 116; x += 14) {
        R(g, x, 6, 4, 4, '#c8556a');
        R(g, x + 4, 9, 3, 3, '#7aa65b');
        R(g, x + 7, 4, 3, 3, '#e3a33c');
      }
      R(g, 0, 10, 14, 30, '#e2bfa9');
      R(g, 108, 10, 14, 30, '#e2bfa9');
      R(g, 0, 10, 14, 3, '#f5dccb');
      R(g, 108, 10, 14, 3, '#f5dccb');
      R(g, 12, 16, 98, 10, '#efd2be');
      for (let x = 16; x < 108; x += 14) {
        R(g, x, 19, 4, 4, '#c8556a');
        R(g, x + 5, 21, 3, 3, '#7aa65b');
      }
      R(g, 12, 26, 98, 12, '#d9b39c');
      R(g, 60, 16, 1, 22, '#c69d86');
      R(g, 6, 38, 4, 2, C.woodD);
      R(g, 112, 38, 4, 2, C.woodD);
      // the plastic covers
      g.fillStyle = 'rgba(255,255,255,0.55)';
      for (let x = 4; x < 122; x += 18) g.fillRect(x, 2 + ((x / 18) % 2) * 3, 6, 1);
      for (let x = 14; x < 112; x += 22) g.fillRect(x, 17, 9, 1);
      g.fillRect(2, 14, 1, 20);
      g.fillRect(119, 14, 1, 20);
      g.fillStyle = 'rgba(220,240,255,0.18)';
      g.fillRect(0, 0, 122, 40);
    });
  };
  art.island = function () {
    return sprite('island', 110, 38, (g) => {
      R(g, 0, 0, 110, 5, '#e8e0cc');
      R(g, 0, 4, 110, 1, '#b9ae95');
      R(g, 3, 5, 104, 33, '#7f8c3f');
      for (let x = 5; x < 105; x += 26) {
        R(g, x, 8, 22, 26, '#93a14d');
        R(g, x + 1, 9, 20, 24, '#7f8c3f');
        R(g, x + 18, 20, 2, 4, C.brass);
      }
      R(g, 20, 0, 18, 2, '#ffffff');
      R(g, 70, 1, 9, 3, '#d8433a');
    });
  };
  art.diningTable = function () {
    return sprite('table', 192, 26, (g) => {
      R(g, 0, 0, 192, 6, '#5a3419');
      R(g, 0, 0, 192, 2, '#7a4a2a');
      R(g, 2, 6, 188, 7, '#f1e9d6');
      for (let x = 2; x < 190; x += 10) R(g, x, 12, 5, 2, '#f1e9d6');
      R(g, 2, 6, 188, 1, '#d2c7ad');
      R(g, 8, 13, 5, 13, '#4a2a14');
      R(g, 179, 13, 5, 13, '#4a2a14');
      R(g, 92, 13, 8, 13, '#4a2a14');
    });
  };
  art.chandelier = function () {
    return sprite('chandelier', 40, 22, (g) => {
      R(g, 19, 0, 2, 6, C.brassS);
      R(g, 6, 8, 28, 3, C.brass);
      R(g, 2, 10, 6, 3, C.brass);
      R(g, 32, 10, 6, 3, C.brass);
      R(g, 16, 6, 8, 8, C.brass);
      R(g, 18, 14, 4, 6, C.brassS);
      R(g, 3, 5, 3, 5, '#f4f1ea');
      R(g, 34, 5, 3, 5, '#f4f1ea');
      R(g, 12, 4, 3, 5, '#f4f1ea');
      R(g, 25, 4, 3, 5, '#f4f1ea');
      R(g, 4, 2, 1, 3, '#ffd23e');
      R(g, 35, 2, 1, 3, '#ffd23e');
      R(g, 13, 1, 1, 3, '#ffd23e');
      R(g, 26, 1, 1, 3, '#ffd23e');
      R(g, 8, 13, 2, 4, '#cfe6ff');
      R(g, 30, 13, 2, 4, '#cfe6ff');
      R(g, 19, 20, 2, 2, '#cfe6ff');
    });
  };
  art.frontDoor = function (open) {
    return sprite('fdoor-' + (open ? 1 : 0), open ? 8 : 26, 112, (g) => {
      if (open) {
        R(g, 0, 0, 8, 112, C.woodS);
        R(g, 1, 2, 6, 108, C.wood);
        return;
      }
      R(g, 0, 0, 26, 112, C.wood);
      R(g, 0, 0, 26, 2, C.woodL);
      R(g, 3, 6, 20, 30, C.woodS);
      R(g, 5, 8, 16, 26, '#e7c46a');
      R(g, 12, 8, 1, 26, C.woodS);
      R(g, 5, 20, 16, 1, C.woodS);
      R(g, 3, 44, 20, 26, C.woodS);
      R(g, 4, 45, 18, 24, C.wood);
      R(g, 3, 76, 20, 30, C.woodS);
      R(g, 4, 77, 18, 28, C.wood);
      R(g, 20, 60, 3, 4, C.brass);
      R(g, 20, 66, 3, 3, C.ink);
    });
  };

  // ================================================================ BACKGROUND PAINTERS
  const WALLS = {
    living: { base: '#b28480', alt: '#bb8f8b', motif: 'floral', dot: '#e8c9a8', wains: '#7a4a2a', wainsS: '#5a3419' },
    hall: { base: '#6d87a3', alt: '#7893ae', motif: 'stripe', dot: '#c9d6e3', wains: '#e2dac8', wainsS: '#c6bca6' },
    kitchen: { base: '#e6d38c', alt: '#efdf9f', motif: 'cherry', dot: '#c8434a' },
    dining: { base: '#6a2330', alt: '#7a2e3c', motif: 'damask', dot: '#8a3a49', wains: '#4a2a1b', wainsS: '#36200f' },
    sitting: { base: '#a7c49f', alt: '#bad4b2', motif: 'trellis', dot: '#e6efe0', wains: '#ece5d3', wainsS: '#cfc6b0' },
    foyer: { base: '#d6c7a8', alt: '#ddd0b4', motif: 'stripe', dot: '#c7b48f', wains: '#7a4a2a', wainsS: '#5a3419' },
  };
  // Walls run from y=top to the baseboard at y=floor-8.
  paint.wall = function (g, x0, x1, style, top, floor) {
    const s = WALLS[style];
    const bottom = floor - 8;
    const w = x1 - x0;
    R(g, x0, top, w, bottom - top, s.base);
    if (s.motif === 'stripe') {
      for (let x = Math.ceil(x0 / 16) * 16; x < x1; x += 16) R(g, x, top, Math.min(5, x1 - x), bottom - top, s.alt);
      for (let x = Math.ceil(x0 / 16) * 16 + 10; x < x1 - 1; x += 32) for (let y = top + 10; y < bottom; y += 22) R(g, x, y, 2, 2, s.dot);
    } else if (s.motif === 'cherry') {
      for (let y = top + 8, row = 0; y < bottom; y += 18, row++) {
        for (let x = Math.ceil(x0 / 20) * 20 + (row % 2) * 10; x < x1 - 4; x += 20) {
          R(g, x, y + 3, 2, 2, s.dot);
          R(g, x + 3, y + 3, 2, 2, s.dot);
          R(g, x + 2, y, 1, 3, '#6a8a3a');
        }
      }
    } else if (s.motif === 'damask') {
      for (let y = top + 6, row = 0; y < bottom; y += 16, row++) {
        for (let x = Math.ceil(x0 / 18) * 18 + (row % 2) * 9; x < x1 - 5; x += 18) {
          R(g, x + 2, y, 2, 6, s.alt);
          R(g, x, y + 2, 6, 2, s.alt);
          R(g, x + 2, y + 2, 2, 2, s.dot);
        }
      }
    } else if (s.motif === 'trellis') {
      for (let x = Math.ceil(x0 / 12) * 12; x < x1; x += 12) for (let y = top; y < bottom; y += 12) {
        R(g, x, y, 1, 1, s.dot);
        R(g, x + 6, y + 6, 1, 1, s.dot);
        R(g, x + 3, y + 3, 1, 1, s.alt);
        R(g, x + 9, y + 9, 1, 1, s.alt);
      }
    } else if (s.motif === 'floral') {
      for (let x = Math.ceil(x0 / 14) * 14; x < x1; x += 14) R(g, x, top, Math.min(3, x1 - x), bottom - top, s.alt);
      for (let y = top + 8, row = 0; y < bottom; y += 20, row++) for (let x = Math.ceil(x0 / 28) * 28 + (row % 2) * 14 + 6; x < x1 - 3; x += 28) {
        R(g, x, y, 3, 3, s.dot);
        R(g, x + 1, y + 3, 1, 3, '#6f8a5a');
      }
    }
    if (s.wains) {
      const rail = Math.round(bottom - (bottom - top) * 0.3);
      R(g, x0, rail, w, bottom - rail, s.wains);
      R(g, x0, rail - 3, w, 4, s.wains);
      R(g, x0, rail - 3, w, 1, 'rgba(255,255,255,0.35)');
      R(g, x0, rail + 1, w, 1, s.wainsS);
      for (let x = Math.ceil(x0 / 40) * 40 + 4; x < x1 - 32; x += 40) {
        R(g, x, rail + 6, 32, bottom - rail - 12, s.wainsS);
        R(g, x + 1, rail + 7, 30, bottom - rail - 14, s.wains);
      }
    }
    // baseboard
    R(g, x0, bottom, w, 8, '#e7dfcc');
    R(g, x0, bottom, w, 1, '#fff6e0');
    R(g, x0, bottom + 7, w, 1, '#a99f88');
  };
  paint.ceiling = function (g, x0, x1, top) {
    R(g, x0, 0, x1 - x0, top, '#2a2026');
    R(g, x0, top - 6, x1 - x0, 3, '#efe7d6');
    R(g, x0, top - 3, x1 - x0, 2, '#c9bfa9');
    R(g, x0, top - 1, x1 - x0, 1, '#8f8571');
  };
  paint.floorWood = function (g, x0, x1, y0, h) {
    R(g, x0, y0, x1 - x0, h, '#6b4127');
    for (let r = 0, i = 0; r < h; r += 5, i++) {
      R(g, x0, y0 + r, x1 - x0, 1, '#583320');
      const off = (i % 3) * 23;
      for (let x = Math.floor((x0 - off) / 70) * 70 + off; x < x1; x += 70) if (x >= x0) R(g, x, y0 + r, 1, 5, '#4a2a18');
      if (i % 2) for (let x = Math.ceil(x0 / 37) * 37; x < x1; x += 37) R(g, x, y0 + r + 2, 6, 1, '#76492d');
    }
    R(g, x0, y0, x1 - x0, 2, '#8a5a38');
  };
  paint.floorTile = function (g, x0, x1, y0, h) {
    for (let r = 0, i = 0; r < h; r += 7, i++) {
      for (let x = Math.floor(x0 / 14) * 14; x < x1; x += 14) {
        const c = ((x / 14 + i) & 1) === 0 ? '#eee2c4' : '#b9473a';
        const xa = Math.max(x, x0);
        const xb = Math.min(x + 14, x1);
        if (xb > xa) R(g, xa, y0 + r, xb - xa, 7, c);
      }
      R(g, x0, y0 + r, x1 - x0, 1, '#8f8571');
    }
    R(g, x0, y0, x1 - x0, 2, '#f7efd9');
  };
  paint.doorway = function (g, x, top, floor) {
    const y = top + 70;
    R(g, x - 22, y, 44, floor - y, '#1a1216');
    R(g, x - 18, y + 6, 36, floor - y - 6, '#231a1f');
    R(g, x - 26, y - 4, 52, 5, '#efe7d6');
    R(g, x - 26, y - 4, 4, floor - y + 4, '#efe7d6');
    R(g, x + 22, y - 4, 4, floor - y + 4, '#efe7d6');
    R(g, x - 22, y + 1, 44, 1, '#c9bfa9');
    R(g, x - 22, floor - 2, 44, 2, '#8a5a38');
  };
  paint.smokeDetector = function (g, x, top) {
    R(g, x - 5, top - 9, 10, 3, '#f4f1ea');
    R(g, x - 4, top - 6, 8, 1, '#cfc8b8');
    R(g, x + 2, top - 8, 1, 1, '#ff4040');
  };

  // Framed pictures. kind picks the subject.
  paint.frame = function (g, x, y, w, h, kind, frameCol) {
    box(g, x, y, w, h, frameCol || C.brass);
    const ix = x + 2;
    const iy = y + 2;
    const iw = w - 4;
    const ih = h - 4;
    R(g, ix, iy, iw, ih, C.ink);
    const bg = { family: '#9cc3d9', brandon: '#9fd3a0', fruit: '#e9dcc0', sailboat: '#7fb3d9', portrait: '#c9a26e', dog: '#e8d5a8', wedding: '#e9e4f2', stitch: '#f4f1ea', calendar: '#f4f1ea', mountain: '#a7c7e7' }[kind] || '#cfc8b8';
    R(g, ix + 1, iy + 1, iw - 2, ih - 2, bg);
    const fx = ix + 1;
    const fy = iy + 1;
    const fw = iw - 2;
    const fh = ih - 2;
    const person = (px, py, shirt, hair, head) => {
      R(g, px, py + 3, 3, 4, shirt);
      R(g, px, py, 3, 3, head || C.skin);
      R(g, px, py, 3, 1, hair);
    };
    switch (kind) {
      case 'family':
        person(fx + 2, fy + fh - 8, C.cardi, C.dHair);
        person(fx + 6, fy + fh - 8, '#c77c56', '#8a5a38');
        person(fx + 10, fy + fh - 8, C.aJacket, C.aHair);
        break;
      case 'brandon':
        person(fx + 3, fy + fh - 8, C.aJacket, C.aHair);
        person(fx + fw - 7, fy + fh - 8, '#3a5a8a', '#3a2a1a');
        R(g, fx + fw - 9, fy + fh - 10, 6, 6, '#ffe45c');
        R(g, fx + fw - 8, fy + fh - 8, 4, 1, '#c9a400');
        break;
      case 'fruit':
        R(g, fx + 1, fy + fh - 4, fw - 2, 4, '#7a4a2a');
        R(g, fx + fw / 2 - 8, fy + fh - 9, 16, 5, '#c9ced6');
        R(g, fx + fw / 2 - 7, fy + fh - 13, 5, 5, '#d8433a');
        R(g, fx + fw / 2 - 2, fy + fh - 14, 5, 5, '#e2b84a');
        R(g, fx + fw / 2 + 3, fy + fh - 13, 4, 5, '#6a9a3a');
        R(g, fx + fw / 2 - 1, fy + fh - 17, 3, 3, '#7a3a8a');
        break;
      case 'sailboat':
        R(g, fx, fy + fh - 4, fw, 4, '#3d6fc4');
        R(g, fx + fw / 2, fy + 3, 1, fh - 7, C.ink);
        R(g, fx + fw / 2 + 1, fy + 4, Math.max(2, fw / 3), fh - 10, '#f4f1ea');
        R(g, fx + fw / 2 - 4, fy + fh - 5, 9, 2, '#8a5a38');
        break;
      case 'portrait':
        R(g, fx + fw / 2 - 4, fy + fh - 8, 8, 8, C.cardi);
        R(g, fx + fw / 2 - 3, fy + 3, 6, 6, C.skin);
        R(g, fx + fw / 2 - 3, fy + 7, 6, 1, C.stache);
        break;
      case 'dog':
        R(g, fx + 3, fy + fh - 6, 8, 4, '#a0703a');
        R(g, fx + 9, fy + fh - 9, 4, 4, '#a0703a');
        R(g, fx + 4, fy + fh - 2, 1, 2, '#a0703a');
        R(g, fx + 9, fy + fh - 2, 1, 2, '#a0703a');
        break;
      case 'wedding':
        person(fx + 3, fy + fh - 8, '#2a2a30', C.dHairS);
        person(fx + 7, fy + fh - 8, '#ffffff', '#c9a26e');
        break;
      case 'mountain':
        R(g, fx + 2, fy + fh - 6, fw - 4, 6, '#5f8a5a');
        R(g, fx + fw / 2 - 3, fy + 4, 6, fh - 8, '#8a8a96');
        R(g, fx + fw / 2 - 1, fy + 4, 2, 3, '#ffffff');
        break;
      case 'stitch':
        for (let yy = fy + 2; yy < fy + fh - 2; yy += 3) for (let xx = fx + 2; xx < fx + fw - 2; xx += 2) if ((xx + yy) % 5) R(g, xx, yy, 1, 1, (yy / 3) % 2 ? '#c8434a' : '#3d6fc4');
        R(g, fx + fw / 2 - 2, fy + fh - 4, 4, 3, '#c8434a');
        break;
      case 'calendar':
        R(g, fx, fy, fw, 4, '#d8433a');
        for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) R(g, fx + 1 + c * 3, fy + 6 + r * 3, 2, 2, '#cfc8b8');
        R(g, fx + 12, fy + 8, 4, 4, '#d8433a');
        R(g, fx + 13, fy + 9, 2, 2, '#f4f1ea');
        break;
    }
  };
  paint.window = function (g, x, y, w, h, opts) {
    opts = opts || {};
    R(g, x - 3, y - 3, w + 6, h + 6, '#efe7d6');
    R(g, x, y, w, h, opts.sky || C.night);
    for (let i = 0; i < 9; i++) R(g, x + ((i * 37) % (w - 2)) + 1, y + ((i * 23) % (h - 2)) + 1, 1, 1, '#f4f1ea');
    if (opts.moon) disc(g, x + w - 12, y + 12, 5, '#f7efd2');
    R(g, x + w / 2 - 1, y, 2, h, '#efe7d6');
    R(g, x, y + h / 2 - 1, w, 2, '#efe7d6');
    R(g, x - 4, y + h + 3, w + 8, 3, '#efe7d6');
    if (opts.curtain) {
      R(g, x - 10, y - 8, 12, h + 18, opts.curtain);
      R(g, x + w - 2, y - 8, 12, h + 18, opts.curtain);
      for (let i = 0; i < 3; i++) {
        R(g, x - 8 + i * 4, y - 8, 1, h + 18, 'rgba(0,0,0,0.18)');
        R(g, x + w + i * 4, y - 8, 1, h + 18, 'rgba(0,0,0,0.18)');
      }
      R(g, x - 14, y - 11, w + 28, 4, C.brass);
    }
  };
  paint.innerDoor = function (g, x, top, floor, col) {
    const y = top + 72;
    R(g, x - 3, y - 3, 30, floor - y + 3, '#efe7d6');
    R(g, x, y, 24, floor - y, col || '#e2dac8');
    R(g, x + 3, y + 4, 18, 30, 'rgba(0,0,0,0.12)');
    R(g, x + 3, y + 42, 18, floor - y - 50, 'rgba(0,0,0,0.12)');
    R(g, x + 19, y + 54, 3, 3, C.brass);
  };
  paint.consoleTable = function (g, x, w, topY, floor) {
    R(g, x, topY, w, 4, C.woodL);
    R(g, x, topY + 3, w, 1, C.woodS);
    R(g, x + 2, topY + 4, w - 4, 6, C.wood);
    R(g, x + 3, topY + 4, 3, floor - topY - 4, C.woodS);
    R(g, x + w - 6, topY + 4, 3, floor - topY - 4, C.woodS);
    R(g, x + 6, floor - 6, w - 12, 2, C.woodS);
  };
  paint.lamp = function (g, x, baseY) {
    R(g, x - 2, baseY - 10, 4, 10, '#c9a26e');
    R(g, x - 4, baseY - 2, 8, 2, '#a8822a');
    R(g, x - 9, baseY - 22, 18, 12, '#f2e1b4');
    R(g, x - 8, baseY - 23, 16, 1, '#f2e1b4');
    R(g, x - 9, baseY - 11, 18, 1, '#d9c38e');
  };
  paint.grandfatherClock = function (g, x, floor, h) {
    const y = floor - h;
    R(g, x, y + 8, 26, h - 8, C.woodS);
    R(g, x + 2, y + 8, 22, h - 10, C.wood);
    R(g, x - 2, y, 30, 10, C.woodS);
    R(g, x + 4, y - 4, 18, 5, C.woodS);
    disc(g, x + 13, y + 22, 9, '#efe7d6');
    disc(g, x + 13, y + 22, 8, '#f8f2e2');
    R(g, x + 6, y + 36, 14, 50, '#2a1a10');
    R(g, x + 8, y + 38, 10, 46, '#3a2414');
    R(g, x + 1, floor - 6, 24, 6, C.woodD);
  };
  paint.clockHands = function (g, x, floor, h) {
    const y = floor - h;
    R(g, x + 12, y + 16, 2, 7, C.ink);
    R(g, x + 13, y + 21, 5, 2, C.ink);
  };
  paint.fridge = function (g, x, floor) {
    R(g, x, floor - 82, 38, 82, '#d6a43a');
    R(g, x, floor - 82, 38, 2, '#e8bf5c');
    R(g, x, floor - 52, 38, 2, '#a87e22');
    R(g, x + 32, floor - 74, 2, 14, '#c9ced6');
    R(g, x + 32, floor - 44, 2, 22, '#c9ced6');
    R(g, x + 6, floor - 76, 9, 7, '#f4f1ea');
    R(g, x + 7, floor - 73, 4, 3, '#7ab55c');
    R(g, x + 18, floor - 70, 5, 5, '#3fa9ff');
    R(g, x + 8, floor - 46, 8, 10, '#f4f1ea');
    R(g, x + 9, floor - 44, 6, 1, C.ink);
    R(g, x + 9, floor - 42, 4, 1, C.ink);
    R(g, x + 2, floor - 3, 34, 3, '#3a2a14');
  };
  paint.counter = function (g, x0, x1, floor, topY) {
    R(g, x0, topY - 46, x1 - x0, 46, 'rgba(255,255,255,0.18)');
    for (let x = x0; x < x1; x += 8) R(g, x, topY - 46, 1, 46, 'rgba(0,0,0,0.06)');
    for (let y = topY - 46; y < topY; y += 8) R(g, x0, y, x1 - x0, 1, 'rgba(0,0,0,0.06)');
    R(g, x0, topY, x1 - x0, 4, '#e8e0cc');
    R(g, x0, topY + 3, x1 - x0, 1, '#b9ae95');
    R(g, x0 + 2, topY + 4, x1 - x0 - 4, floor - topY - 4, '#7f8c3f');
    for (let x = x0 + 4; x < x1 - 22; x += 26) {
      R(g, x, topY + 7, 22, floor - topY - 12, '#93a14d');
      R(g, x + 1, topY + 8, 20, floor - topY - 14, '#7f8c3f');
      R(g, x + 17, topY + 12, 2, 4, C.brass);
    }
    R(g, x0, topY - 88, x1 - x0, 30, '#7f8c3f');
    R(g, x0, topY - 60, x1 - x0, 2, '#5f6a2f');
    for (let x = x0 + 4; x < x1 - 22; x += 26) R(g, x, topY - 85, 22, 22, '#93a14d');
  };
  paint.stove = function (g, x, floor, topY) {
    R(g, x, topY, 30, floor - topY, '#f4f1ea');
    R(g, x, topY, 30, 3, '#2a2c33');
    R(g, x + 4, topY + 8, 22, floor - topY - 14, '#2a2c33');
    R(g, x + 6, topY + 10, 18, 10, '#3c3f48');
    R(g, x + 4, topY - 6, 22, 6, '#2a2c33');
    R(g, x + 6, topY - 4, 2, 2, '#ff6a3a');
    R(g, x - 2, topY - 70, 34, 10, '#c9ced6');
    R(g, x + 4, topY - 60, 22, 4, '#9aa0a6');
  };
  paint.pantry = function (g, x, top, floor) {
    paint.innerDoor(g, x, top, floor, '#f4f1ea');
  };
  paint.chinaCabinet = function (g, x, floor, h) {
    const y = floor - h;
    R(g, x, y, 42, h, C.woodS);
    R(g, x + 2, y + 4, 38, h - 34, '#3a2414');
    for (let s = 0; s < 3; s++) {
      const sy = y + 6 + s * 14;
      R(g, x + 2, sy + 11, 38, 2, C.wood);
      for (let p = 0; p < 4; p++) {
        disc(g, x + 7 + p * 9, sy + 5, 4, '#f4f1ea');
        disc(g, x + 7 + p * 9, sy + 5, 2, '#3d6fc4');
      }
    }
    R(g, x + 2, floor - 28, 38, 24, C.wood);
    R(g, x + 20, floor - 28, 1, 24, C.woodS);
    R(g, x + 16, floor - 18, 2, 3, C.brass);
    R(g, x + 23, floor - 18, 2, 3, C.brass);
    R(g, x - 2, y - 3, 46, 4, C.woodL);
  };
  paint.diningChair = function (g, x, floor) {
    R(g, x, floor - 46, 3, 46, '#4a2a14');
    R(g, x + 13, floor - 46, 3, 46, '#4a2a14');
    R(g, x, floor - 46, 16, 4, '#5a3419');
    R(g, x, floor - 34, 16, 2, '#5a3419');
    R(g, x - 1, floor - 24, 18, 4, '#7d2e3b');
  };
  paint.piano = function (g, x, floor, topY) {
    R(g, x, topY, 72, floor - topY, '#2a1a12');
    R(g, x, topY, 72, 3, '#4a3020');
    R(g, x + 4, topY + 8, 64, 12, '#3a2418');
    R(g, x + 2, topY + 22, 68, 6, '#f4f1ea');
    for (let k = 0; k < 68; k += 4) R(g, x + 2 + k, topY + 22, 1, 6, '#cfc8b8');
    for (let k = 2; k < 66; k += 8) R(g, x + 3 + k, topY + 22, 2, 3, C.ink);
    R(g, x + 4, floor - 4, 4, 4, '#1a100a');
    R(g, x + 64, floor - 4, 4, 4, '#1a100a');
    R(g, x + 30, topY - 10, 12, 10, '#f4f1ea');
    R(g, x + 31, topY - 9, 10, 1, C.ink);
    R(g, x + 31, topY - 6, 8, 1, C.ink);
  };
  paint.floorLamp = function (g, x, floor) {
    R(g, x - 1, floor - 80, 2, 78, C.brassS);
    R(g, x - 6, floor - 3, 12, 3, C.brassS);
    R(g, x - 10, floor - 98, 20, 18, '#f2e1b4');
    R(g, x - 9, floor - 99, 18, 1, '#f2e1b4');
  };
  paint.fern = function (g, x, floor) {
    R(g, x - 8, floor - 16, 16, 16, '#b8643a');
    R(g, x - 9, floor - 17, 18, 3, '#cf7a4a');
    const leaves = [[-14, -30, 12, 3], [-12, -38, 10, 3], [-4, -44, 4, 14], [2, -40, 12, 3], [4, -32, 12, 3], [-10, -24, 8, 3], [3, -24, 9, 3]];
    leaves.forEach(([dx, dy, w, h]) => R(g, x + dx, floor + dy, w, h, '#4f8a3a'));
    R(g, x - 1, floor - 30, 2, 14, '#3a6a2a');
  };
  paint.stairs = function (g, x0, floor, steps, rise, run) {
    for (let i = 0; i < steps; i++) {
      const x = x0 + i * run;
      const y = floor - (i + 1) * rise;
      R(g, x, y, (steps - i) * run + 40, rise, i % 2 ? '#8a5a38' : '#7a4a2a');
      R(g, x, y, run, 2, '#a8784f');
      R(g, x, y + rise - 1, (steps - i) * run + 40, 1, '#5a3419');
    }
    const top = floor - steps * rise;
    for (let i = 0; i <= steps; i++) {
      const x = x0 + i * run + 6;
      const y = floor - i * rise;
      R(g, x, y - 34, 2, 34 - 0, '#efe7d6');
    }
    for (let i = 0; i < steps * run; i++) R(g, x0 + i + 4, floor - 36 - Math.floor((i / run) * rise), 4, 3, C.woodS);
    R(g, x0 + steps * run, top - 36, 70, 3, C.woodS);
    for (let x = x0 + steps * run + 8; x < x0 + steps * run + 70; x += 10) R(g, x, top - 33, 2, 33, '#efe7d6');
    R(g, x0 - 2, floor - 44, 6, 44, C.woodS);
    R(g, x0 - 4, floor - 48, 10, 5, C.woodL);
  };
  paint.coatRack = function (g, x, floor) {
    R(g, x - 1, floor - 90, 3, 90, C.woodS);
    R(g, x - 8, floor - 3, 17, 3, C.woodS);
    R(g, x - 7, floor - 88, 15, 2, C.woodS);
    R(g, x - 12, floor - 86, 10, 32, '#3a5a8a');
    R(g, x + 2, floor - 86, 9, 26, '#c77c56');
    R(g, x - 3, floor - 96, 8, 6, '#d8433a');
  };
  paint.mirror = function (g, x, y) {
    R(g, x - 1, y - 1, 26, 34, C.brass);
    R(g, x + 1, y + 1, 22, 30, '#b9d3e3');
    R(g, x + 4, y + 4, 3, 16, '#e7f3fa');
    R(g, x + 9, y + 3, 2, 8, '#e7f3fa');
  };
  paint.umbrellaStand = function (g, x, floor) {
    R(g, x, floor - 18, 12, 18, '#3a5a8a');
    R(g, x + 2, floor - 30, 2, 14, C.ink);
    R(g, x + 7, floor - 28, 2, 12, '#d8433a');
  };
  paint.photosWall = function (g, x0, x1, top) {
    const kinds = ['family', 'dog', 'portrait', 'wedding', 'mountain', 'family', 'sailboat', 'dog', 'family'];
    let i = 0;
    for (let x = x0; x < x1 - 14; x += 22 + ((i * 7) % 9)) {
      const w = 14 + ((i * 5) % 8);
      const h = 12 + ((i * 3) % 9);
      const y = top + 28 + ((i * 13) % 34);
      paint.frame(g, x, y, w, h, kinds[i % kinds.length], i % 3 ? C.brass : C.wood);
      i++;
    }
  };
})();

/* Eddie's Couch 2 — Level 1: Escape the House. Layout, Zach's physics, the beast, and the rules of the house. */
(function () {
  'use strict';
  const EC = window.EC;
  const art = EC.art;
  const paint = EC.paint;
  const C = EC.C;
  const R = art.R;
  const sfx = EC.audio.sfx;
  const ui = EC.ui;

  const FLOOR = 230;
  const TOP = 34;
  const LEVEL_W = 4620;
  const G = 1100;
  const JUMP_V = 372;
  const WALK = 96;
  const RUN = 208;
  const MAX_FALL = 560;

  const ROOMS = [
    { id: 'hall', x0: 0, x1: 1000, wall: 'hall', floor: 'wood', beast: 140 },
    { id: 'kitchen', x0: 1000, x1: 2000, wall: 'kitchen', floor: 'tile', beast: 150 },
    { id: 'dining', x0: 2000, x1: 2900, wall: 'dining', floor: 'wood', beast: 157 },
    { id: 'sitting', x0: 2900, x1: 3800, wall: 'sitting', floor: 'wood', beast: 162 },
    { id: 'foyer', x0: 3800, x1: LEVEL_W, wall: 'foyer', floor: 'wood', beast: 150, noSprint: true },
  ];
  const DOORWAYS = [1000, 2000, 2900, 3800];
  const CARPETS = [
    { x0: 520, x1: 760, kind: 'runner' },
    { x0: 2160, x1: 2700, kind: 'persian' },
    { x0: 3330, x1: 3620, kind: 'shag' },
    { x0: 3990, x1: 4300, kind: 'runner2' },
  ];
  const SOLIDS = [
    { id: 'basket', x: 330, w: 22, h: 15, kick: true, spr: 'basket' },
    { id: 'island', x: 1380, w: 110, h: 38, spr: 'island' },
    { id: 'bucket', x: 1640, w: 16, h: 16, kick: true, spr: 'bucket' },
    { id: 'table', x: 2300, w: 192, h: 6, y: FLOOR - 26, spr: 'table' },
    { id: 'couch', x: 3040, w: 120, h: 24, slippery: true, spr: 'couch' },
    { id: 'coffee', x: 3236, w: 56, h: 14, kick: true, spr: 'coffee' },
    { id: 'ottoman', x: 3690, w: 24, h: 14, kick: true, spr: 'ottoman' },
    { id: 'door', x: 4568, w: 22, h: 112, door: true },
    { id: 'endwall', x: 4596, w: 60, h: 400, y: -100 },
  ];
  const PLATFORMS = [
    { x: 418, w: 48, y: FLOOR - 24 },
    { x: 1062, w: 176, y: FLOOR - 34 },
    { x: 1240, w: 38, y: FLOOR - 82 },
    { x: 2515, w: 20, y: FLOOR - 24 },
    { x: 2556, w: 42, y: FLOOR - 78 },
    { x: 3390, w: 72, y: FLOOR - 44 },
    { x: 4108, w: 50, y: FLOOR - 28 },
    { x: 4008, w: 60, y: FLOOR - 96 },
  ];
  for (let i = 0; i < 8; i++) PLATFORMS.push({ x: 3880 + i * 16, w: 16, y: FLOOR - 12 * (i + 1), step: true });
  const KEY = { x: 4124, y: 194 };
  const GIFT = { x: 4147, y: 195 };
  const CHANDELIER = { x: 2376, y: 162, w: 40, h: 22 };
  const ROOMBA = { x0: 800, x1: 962 };
  const DOOR_X = 4568;
  const MOM_X = 1338;

  // Where things happen. Alex shouts a warning (a picture, never words) from wherever she's hiding.
  const TRIGGERS = [
    { x: 250, alex: 'go' },
    { x: 790, alex: 'up' },
    { x: 1290, throwType: 'casserole', alex: 'up' },
    { x: 1700, throwType: 'remote', alex: 'down' },
    { x: 2070, alex: 'down' },
    { x: 2580, throwType: 'gravy', alex: 'up' },
    { x: 3460, throwType: 'plate', alex: 'up' },
    { x: 3640, roar: true },
  ];
  const APOLOGIES = ['Sorry!', 'So sorry!', 'My bad!', 'Sorry, sir!'];
  const MISC_THROWS = ['tvguide', 'trophy', 'coaster'];

  // Light sources, for the night-time lighting pass.
  const LIGHTS = [
    { x: 14, y: 172, r: 90, warm: true, blown: true },
    { x: 430, y: 196, r: 84, warm: true },
    { x: 892, y: 104, r: 64 },
    { x: 1142, y: 114, r: 60 },
    { x: 1305, y: 150, r: 54, warm: true },
    { x: 1870, y: 168, r: 74, warm: true },
    { x: 2224, y: 105, r: 64 },
    { x: 2396, y: 180, r: 140, warm: true },
    { x: 2746, y: 168, r: 64, warm: true },
    { x: 3016, y: 138, r: 100, warm: true },
    { x: 3426, y: 176, r: 56, warm: true },
    { x: 3662, y: 103, r: 64 },
    { x: 3940, y: 92, r: 80, warm: true },
    { x: 4134, y: 140, r: 80, warm: true },
    { x: 4531, y: 140, r: 84, warm: true },
  ];
  // Foreground silhouettes, nearer the camera than the action.
  const FG = [];
  for (let i = 0, x = 120; x < 6600; i++, x += 210 + ((i * 97) % 140)) FG.push({ x, kind: ['chair', 'plant', 'lamp', 'stool', 'plant', 'chair'][i % 6] });
  const FG_PARALLAX = 1.35;

  // ================================================================ background
  let bg = null;
  function carpet(g, c) {
    const y = FLOOR - 1;
    const w = c.x1 - c.x0;
    const pal = {
      runner: ['#8a2a2a', '#d9b45a', '#2c3e66'],
      persian: ['#2c3e66', '#9a2c2c', '#d9b45a'],
      shag: ['#c9672e', '#e08a44', '#a8521f'],
      runner2: ['#3f6a46', '#d9c38e', '#2c4a32'],
    }[c.kind];
    R(g, c.x0, y, w, 20, pal[0]);
    R(g, c.x0, y, w, 2, pal[1]);
    R(g, c.x0, y + 18, w, 2, pal[1]);
    if (c.kind === 'shag') {
      for (let x = c.x0; x < c.x1; x += 2) R(g, x, y + 3 + ((x * 7) % 5), 1, 3, x % 4 ? pal[1] : pal[2]);
    } else {
      for (let x = c.x0 + 6; x < c.x1 - 8; x += 16) {
        R(g, x + 3, y + 5, 4, 2, pal[2]);
        R(g, x + 1, y + 7, 8, 4, pal[1]);
        R(g, x + 3, y + 11, 4, 2, pal[2]);
        R(g, x + 4, y + 8, 2, 2, pal[0]);
      }
    }
    for (let x = c.x0; x < c.x1; x += 3) {
      R(g, x, y + 20, 1, 2, '#efe6d2');
    }
    for (let x = c.x0 - 3; x <= c.x0; x++) for (let yy = y + 2; yy < y + 18; yy += 3) R(g, x, yy, 2, 1, '#efe6d2');
    for (let x = c.x1; x < c.x1 + 3; x++) for (let yy = y + 2; yy < y + 18; yy += 3) R(g, x, yy, 2, 1, '#efe6d2');
  }
  function buildBackground() {
    const c = art.canvasOf(LEVEL_W, EC.H);
    const g = c.getContext('2d');
    ROOMS.forEach((r) => {
      paint.ceiling(g, r.x0, r.x1, TOP);
      paint.wall(g, r.x0, r.x1, r.wall, TOP, FLOOR);
      if (r.floor === 'tile') paint.floorTile(g, r.x0, r.x1, FLOOR, EC.H - FLOOR);
      else paint.floorWood(g, r.x0, r.x1, FLOOR, EC.H - FLOOR);
    });
    // hallway: the end wall Zach has his back to, and forty-one photos
    R(g, 0, TOP, 34, FLOOR - TOP, '#56708b');
    R(g, 30, TOP, 4, FLOOR - TOP, '#4a6178');
    paint.frame(g, 8, 110, 16, 20, 'portrait');
    paint.photosWall(g, 64, 320, TOP);
    paint.frame(g, 206, 82, 22, 20, 'brandon');
    paint.consoleTable(g, 418, 48, FLOOR - 24, FLOOR);
    paint.lamp(g, 430, FLOOR - 24);
    R(g, 448, FLOOR - 29, 12, 5, '#3d6fc4');
    paint.innerDoor(g, 590, TOP, FLOOR, '#e2dac8');
    paint.photosWall(g, 660, 840, TOP);
    paint.window(g, 870, 76, 44, 56, { curtain: '#3f5a7a', moon: true });
    paint.smokeDetector(g, 300, TOP);
    paint.smokeDetector(g, 760, TOP);
    // kitchen
    paint.counter(g, 1062, 1238, FLOOR, FLOOR - 34);
    paint.window(g, 1120, 96, 44, 36, { sky: C.night });
    R(g, 1130, FLOOR - 36, 26, 3, '#9aa0a6');
    paint.fridge(g, 1240, FLOOR);
    paint.stove(g, 1290, FLOOR, FLOOR - 34);
    paint.frame(g, 1336, 104, 24, 22, 'calendar', '#f4f1ea');
    paint.pantry(g, 1550, TOP, FLOOR);
    R(g, 1700, 70, 18, 18, C.ink);
    art.disc(g, 1709, 79, 8, '#f4f1ea');
    R(g, 1708, 73, 2, 7, C.ink);
    R(g, 1709, 78, 5, 2, C.ink);
    R(g, 1704, 64, 10, 6, '#d8433a');
    paint.counter(g, 1760, 1960, FLOOR, FLOOR - 34);
    R(g, 1790, FLOOR - 46, 20, 12, '#c9ced6');
    R(g, 1794, FLOOR - 49, 4, 3, C.ink);
    R(g, 1801, FLOOR - 49, 4, 3, C.ink);
    // a pie cooling on the counter
    R(g, 1878, FLOOR - 36, 22, 2, '#f4f1ea');
    R(g, 1880, FLOOR - 41, 18, 5, '#c98a4a');
    R(g, 1881, FLOOR - 43, 16, 2, '#e0a860');
    R(g, 1884, FLOOR - 42, 1, 5, '#b8642a');
    R(g, 1889, FLOOR - 42, 1, 5, '#b8642a');
    R(g, 1894, FLOOR - 42, 1, 5, '#b8642a');
    paint.smokeDetector(g, 1500, TOP);
    // dining room
    paint.diningChair(g, 2060, FLOOR);
    paint.diningChair(g, 2090, FLOOR);
    paint.window(g, 2200, 70, 48, 70, { curtain: '#c9a24a', moon: true });
    paint.frame(g, 2368, 76, 48, 34, 'fruit');
    paint.diningChair(g, 2517, FLOOR);
    paint.chinaCabinet(g, 2556, FLOOR, 78);
    R(g, 2700, FLOOR - 40, 96, 6, C.woodL);
    R(g, 2702, FLOOR - 34, 92, 30, C.wood);
    R(g, 2704, FLOOR - 4, 6, 4, C.woodD);
    R(g, 2786, FLOOR - 4, 6, 4, C.woodD);
    R(g, 2720, FLOOR - 56, 3, 16, '#f4f1ea');
    R(g, 2770, FLOOR - 56, 3, 16, '#f4f1ea');
    R(g, 2720, FLOOR - 59, 3, 3, '#ffd23e');
    R(g, 2770, FLOOR - 59, 3, 3, '#ffd23e');
    paint.frame(g, 2734, 80, 28, 34, 'portrait');
    paint.smokeDetector(g, 2450, TOP);
    // formal sitting room
    paint.floorLamp(g, 3016, FLOOR);
    paint.frame(g, 3068, 90, 60, 26, 'stitch', C.wood);
    paint.frame(g, 3232, 84, 40, 30, 'sailboat');
    paint.piano(g, 3390, FLOOR, FLOOR - 44);
    paint.fern(g, 3560, FLOOR);
    paint.window(g, 3640, 70, 44, 66, { curtain: '#6e7f4a' });
    paint.smokeDetector(g, 3200, TOP);
    paint.smokeDetector(g, 3640, TOP);
    // foyer
    paint.stairs(g, 3880, FLOOR, 8, 12, 16);
    paint.frame(g, 3920, 60, 20, 24, 'family');
    paint.mirror(g, 4120, 116);
    paint.consoleTable(g, 4108, 50, FLOOR - 28, FLOOR);
    R(g, 4130, FLOOR - 32, 10, 4, '#3d6fc4');
    paint.frame(g, 4250, 96, 46, 22, 'stitch', '#f4f1ea');
    paint.coatRack(g, 4220, FLOOR);
    paint.innerDoor(g, 4390, TOP, FLOOR, '#f4f1ea');
    paint.umbrellaStand(g, 4478, FLOOR);
    paint.window(g, 4520, 110, 22, 60, { sky: '#3a3220' });
    art.glow(g, 4531, 140, 22, 'rgba(255,214,140,0.4)');
    R(g, 4562, 112, 34, 4, '#efe7d6');
    R(g, 4562, 112, 4, FLOOR - 112, '#efe7d6');
    R(g, 4592, 112, 4, FLOOR - 112, '#efe7d6');
    paint.smokeDetector(g, 4300, TOP);
    // end wall
    R(g, 4596, TOP, 24, FLOOR - TOP, '#b9a98a');
    DOORWAYS.forEach((x) => paint.doorway(g, x, TOP, FLOOR));
    CARPETS.forEach((cp) => carpet(g, cp));
    bg = c;
  }

  // ================================================================ small pixel pictures
  // Alex's warnings. Drawn at 2x in a 12x10 grid so they read at a glance.
  const ICONS = {
    up: (P) => {
      P(5, 1, 2, 1);
      P(4, 2, 4, 1);
      P(3, 3, 6, 1);
      P(5, 4, 2, 5);
    },
    down: (P) => {
      P(5, 1, 2, 5);
      P(3, 6, 6, 1);
      P(4, 7, 4, 1);
      P(5, 8, 2, 1);
    },
    go: (P) => {
      P(1, 4, 6, 2);
      P(6, 2, 1, 6);
      P(7, 3, 1, 4);
      P(8, 4, 1, 2);
      P(10, 1, 1, 5, '#d8433a');
      P(10, 7, 1, 1, '#d8433a');
    },
    key: (P) => {
      P(1, 4, 1, 2);
      P(2, 3, 1, 4);
      P(3, 2, 1, 6);
      P(3, 4, 4, 2);
      P(7, 3, 3, 4, C.brass);
      P(8, 4, 1, 2, '#ffffff');
      P(10, 4, 1, 1, C.brass);
    },
  };

  // ================================================================ the level
  let lightCanvas = null;
  class Level {
    constructor(opts) {
      opts = opts || {};
      if (!bg) buildBackground();
      this.parts = new EC.Particles();
      this.stats = { time: 0, hits: 0, deaths: 0, apologies: 0 };
      this.checkpoint = 0;
      this.t = 0;
      this.loadCheckpoint(opts.checkpoint || 0);
    }

    loadCheckpoint(idx) {
      this.checkpoint = idx;
      const room = ROOMS[idx];
      const startX = idx === 0 ? 150 : room.x0 + 50;
      this.z = { x: startX, y: FLOOR, vx: 0, vy: 0, face: 1, onGround: true, ground: null, duck: false, slide: false, stun: 0, inv: 0, coyote: 0, jumpBuf: 0, h: 24, dropT: 0, dist: 0, locked: false, sq: 0, sqType: '', dustT: 0 };
      this.b = { x: idx === 0 ? 30 : startX - 300, face: 1, state: idx === 0 ? 'hidden' : 'emerge', t: idx === 0 ? 0 : 0.9, slippers: true, carpet: -1, dist: 0, throwCd: 0, pending: null, holding: null };
      CARPETS.forEach((c, i) => {
        if (this.b.x + 18 >= c.x0 && this.b.x - 16 < c.x1) {
          this.b.slippers = false;
          this.b.carpet = i;
        }
      });
      this.solids = SOLIDS.map((s) => Object.assign({ y: FLOOR - s.h, active: true }, s));
      this.roomba = { x: 880, dir: 1, active: true };
      this.projectiles = [];
      this.parts.clear();
      this.smashed = {};
      DOORWAYS.forEach((x) => {
        if (x <= ROOMS[idx].x0) this.smashed[x] = true;
      });
      this.wallBlown = idx > 0;
      this.triggersDone = TRIGGERS.map((t) => t.x < startX);
      this.room = idx;
      this.alex = null;
      this.hasKey = false;
      this.hasGift = false;
      this.wedged = false;
      this.unlocked = false;
      this.doorOpen = false;
      this.slipperShown = idx > 0;
      this.lockedSeen = false;
      this.lockCd = 0;
      this.lockPop = 0;
      this.smoke = 0;
      this.unlockT = 0;
      this.escaped = false;
      this.caught = false;
      this.caughtT = 0;
      this.fatal = null;
      this.cam = EC.clamp(startX - 190, 0, LEVEL_W - EC.W);
      this.keyGot = false;
      this.giftGot = false;
      // Mom, at the stove, making casserole
      this.mom = { pose: 'stir', face: -1, t: 0, until: 0, waved: idx > 1, scolded: idx > 1 };
      ui.bubble.hide();
    }

    // -------------------------------------------------------------- helpers
    zbox() {
      const z = this.z;
      return { x: z.x - 5, y: z.y - z.h, w: 10, h: z.h };
    }
    bbox() {
      const b = this.b;
      return { x: b.x - 14, y: FLOOR - 74, w: 38, h: 74 };
    }
    activeSolids() {
      return this.solids.filter((s) => s.active && !(s.door && this.unlocked));
    }
    standBlocked() {
      const z = this.z;
      const box = { x: z.x - 5, y: z.y - 24, w: 10, h: 24 };
      return this.activeSolids().some((s) => EC.overlap(box, s));
    }
    // Alex pops up in the foreground and shouts a picture.
    alexWarn(icon, dur) {
      this.alex = { icon, t: dur || 1.8, dur: dur || 1.8 };
      sfx.shout();
    }
    dust(x, y, n, dir) {
      for (let i = 0; i < n; i++) {
        this.parts.add({ x: x + EC.rand(-3, 3), y: y - 1, vx: EC.rand(-25, 25) - (dir || 0) * 30, vy: -EC.rand(8, 30), g: -15, life: EC.rand(0.35, 0.6), size: EC.pick([2, 2, 3]), color: EC.pick(['#cbbfa6', '#b9ab8f', '#a89a80']) });
      }
    }
    stars(x, y) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        this.parts.add({ x, y, vx: Math.cos(a) * 45, vy: Math.sin(a) * 30 - 10, g: 30, life: 0.55, size: 2, color: i % 2 ? '#ffd23e' : '#ffffff' });
      }
    }
    sparkle(x, y, colors) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const s = EC.rand(40, 90);
        this.parts.add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 40, life: EC.rand(0.4, 0.7), size: EC.pick([1, 2, 2]), color: EC.pick(colors) });
      }
    }

    // -------------------------------------------------------------- start of the chase
    blowWall() {
      this.wallBlown = true;
      const b = this.b;
      b.state = 'emerge';
      b.t = 1.1;
      b.x = 30;
      sfx.smash();
      sfx.roar(1.1);
      EC.fx.shake(6, 0.6);
      EC.fx.flash('#ffe0c0', 0.25);
      this.parts.burst(30, { x: 36, y: 150, g: 700, s0: 80, s1: 320, a0: -1.2, a1: 0.6, life: 1.6, sizes: [2, 3, 4], color: ['#56708b', '#4a6178', '#e2dac8', '#c6bca6', '#8a5a38'], floor: FLOOR + 6 });
      this.dust(40, FLOOR, 10, -1);
    }

    // -------------------------------------------------------------- update
    update(dt, mode) {
      const z = this.z;
      const b = this.b;
      this.t += dt;
      this.stats.time += mode === 'play' ? dt : 0;
      this.parts.update(dt);
      ui.bubble.update(dt);
      if (this.alex) {
        this.alex.t -= dt;
        if (this.alex.t <= 0) this.alex = null;
      }
      if (this.smoke > 0) this.smoke -= dt;
      this.lockCd = Math.max(0, this.lockCd - dt);
      this.lockPop = Math.max(0, this.lockPop - dt);
      z.sq = Math.max(0, z.sq - dt);

      if (mode === 'play' || mode === 'tutorial') this.updateZach(dt, mode);
      if (mode === 'play' || mode === 'caught') this.updateBeast(dt);
      this.updateRoomba(dt);
      this.updateProjectiles(dt);
      if (mode === 'play') {
        this.updateEscape(dt);
        this.checkRooms();
        this.checkTriggers();
        this.checkPickups();
        this.checkHazards();
        if (!this.caught && !this.escaped && b.state !== 'hidden' && EC.overlap(this.zbox(), this.bbox())) this.getCaught();
      }
      if (this.caught) this.caughtT += dt;
      if (this.fatal) this.fatal.update(dt);
      if (mode === 'play') this.updateMom(dt);
      // camera: a little look-ahead, and widen to keep him in frame when he's close
      let lead = z.face > 0 ? 190 : 290;
      if (z.face > 0 && b.state !== 'hidden' && z.x - b.x < 260) lead = EC.clamp(z.x - b.x + 40, 190, 270);
      let target = EC.clamp(z.x - lead, 0, LEVEL_W - EC.W);
      if (this.fatal) target = EC.clamp(this.fatal.cam.x - EC.W / 2, 0, LEVEL_W - EC.W);
      this.cam += (target - this.cam) * Math.min(1, dt * 5);
      this.cam = EC.clamp(this.cam, 0, LEVEL_W - EC.W);
    }

    updateZach(dt, mode) {
      const z = this.z;
      const inp = EC.input;
      if (this.unlocked) return;
      const frozen = mode === 'tutorial' || z.locked || this.caught || this.escaped;
      z.stun = Math.max(0, z.stun - dt);
      z.inv = Math.max(0, z.inv - dt);
      z.dropT = Math.max(0, z.dropT - dt);
      z.coyote = Math.max(0, z.coyote - dt);
      z.jumpBuf = Math.max(0, z.jumpBuf - dt);

      // [A]: apologize. It does nothing.
      if (inp.pressed.a && !this.caught && !this.escaped) this.apologize();
      if (frozen) {
        z.vx = 0;
        if (this.caught) return;
      }
      const control = !frozen && z.stun <= 0;
      let dir = 0;
      if (control) dir = (inp.held.right ? 1 : 0) - (inp.held.left ? 1 : 0);
      if (dir) z.face = dir;
      const running = inp.running();
      const onSlippery = z.onGround && z.ground && z.ground.slippery;
      let wantDuck = control && inp.held.down && z.onGround;
      if (z.duck && !wantDuck && this.standBlocked()) wantDuck = true;
      if (wantDuck && !z.duck && Math.abs(z.vx) > 150) {
        z.slide = true;
        sfx.slide();
      }
      if (!wantDuck) z.slide = false;
      z.duck = wantDuck;
      z.h = z.duck ? 13 : 24;

      const max = (running ? RUN : WALK) * (this.hasGift ? 0.9 : 1);
      if (z.slide) {
        z.vx -= Math.sign(z.vx) * Math.min(Math.abs(z.vx), 120 * dt);
        if (Math.abs(z.vx) < 75) z.slide = false;
      } else {
        const target = z.duck ? dir * 72 : dir * max;
        const accel = z.onGround ? (onSlippery ? 260 : dir ? 1500 : 1700) : 950;
        const d = target - z.vx;
        z.vx += Math.sign(d) * Math.min(Math.abs(d), accel * dt);
      }
      if (z.stun > 0 && z.onGround) z.vx *= Math.pow(0.02, dt);

      // jumping
      if (control && inp.pressed.jump) z.jumpBuf = 0.12;
      if (z.jumpBuf > 0 && (z.onGround || z.coyote > 0) && control) {
        z.jumpBuf = 0;
        z.coyote = 0;
        if (inp.held.down && z.ground && z.ground.oneWay) {
          z.dropT = 0.22;
          z.onGround = false;
        } else if (!(z.duck && this.standBlocked())) {
          z.vy = -JUMP_V;
          z.onGround = false;
          z.duck = z.slide = false;
          z.h = 24;
          z.sq = 0.12;
          z.sqType = 'jump';
          sfx.jump();
          this.dust(z.x, z.y, 3, z.face);
        }
      }
      if (!inp.held.jump && z.vy < -150) z.vy = -150;
      z.vy = Math.min(MAX_FALL, z.vy + G * dt);

      // move x
      const solids = this.activeSolids();
      z.x += z.vx * dt;
      let box = this.zbox();
      for (const s of solids) {
        if (!EC.overlap(box, s)) continue;
        if (z.x < s.x + s.w / 2) z.x = s.x - 5.01;
        else z.x = s.x + s.w + 5.01;
        z.vx = 0;
        box = this.zbox();
        if (s.door) this.touchDoor();
      }
      // the door, felt from just outside
      const door = this.solids.find((s) => s.door);
      if (door && !this.unlocked && z.x + 5 >= door.x - 1.5 && z.x < door.x && z.y > door.y) this.touchDoor();
      z.x = EC.clamp(z.x, 12, LEVEL_W - 30);

      // move y
      const prevBottom = z.y;
      const fallSpeed = z.vy;
      z.y += z.vy * dt;
      const was = z.onGround;
      z.onGround = false;
      z.ground = null;
      box = this.zbox();
      for (const s of solids) {
        if (!EC.overlap(box, s)) continue;
        if (z.vy >= 0 && prevBottom <= s.y + 1) {
          z.y = s.y;
          z.vy = 0;
          z.onGround = true;
          z.ground = s;
        } else if (z.vy < 0) {
          z.y = s.y + s.h + z.h;
          z.vy = 0;
        }
        box = this.zbox();
      }
      if (!z.onGround && z.vy >= 0 && z.dropT <= 0) {
        for (const p of PLATFORMS) {
          if (z.x + 5 > p.x && z.x - 5 < p.x + p.w && prevBottom <= p.y + 1 && z.y >= p.y) {
            z.y = p.y;
            z.vy = 0;
            z.onGround = true;
            z.ground = { oneWay: true, y: p.y, step: !!p.step };
            break;
          }
        }
      }
      if (z.y >= FLOOR) {
        z.y = FLOOR;
        z.vy = 0;
        z.onGround = true;
        z.ground = null;
      }
      // stairs: once you're on them, walk up without jumping
      if (z.onGround && z.vx > 0 && z.ground && z.ground.step) {
        for (const p of PLATFORMS) {
          if (!p.step) continue;
          if (z.x + 5 > p.x && z.x - 5 < p.x + p.w && p.y < z.y && p.y >= z.y - 13) {
            z.y = p.y;
            z.ground = { oneWay: true, y: p.y, step: true };
          }
        }
      }
      if (was && !z.onGround && z.vy >= 0) z.coyote = 0.09;
      if (!was && z.onGround) {
        sfx.land();
        if (fallSpeed > 200) {
          z.sq = 0.12;
          z.sqType = 'land';
          this.dust(z.x, z.y, 5, 0);
        }
        if (z.ground && z.ground.slippery) {
          z.vx = EC.clamp(z.vx + 80 * z.face, -300, 300);
          sfx.squeak();
        }
      }
      if (onSlippery && Math.abs(z.vx) > 40 && Math.random() < dt * 3) sfx.squeak();
      // a puff of dust from the heels when running, a trail when sliding
      if (z.onGround) {
        z.dist += Math.abs(z.vx) * dt;
        z.dustT -= dt;
        if (z.dustT <= 0 && (z.slide || Math.abs(z.vx) > 170)) {
          z.dustT = z.slide ? 0.05 : 0.14;
          this.dust(z.x - z.face * 4, z.y, 1, z.face);
        }
      }
    }

    // She waves at Zach. She points at her husband, and he stops.
    updateMom(dt) {
      const m = this.mom;
      const z = this.z;
      const b = this.b;
      m.t += dt;
      if (this.fatal) return;
      if (!m.waved && Math.abs(z.x - MOM_X) < 80) {
        m.waved = true;
        m.pose = 'wave';
        m.face = 1;
        m.until = m.t + 1.3;
        sfx.blip('mom');
        setTimeout(() => sfx.blip('mom'), 90);
      }
      if (!m.scolded && b.state === 'chase' && b.x + 30 >= MOM_X - 30 && b.x < MOM_X + 30) {
        m.scolded = true;
        m.pose = 'point';
        m.face = -1;
        m.until = m.t + 1.4;
        b.state = 'scolded';
        b.t = 1.0;
        sfx.tsk();
      }
      if (m.until && m.t > m.until) {
        m.until = 0;
        m.pose = 'stir';
        m.face = -1;
      }
    }

    apologize() {
      this.stats.apologies++;
      ui.bubble.say(EC.pick(APOLOGIES), 0.85);
      [0, 0.07, 0.14].forEach((d) => setTimeout(() => sfx.blip('zach'), d * 1000));
    }

    beastOnScreen() {
      const b = this.b;
      return b.x + 40 > this.cam && b.x - 40 < this.cam + EC.W;
    }

    touchDoor() {
      if (this.unlocked || this.escaped) return;
      if (this.hasKey) {
        this.unlocked = true;
        this.z.locked = true;
        this.unlockT = 0.75;
        this.z.vx = 0;
        sfx.unlock();
        return;
      }
      if (this.lockCd > 0) return;
      this.lockCd = 1.6;
      this.lockPop = 1.2;
      sfx.rattle();
      sfx.lock();
      EC.fx.shake(1.5, 0.15);
      if (!this.lockedSeen) {
        this.lockedSeen = true;
        this.alexWarn('key', 3.2);
      }
    }

    // -------------------------------------------------------------- the beast
    updateBeast(dt) {
      const b = this.b;
      const z = this.z;
      b.throwCd = Math.max(0, b.throwCd - dt);
      const room = ROOMS[this.room];
      const dist = z.x - b.x;
      switch (b.state) {
        case 'hidden':
        case 'grab':
          return;
        case 'emerge':
        case 'roar':
        case 'scolded':
          b.t -= dt;
          if (b.t <= 0) b.state = 'chase';
          break;
        case 'off':
          b.t -= dt;
          if (b.t <= 0) {
            b.slippers = false;
            b.state = 'chase';
          }
          break;
        case 'on':
          b.t -= dt;
          if (b.t <= 0) {
            b.slippers = true;
            b.state = 'chase';
          }
          break;
        case 'windup':
          b.t -= dt;
          if (b.t <= 0) {
            this.throwThing(b.holding);
            b.holding = null;
            b.state = 'release';
            b.t = 0.3;
          }
          break;
        case 'release':
          b.t -= dt;
          if (b.t <= 0) {
            b.state = 'chase';
            b.throwCd = 1.8;
          }
          break;
        case 'wedged':
          b.t -= dt;
          if (Math.random() < dt * 14) this.parts.add({ x: 3800 + EC.rand(-20, 20), y: EC.rand(110, 150), vx: EC.rand(-30, 30), vy: 0, g: 300, life: 1, size: 2, color: '#efe7d6', floor: FLOOR });
          if (Math.random() < dt * 4) sfx.stomp();
          if (b.t <= 0) {
            this.smashDoorway(3800);
            b.state = 'roar';
            b.t = 0.7;
            sfx.roar(1.0);
          }
          break;
        case 'chase': {
          // The rules of the house: no slippers on the carpet.
          const front = b.x + 18;
          const prevFront = b.prevFront == null ? front : b.prevFront;
          b.prevFront = front;
          if (b.slippers) {
            for (let i = 0; i < CARPETS.length; i++) {
              const c = CARPETS[i];
              if (prevFront < c.x0 && front >= c.x0) {
                b.x = c.x0 - 18;
                b.carpet = i;
                b.state = 'off';
                b.t = 1.1;
                sfx.pat();
                if (!this.slipperShown && this.beastOnScreen()) {
                  this.slipperShown = true;
                  this.alexWarn('go', 1.6);
                }
                return;
              }
            }
          } else if (b.carpet >= 0 && b.x - 16 >= CARPETS[b.carpet].x1) {
            b.state = 'on';
            b.t = 0.75;
            b.carpet = -1;
            return;
          }
          // the foyer doorframe nobody ever fixed
          if (!this.wedged && b.x >= 3768 && z.x > 3820) {
            this.wedged = true;
            b.x = 3770;
            b.state = 'wedged';
            b.t = 3.4;
            EC.fx.shake(3, 0.4);
            sfx.smash();
            this.alexWarn('go', 1.6);
            return;
          }
          // throws
          const elevated = z.y < FLOOR - 20;
          if (b.pending && dist < 340 && dist > 60 && b.throwCd <= 0) {
            b.holding = b.pending.type;
            if (b.pending.alex) this.alexWarn(b.pending.alex, 1.5);
            b.pending = null;
            b.state = 'windup';
            b.t = 0.6;
            return;
          }
          if (elevated && Math.abs(dist) < 150 && b.throwCd <= 0) {
            b.holding = EC.pick(MISC_THROWS);
            b.state = 'windup';
            b.t = 0.55;
            return;
          }
          // He stays just behind you: a sprint when he's far, a lumber when he's close.
          let speed = room.beast;
          if (!room.noSprint || b.x < room.x0) {
            if (dist > 250) speed = 315;
            else if (dist > 150) speed = 232;
          }
          if (!b.slippers) speed *= 0.92;
          const goal = z.x - 12;
          if (b.x < goal) {
            const mv = Math.min(goal - b.x, speed * dt);
            b.x += mv;
            b.dist += mv;
            b.face = 1;
          }
          if (z.x - b.x > 420) {
            // Off-screen catch-up. If that lands him on a carpet, he's already in his socks.
            b.x = z.x - 420;
            b.prevFront = b.x + 18;
            CARPETS.forEach((c, i) => {
              if (b.slippers && b.x + 18 >= c.x0 && b.x - 16 < c.x1) {
                b.slippers = false;
                b.carpet = i;
              }
            });
          }
          // doorways get smashed on the way through
          DOORWAYS.forEach((dx) => {
            if (!this.smashed[dx] && dx !== 3800 && b.x + 20 >= dx) this.smashDoorway(dx);
          });
          // kick things out of the way
          const bb = this.bbox();
          for (const s of this.solids) {
            if (s.active && s.kick && EC.overlap(bb, s)) this.kick(s);
          }
          // footsteps
          const step = Math.floor(b.dist / 22);
          if (step !== b.lastStep) {
            b.lastStep = step;
            if (this.beastOnScreen()) {
              sfx.stomp();
              EC.fx.shake(b.slippers ? 1 : 0.5, 0.08);
              this.dust(b.x + 8, FLOOR, 3, -1);
            }
          }
          break;
        }
      }
    }

    smashDoorway(x) {
      this.smashed[x] = true;
      sfx.smash();
      EC.fx.shake(5, 0.4);
      this.parts.burst(26, { x, y: 140, g: 700, s0: 60, s1: 260, a0: -2.6, a1: -0.3, life: 1.6, sizes: [2, 3, 4], color: ['#efe7d6', '#c9bfa9', '#8a5a38', '#5a3419'], floor: FLOOR + 4 });
      this.dust(x, FLOOR, 8, 0);
    }

    kick(s) {
      s.active = false;
      sfx.smash();
      EC.fx.shake(3, 0.2);
      const spr = art.prop(s.spr);
      this.parts.add({ spr, x: s.x + s.w / 2, y: s.y + s.h / 2, vx: EC.rand(200, 320), vy: -EC.rand(240, 320), g: 900, life: 1.4, vr: EC.rand(6, 12) });
      this.dust(s.x + s.w / 2, FLOOR, 6, -1);
    }

    throwThing(type) {
      const b = this.b;
      const z = this.z;
      const hand = art.beastHand.fwd;
      const x = b.x + hand[0];
      const y = FLOOR + hand[1];
      const p = { type, x, y, vx: 0, vy: 0, g: 0, rot: 0, vr: 0, w: 10, h: 8, dead: false, life: 4 };
      sfx.whoosh();
      if (type === 'remote') {
        p.y = FLOOR - 19;
        p.vx = 330;
        p.vr = 22;
        p.w = 10;
        p.h = 4;
      } else if (type === 'plate') {
        p.y = FLOOR - 7;
        p.x = b.x + 24;
        p.vx = 255;
        p.vr = 16;
        p.w = 11;
        p.h = 11;
      } else {
        const dist = Math.max(40, z.x - x);
        const T = EC.clamp(dist / 290, 0.55, 1.1);
        const tx = z.x + z.vx * T * 0.7;
        const ty = z.y - 12;
        p.g = 700;
        p.vx = (tx - x) / T;
        p.vy = (ty - y - 0.5 * p.g * T * T) / T;
        p.vr = 9;
        p.w = type === 'casserole' ? 14 : 10;
        p.h = 8;
      }
      this.projectiles.push(p);
    }

    updateProjectiles(dt) {
      const zb = this.zbox();
      this.projectiles = this.projectiles.filter((p) => {
        p.life -= dt;
        if (p.life <= 0) return false;
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (p.g && p.y > FLOOR - p.h / 2) {
          p.y = FLOOR - p.h / 2;
          if (!p.dead) {
            p.dead = true;
            p.life = Math.min(p.life, 1.2);
            sfx.land();
            this.dust(p.x, FLOOR, 4, 0);
          }
          p.vy *= -0.35;
          p.vx *= 0.45;
          p.vr *= 0.5;
        }
        if (!p.dead && !this.caught && !this.escaped) {
          const pb = { x: p.x - p.w / 2 + 1, y: p.y - p.h / 2 + 1, w: p.w - 2, h: p.h - 2 };
          if (EC.overlap(pb, zb) && this.z.inv <= 0) {
            this.hitZach();
            p.dead = true;
            p.vx = -p.vx * 0.3;
            p.vy = -160;
            p.g = p.g || 700;
            p.life = 1;
          }
        }
        return p.x < this.cam + EC.W + 80;
      });
    }

    hitZach() {
      const z = this.z;
      this.stats.hits++;
      z.stun = 0.35;
      z.inv = 1.3;
      z.vx = -60;
      z.vy = -130;
      z.onGround = false;
      z.duck = z.slide = false;
      z.h = 24;
      sfx.hit();
      EC.fx.shake(3, 0.2);
      this.stars(z.x, z.y - 28);
    }

    updateRoomba(dt) {
      const r = this.roomba;
      if (!r.active) return;
      r.x += r.dir * 42 * dt;
      if (r.x > ROOMBA.x1) r.dir = -1;
      if (r.x < ROOMBA.x0) r.dir = 1;
      const rb = { x: r.x - 9, y: FLOOR - 6, w: 18, h: 6 };
      if (this.b.state !== 'hidden' && EC.overlap(this.bbox(), rb)) {
        r.active = false;
        sfx.smash();
        this.parts.add({ spr: art.prop('roomba'), x: r.x, y: FLOOR - 3, vx: 280, vy: -300, g: 900, life: 1.4, vr: 14 });
      }
    }

    checkHazards() {
      const z = this.z;
      if (z.inv > 0) return;
      const zb = this.zbox();
      if (EC.overlap(zb, CHANDELIER)) {
        z.stun = 0.35;
        z.inv = 0.8;
        z.vy = Math.max(z.vy, 90);
        z.vx *= 0.3;
        this.stats.hits++;
        sfx.bonk();
        this.stars(z.x, z.y - z.h - 2);
        return;
      }
      const r = this.roomba;
      if (r.active && z.y > FLOOR - 4 && EC.overlap(zb, { x: r.x - 9, y: FLOOR - 6, w: 18, h: 6 })) {
        z.stun = 0.5;
        z.inv = 1.0;
        z.vx = 70 * z.face;
        z.vy = -170;
        z.onGround = false;
        this.stats.hits++;
        sfx.trip();
        this.stars(z.x, z.y - 26);
        this.dust(z.x, FLOOR, 4, z.face);
      }
    }

    checkRooms() {
      const z = this.z;
      let idx = this.room;
      for (let i = 0; i < ROOMS.length; i++) if (z.x >= ROOMS[i].x0 + 24 && z.x < ROOMS[i].x1 + 24) idx = i;
      if (idx > this.room) {
        this.room = idx;
        if (idx > this.checkpoint) this.checkpoint = idx;
      }
    }

    checkTriggers() {
      const z = this.z;
      TRIGGERS.forEach((t, i) => {
        if (this.triggersDone[i] || z.x < t.x) return;
        this.triggersDone[i] = true;
        if (t.throwType) {
          this.b.pending = { type: t.throwType, alex: t.alex };
          if (this.b.state === 'chase' && this.b.throwCd > 0) this.b.throwCd = 0;
        } else if (t.alex) this.alexWarn(t.alex);
        if (t.roar) {
          const b = this.b;
          if (b.state === 'chase') {
            b.state = 'roar';
            b.t = 1.2;
          }
          sfx.roar(1.4);
          EC.fx.shake(5, 1);
          this.smoke = 4.5;
          sfx.beeps(10, 0.34);
        }
      });
    }

    checkPickups() {
      const zb = this.zbox();
      if (!this.keyGot && EC.overlap(zb, { x: KEY.x - 9, y: KEY.y - 6, w: 18, h: 10 })) {
        this.keyGot = this.hasKey = true;
        sfx.key();
        this.sparkle(KEY.x, KEY.y, ['#ffd23e', '#ffffff', C.brass]);
        if (this.lockedSeen) this.alexWarn('go', 1.6);
      }
      if (!this.giftGot && EC.overlap(zb, { x: GIFT.x - 7, y: GIFT.y - 7, w: 14, h: 14 })) {
        this.giftGot = this.hasGift = true;
        sfx.gift();
        this.sparkle(GIFT.x, GIFT.y, ['#d8433a', '#ffd23e', '#ffffff']);
      }
    }

    getCaught() {
      const b = this.b;
      this.caught = true;
      this.caughtT = 0;
      this.stats.deaths++;
      b.state = 'grab';
      this.z.vx = this.z.vy = 0;
      this.alex = null;
      this.projectiles = [];
      sfx.hit();
      EC.fx.shake(6, 0.6);
      EC.fx.flash('#ff2b2b', 0.3);
      ui.bubble.hide();
      // and then he does something about it
      this.fatal = EC.fatalities.create(this);
    }

    // Unlocking, then out the door.
    updateEscape(dt) {
      if (!this.unlocked || this.escaped) return;
      const z = this.z;
      if (this.unlockT > 0) {
        this.unlockT -= dt;
        if (this.unlockT <= 0) {
          sfx.door();
          this.doorOpen = true;
          z.locked = false;
        }
        return;
      }
      z.face = 1;
      z.x += RUN * 1.1 * dt;
      z.dist += RUN * dt;
      if (z.x > DOOR_X + 30) this.escaped = true;
    }

    // -------------------------------------------------------------- drawing
    draw(g) {
      const z = this.z;
      const b = this.b;
      const S = EC.S;
      const cam = Math.round(this.cam * S) / S;
      const [ox, oy] = EC.fx.offset();
      const t = this.t;
      g.fillStyle = '#000';
      g.fillRect(0, 0, EC.W, EC.H);
      g.save();
      // caught: the camera does what the moment needs
      const F = this.fatal;
      if (F && F.cam.z !== 1) {
        // the tighter the shot, the more the subject moves to the middle of the frame
        const fx = F.cam.x - cam;
        const fy = F.cam.y;
        const k = EC.clamp((F.cam.z - 1) * 2, 0, 1);
        g.translate(EC.lerp(fx, EC.W / 2, k), EC.lerp(fy, EC.H / 2, k));
        g.scale(F.cam.z, F.cam.z);
        g.translate(-fx, -fy);
      }
      g.drawImage(bg, cam, 0, EC.W, EC.H, ox, oy, EC.W, EC.H);
      g.save();
      g.translate(-cam + ox, oy);
      this.drawWorld(g, cam, t);
      g.restore();
      this.drawLighting(g, cam, ox, oy);
      g.restore();

      if (!this.caught) this.drawForeground(g, cam);
      // smoke alarm
      if (this.smoke > 0 && Math.floor(this.smoke * 3) % 2 === 0) {
        g.globalAlpha = EC.reducedMotion ? 0.07 : 0.14;
        g.fillStyle = '#ff2b2b';
        g.fillRect(0, 0, EC.W, EC.H);
        g.globalAlpha = 1;
      }
      // he's close: the left edge goes red
      const dist = z.x - b.x;
      if (b.state !== 'hidden' && dist < 130 && !this.escaped && !this.caught) {
        const a = (1 - dist / 130) * 0.5;
        const grd = g.createLinearGradient(0, 0, 130, 0);
        grd.addColorStop(0, 'rgba(255,30,30,' + a + ')');
        grd.addColorStop(1, 'rgba(255,30,30,0)');
        g.fillStyle = grd;
        g.fillRect(0, 0, 130, EC.H);
      }
      this.drawOffscreenBeast(g, cam, t);
      this.drawAlex(g, t);
      if (F) {
        F.drawScreen(g);
        if (F.done) {
          F.dim = Math.min(0.45, (F.dim || 0) + 0.02);
          g.globalAlpha = F.dim;
          g.fillStyle = '#2a0003';
          g.fillRect(0, 0, EC.W, EC.H);
          g.globalAlpha = 1;
        }
      }
      EC.fx.drawFlash(g);
      ui.bubble.place(z.x - cam, z.y - z.h - 10);
      ui.rec(b.state !== 'hidden' && z.x - b.x < 700 && !this.escaped);
    }

    drawWorld(g, cam, t) {
      const z = this.z;
      const b = this.b;
      if (this.fatal) this.fatal.drawDecals(g);
      // the wall he came through, with the living room's light behind it
      if (this.wallBlown) {
        R(g, 2, 112, 44, FLOOR - 112, '#140d10');
        R(g, 0, 118, 30, FLOOR - 118, '#3a2418');
        art.glow(g, 14, 160, 40, 'rgba(255,190,120,0.35)');
        [[2, 108, 8, 6], [30, 104, 10, 10], [42, 120, 6, 14], [40, 150, 8, 10], [44, 176, 6, 12], [0, 104, 4, 8]].forEach(([x, y, w, h]) => R(g, x, y, w, h, '#56708b'));
        R(g, 6, FLOOR - 6, 34, 6, '#c6bca6');
      }
      // smashed doorframes
      Object.keys(this.smashed).forEach((k) => {
        const x = +k;
        if (x === 0) return;
        R(g, x - 30, 98, 60, FLOOR - 98, '#140d10');
        [[x - 34, 94, 10, 12], [x + 24, 92, 12, 14], [x - 36, 130, 8, 16], [x + 28, 140, 8, 14], [x - 20, 92, 14, 6], [x + 4, 90, 16, 8]].forEach(([xx, y, w, h]) => R(g, xx, y, w, h, '#efe7d6'));
        R(g, x - 26, FLOOR - 6, 52, 6, '#c9bfa9');
        R(g, x - 18, FLOOR - 9, 8, 3, '#8a5a38');
        R(g, x + 10, FLOOR - 8, 10, 2, '#efe7d6');
      });
      // Mom at the stove (unless she's busy cleaning up after him)
      if (!this.fatal && MOM_X > cam - 30 && MOM_X < cam + EC.W + 30) {
        const m = this.mom;
        const pose = m.pose === 'stir' ? (Math.floor(t * 3) % 2 ? 'stir' : 'idle') : m.pose;
        art.put(g, art.mom(pose, 0), MOM_X, FLOOR, { flip: m.face < 0 });
        if (m.pose === 'stir' && Math.floor(t * 2) % 2) R(g, 1300 + Math.round(Math.sin(t * 3) * 2), FLOOR - 48 - ((t * 20) % 10), 2, 2, 'rgba(255,255,255,0.5)');
      }
      // lane furniture
      for (const s of this.solids) {
        if (!s.active || !s.spr) continue;
        if (s.x + s.w < cam - 20 || s.x > cam + EC.W + 20) continue;
        const spr = s.spr === 'couch' ? art.couch() : s.spr === 'island' ? art.island() : s.spr === 'table' ? art.diningTable() : art.prop(s.spr);
        art.put(g, spr, s.x + s.w / 2, s.spr === 'table' ? FLOOR : s.y + s.h);
      }
      // the front door
      const door = this.solids.find((s) => s.door);
      if (this.doorOpen) {
        R(g, door.x, door.y, door.w + 4, door.h, '#120d1c');
        R(g, door.x, FLOOR - 20, door.w + 4, 20, '#1d2a1a');
        art.glow(g, door.x + 12, door.y + 20, 30, 'rgba(255,214,140,0.45)');
        art.put(g, art.frontDoor(true), door.x - 2, FLOOR);
      } else {
        const rattle = this.lockPop > 0.9 ? Math.round(EC.rand(-1, 1)) : 0;
        art.put(g, art.frontDoor(false), door.x + door.w / 2 + rattle, FLOOR);
      }
      art.put(g, art.chandelier(), CHANDELIER.x + CHANDELIER.w / 2, CHANDELIER.y + CHANDELIER.h);
      R(g, CHANDELIER.x + 19, TOP, 2, CHANDELIER.y - TOP, C.brassS);

      // pickups
      if (!this.keyGot) {
        art.put(g, art.prop('key'), KEY.x, KEY.y);
        if (this.lockedSeen) {
          // after the door says no, the key calls to you
          const p = 0.6 + Math.sin(t * 6) * 0.4;
          art.glow(g, KEY.x + 2, KEY.y - 2, 16, 'rgba(255,230,140,0.95)', p);
          R(g, KEY.x - 1, KEY.y - 14 - Math.round(Math.sin(t * 5) * 2), 3, 5, C.brass);
          R(g, KEY.x - 2, KEY.y - 10 - Math.round(Math.sin(t * 5) * 2), 5, 1, C.brass);
          R(g, KEY.x - 1, KEY.y - 9 - Math.round(Math.sin(t * 5) * 2), 3, 1, C.brass);
        } else if (Math.floor(t * 1.5) % 2 === 0) art.glow(g, KEY.x + 2, KEY.y - 2, 5, 'rgba(255,230,140,0.9)', 0.8);
      }
      if (!this.giftGot) art.put(g, art.prop('gift'), GIFT.x, GIFT.y + 7);
      // a padlock pops over the door when it won't open
      if (this.lockPop > 0) {
        const lx = door.x + door.w / 2;
        const ly = door.y + 30 - Math.min(1, (1.2 - this.lockPop) * 6) * 8;
        R(g, lx - 5, ly - 4, 10, 9, C.ink);
        R(g, lx - 4, ly - 3, 8, 7, C.brass);
        R(g, lx - 4, ly - 10, 8, 7, C.ink);
        R(g, lx - 3, ly - 9, 6, 6, C.metal);
        R(g, lx - 2, ly - 8, 4, 5, C.ink);
        R(g, lx - 1, ly - 1, 2, 3, C.ink);
      }
      // roomba
      if (this.roomba.active) art.put(g, art.prop('roomba'), this.roomba.x, FLOOR, { flip: this.roomba.dir < 0 });
      // the beast, then zach (or what he's doing to zach)
      if (this.fatal) this.fatal.draw(g, t);
      else {
        if (b.state !== 'hidden') this.drawBeast(g, t);
        if (!this.escaped) this.drawZach(g, t);
      }
      // thrown things
      for (const p of this.projectiles) art.put(g, art.prop(p.type), p.x, p.y, { rot: p.rot, alpha: p.dead ? Math.min(1, p.life * 2) : 1 });
      this.parts.draw(g, 0);
    }

    // Night-time: the house is dark except where the lamps are.
    drawLighting(g, cam, ox, oy) {
      if (!lightCanvas) lightCanvas = art.canvasOf(EC.W, EC.H);
      const L = lightCanvas.getContext('2d');
      const z = this.z;
      const b = this.b;
      L.globalCompositeOperation = 'source-over';
      L.clearRect(0, 0, EC.W, EC.H);
      L.fillStyle = 'rgba(14,8,32,0.42)';
      L.fillRect(0, 0, EC.W, EC.H);
      L.globalCompositeOperation = 'destination-out';
      const hole = (x, y, r, s) => {
        if (x + r < 0 || x - r > EC.W) return;
        const grd = L.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, 'rgba(0,0,0,' + s + ')');
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        L.fillStyle = grd;
        L.fillRect(x - r, y - r, r * 2, r * 2);
      };
      const warm = [];
      for (const l of LIGHTS) {
        if (l.blown && !this.wallBlown) continue;
        hole(l.x - cam, l.y, l.r, 0.95);
        if (l.warm) warm.push(l);
      }
      if (this.doorOpen) {
        hole(DOOR_X + 12 - cam, FLOOR - 50, 110, 1);
        warm.push({ x: DOOR_X + 12, y: FLOOR - 50, r: 110 });
      }
      hole(z.x - cam, z.y - 14, 60, 0.7);
      if (this.fatal) hole(this.fatal.cam.x - cam, FLOOR - 70, 150, 0.85);
      if (b.state !== 'hidden') hole(b.x + 26 - cam, FLOOR - 70, 50, 0.5);
      L.globalCompositeOperation = 'source-over';
      g.save();
      g.imageSmoothingEnabled = true;
      g.drawImage(lightCanvas, ox, oy);
      g.restore();
      for (const l of warm) {
        const x = l.x - cam + ox;
        if (x + l.r < 0 || x - l.r > EC.W) continue;
        art.glow(g, x, l.y + oy, l.r * 0.55, 'rgba(255,180,100,0.16)');
      }
      // the beast's eyes throw red light on the wall behind him
      if (b.state !== 'hidden') art.glow(g, b.x + 26 - cam + ox, FLOOR - 70 + oy, 46, 'rgba(255,40,40,0.18)');
    }

    // Dark shapes close to the camera, sliding by faster than the room.
    drawForeground(g, cam) {
      g.fillStyle = '#0b070a';
      const off = cam * FG_PARALLAX;
      for (const f of FG) {
        const x = Math.round(f.x - off);
        if (x < -80 || x > EC.W + 20) continue;
        const B = EC.H;
        if (f.kind === 'chair') {
          g.fillRect(x + 2, B - 20, 52, 20);
          g.fillRect(x + 5, B - 23, 46, 3);
          g.fillRect(x + 10, B - 25, 36, 2);
        } else if (f.kind === 'plant') {
          g.fillRect(x + 6, B - 12, 18, 12);
          g.fillRect(x + 4, B - 14, 22, 2);
          [[-6, -22, 12, 4], [12, -24, 14, 4], [4, -30, 6, 16], [16, -18, 10, 3], [-2, -17, 9, 3]].forEach(([dx, dy, w, h]) => g.fillRect(x + 6 + dx, B + dy, w, h));
        } else if (f.kind === 'lamp') {
          g.fillRect(x + 10, B - 10, 4, 10);
          g.fillRect(x + 2, B - 4, 20, 4);
        } else {
          g.fillRect(x, B - 14, 30, 6);
          g.fillRect(x + 3, B - 8, 4, 8);
          g.fillRect(x + 23, B - 8, 4, 8);
        }
      }
    }

    // When he's behind you and off the screen, his eyes are at the edge of it.
    drawOffscreenBeast(g, cam, t) {
      const b = this.b;
      if (b.state === 'hidden' || this.escaped || this.caught) return;
      const right = b.x + 30 - cam;
      if (right > 0) return;
      const dist = this.z.x - b.x;
      const k = EC.clamp(1 - (dist - 120) / 320, 0.2, 1);
      const y = FLOOR - 70 + Math.sin(t * 2) * 2;
      const blink = Math.floor(t * 3.3) % 9 === 0;
      if (!blink) {
        art.glow(g, 6, y, 14 + 8 * k, 'rgba(255,40,40,0.9)', 0.35 + 0.5 * k);
        R(g, 3, y - 1, 3, 2, C.eye);
        R(g, 9, y - 1, 3, 2, C.eye);
      }
    }

    // Alex, ducked behind an armchair close to the camera, shouting a picture.
    drawAlex(g, t) {
      const a = this.alex;
      if (!a) return;
      const k = Math.min(1, (a.dur - a.t) * 7, a.t * 7);
      const bx = EC.W - 30;
      const by = EC.H - 4 + (1 - k) * 40;
      art.put(g, art.alex('peek'), bx, by, { sx: 2, sy: 2, flip: true });
      g.fillStyle = '#0b070a';
      g.fillRect(EC.W - 64, EC.H - 12, 64, 12);
      g.fillRect(EC.W - 61, EC.H - 14, 58, 2);
      if (k < 0.6) return;
      // the shout
      const shake = a.dur - a.t < 0.5 ? Math.round(Math.sin(t * 60)) : 0;
      const w = 12;
      const h = 10;
      const ix = EC.W - 66 - w * 2 + shake;
      const iy = EC.H - 34;
      R(g, ix - 1, iy - 1, w * 2 + 2, h * 2 + 2, C.ink);
      R(g, ix, iy, w * 2, h * 2, '#fffaf0');
      R(g, ix + w * 2, iy + 12, 4, 4, '#fffaf0');
      R(g, ix + w * 2 + 1, iy + 11, 4, 1, C.ink);
      R(g, ix + w * 2 + 4, iy + 12, 1, 4, C.ink);
      const P = (x, y, ww, hh, col) => R(g, ix + x * 2, iy + y * 2, ww * 2, hh * 2, col || C.ink);
      ICONS[a.icon](P);
    }

    drawZach(g, t) {
      const z = this.z;
      if (this.caught) return;
      if (z.inv > 0 && z.stun <= 0 && Math.floor(t * 16) % 2 === 0) return;
      let pose = 'idle';
      let frame = 0;
      if (z.stun > 0) pose = 'hurt';
      else if (this.unlockT > 0) pose = 'sorry';
      else if (!z.onGround) pose = z.vy < 0 ? 'jump' : 'fall';
      else if (z.slide) pose = 'slide';
      else if (z.duck) pose = 'duck';
      else if (Math.abs(z.vx) > 120) {
        pose = 'run';
        frame = Math.floor(z.dist / 9);
      } else if (Math.abs(z.vx) > 8) {
        pose = 'walk';
        frame = Math.floor(z.dist / 7);
      } else if (this.b.state !== 'hidden') pose = 'worry';
      // squash and stretch
      let sx = 1;
      let sy = 1;
      if (z.sq > 0) {
        const k = z.sq / 0.12;
        if (z.sqType === 'jump') {
          sx = 1 - 0.14 * k;
          sy = 1 + 0.16 * k;
        } else {
          sx = 1 + 0.22 * k;
          sy = 1 - 0.2 * k;
        }
      }
      art.put(g, art.zach(pose, frame), z.x, z.y, { flip: z.face < 0, sx, sy });
      if (this.hasGift && pose !== 'duck' && pose !== 'slide') art.put(g, art.prop('gift'), z.x + 8 * z.face, z.y - 9);
      if (this.unlockT > 0 && Math.floor(t * 12) % 2) art.put(g, art.prop('key'), z.x + 9, z.y - 16);
    }

    drawBeast(g, t) {
      const b = this.b;
      let o = { frame: Math.floor(b.dist / 10), socks: !b.slippers };
      let head = 'n';
      switch (b.state) {
        case 'emerge':
        case 'roar':
          o = { still: true, arm: 'wide', armB: 'wide', head: 'roar', socks: !b.slippers };
          head = 'roar';
          break;
        case 'off':
        case 'on':
          o = { still: true, arm: 'down', armB: 'down', head: 'low', drop: 12, socks: b.state === 'on' ? b.t > 0.38 : b.t < 0.55 };
          head = 'low';
          break;
        case 'windup':
          o = { still: true, arm: 'up', armB: 'swing1', socks: !b.slippers };
          break;
        case 'release':
          o = { still: true, arm: 'fwd', armB: 'swing1', socks: !b.slippers };
          break;
        case 'wedged':
          o = { still: true, arm: 'wide', armB: 'wide', head: Math.floor(t * 4) % 2 ? 'roar' : 'n', socks: !b.slippers };
          head = o.head;
          break;
        case 'grab':
          o = { still: true, arm: 'fwd', armB: 'swing1', head: 'roar', socks: !b.slippers };
          head = 'roar';
          break;
        case 'scolded':
          o = { still: true, arm: 'down', armB: 'down', head: 'low', drop: 6, socks: !b.slippers };
          head = 'low';
          break;
        default:
          if (!b.slippers) o.arm = 'hold';
      }
      const jitter = b.state === 'wedged' ? Math.round(EC.rand(-1, 1)) : 0;
      art.put(g, art.beastSide(o), b.x + jitter, FLOOR, { flip: b.face < 0 });
      // slippers set neatly by the carpet while he works on them
      if (b.state === 'off' || b.state === 'on') {
        const slx = b.state === 'off' ? CARPETS[b.carpet].x0 - 12 : b.x + 6;
        if ((b.state === 'off' && b.t < 0.55) || (b.state === 'on' && b.t > 0.38)) art.put(g, art.prop('slippers'), slx, FLOOR);
      }
      if (b.state === 'windup' && b.holding) {
        const h = art.beastHand.up;
        art.put(g, art.prop(b.holding), b.x + h[0], FLOOR + h[1], { rot: Math.sin(t * 10) * 0.3 });
      }
      if (b.state === 'grab') {
        const h = art.beastHand.grab;
        art.put(g, art.zach('hurt', 0), b.x + h[0] + 4, FLOOR + h[1] + 30 - Math.min(20, this.caughtT * 50), { flip: true });
      }
      const eye = art.beastSideEye[head] || art.beastSideEye.n;
      art.glow(g, b.x + eye[0] + jitter, FLOOR + eye[1], 10, 'rgba(255,43,43,0.95)', 0.75 + Math.sin(t * 9) * 0.2);
    }

    hudState() {
      return { key: this.hasKey, gift: this.hasGift, time: this.stats.time };
    }
    // Where to centre the iris wipe, in screen pixels.
    focus() {
      return { x: this.z.x - this.cam, y: this.z.y - 14 };
    }
    doorFocus() {
      return { x: DOOR_X + 12 - this.cam, y: FLOOR - 40 };
    }
  }

  EC.Level = Level;
  EC.LEVEL = { ROOMS, FLOOR };
})();

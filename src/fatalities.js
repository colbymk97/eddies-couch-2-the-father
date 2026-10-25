/* Eddie's Couch 2 — what happens when he catches you. Each catch is worse than the last. */
(function () {
  'use strict';
  const EC = window.EC;
  const art = EC.art;
  const C = EC.C;
  const R = art.R;
  const sfx = EC.audio.sfx;

  const FLOOR = 230;
  const TOP = 34;
  const RED = ['#d6102b', '#b00c22', '#ff3348', '#e01535'];
  const DARK = ['#8c0a1d', '#a80d24'];
  // Where his fists are for each arm pose, relative to his feet (facing right).
  const HANDS = { fwd: [33, -56], up: [0, -84], wide: [33, -73], wideB: [17, -73], down: [21, -31], hold: [28, -48], swing0: [22, -31] };

  class Fatal {
    constructor(level, idx) {
      this.L = level;
      this.idx = idx;
      this.t = 0;
      this.ts = 1;
      this.done = false;
      this.beast = { x: level.b.x, o: { still: true, arm: 'fwd', armB: 'swing1', head: 'roar', socks: !level.b.slippers }, jitter: 0 };
      this.pieces = [];
      this.decals = [];
      this.fountains = [];
      this.blood = new EC.Particles();
      this.bits = new EC.Particles();
      this.cam = { z: 1, x: level.b.x + 30, y: FLOOR - 60 };
      this.stamp = null;
      this.gary = 0;
      this.red = 0;
      this.glass = null;
      this.mom = null;
      this.alex = null;
      this.tears = new EC.Particles();
      this.messHint = null;
      this.plastic = 0;
      this.wipe = 0;
      this.momScore = 0;
      // The script starts running inside the Cutscene constructor, so park any camera moves until it exists.
      const parked = [];
      this.cs = { tween: (...args) => parked.push(args) };
      const cs = new EC.Cutscene(LIST[idx].script, this);
      this.cs = cs;
      parked.forEach((args) => cs.tween(...args));
    }

    // ---------------------------------------------------------------- tools for the scripts
    pose(o) {
      this.beast.o = Object.assign({ still: true, arm: 'swing0', armB: 'swing1', head: 'n', socks: this.beast.o.socks }, o);
    }
    hand(name) {
      const h = HANDS[name] || HANDS.fwd;
      const drop = name === 'down' ? this.beast.o.drop | 0 : 0;
      return { x: this.beast.x + h[0], y: FLOOR + h[1] + drop };
    }
    add(spr, x, y, o) {
      const centered = Math.abs(spr.ay - spr.h / 2) < 0.6;
      const p = Object.assign(
        { spr, x, y, rot: 0, sx: 1, sy: 1, flip: false, alpha: 1, phys: false, vx: 0, vy: 0, g: 900, vr: 0, spin: 0, bounce: 0.3, floorOff: centered ? spr.h / 2 - 1 : 0, hold: null, landed: false, walls: null, clipY: null, wobble: 0, orbit: null },
        o || {}
      );
      this.pieces.push(p);
      return p;
    }
    zach(pose, o) {
      return this.add(art.zach(pose, 0), 0, 0, o);
    }
    gib(name, x, y, o) {
      return this.add(art.gib(name), x, y, o);
    }
    swap(p, name) {
      const spr = art.gib(name);
      p.spr = spr;
      p.floorOff = spr.h / 2 - 1;
    }
    holdAt(p, hand, dx, dy) {
      p.hold = { hand, dx, dy };
      p.phys = false;
      this.syncHold(p);
    }
    syncHold(p) {
      const h = this.hand(p.hold.hand);
      p.x = h.x + p.hold.dx;
      p.y = h.y + p.hold.dy;
    }
    release(p, vx, vy) {
      p.hold = null;
      if (vx != null) {
        p.phys = true;
        p.vx = vx;
        p.vy = vy;
      }
    }
    remove(p) {
      this.pieces = this.pieces.filter((q) => q !== p);
    }
    camTo(z, x, y, dur) {
      this.cs.tween(this.cam, { z, x, y }, dur || 0.4, EC.ease.out);
    }
    shake(a, t) {
      EC.fx.shake(a, t);
    }
    // Blood that flies, lands, and stays where it lands.
    bleed(x, y, n, o) {
      o = o || {};
      const a0 = o.a0 == null ? -Math.PI : o.a0;
      const a1 = o.a1 == null ? 0 : o.a1;
      for (let i = 0; i < n; i++) {
        const a = EC.rand(a0, a1);
        const sp = EC.rand(o.s0 || 60, o.s1 || 220);
        this.blood.add({
          x,
          y,
          vx: Math.cos(a) * sp + (o.vx || 0),
          vy: Math.sin(a) * sp,
          g: 700,
          life: 2.5,
          size: EC.pick([1, 2, 2, 3]),
          color: EC.pick(RED),
          fade: false,
          floor: FLOOR + EC.rand(0, 7),
          bounce: 0,
          onBounce: (p) => {
            this.decals.push({ kind: 'dot', x: p.x, y: p.y, s: p.size + (Math.random() < 0.3 ? 1 : 0), c: EC.pick(DARK.concat(RED)) });
            p.t = p.life;
          },
        });
      }
    }
    splatWall(x, y, n, spread) {
      spread = spread || 40;
      for (let i = 0; i < n; i++) {
        const sx = x + EC.rand(-spread, spread);
        const sy = Math.min(FLOOR - 4, y + EC.rand(-spread * 0.8, spread * 0.4));
        this.decals.push({ kind: 'splat', x: sx, y: sy, s: EC.pick([2, 3, 3, 4, 5]), c: EC.pick(RED), drip: 0, dripMax: Math.random() < 0.5 ? EC.rand(4, 18) : 0 });
      }
    }
    pool(x, w) {
      this.decals.push({ kind: 'pool', x, w: 2, max: w });
    }
    fountain(o) {
      this.fountains.push(Object.assign({ t: 0, dur: 1, rate: 80, s0: 180, s1: 320, a: -Math.PI / 2, spread: 0.35, follow: null, dx: 0, dy: 0 }, o));
    }
    bitsBurst(x, y, n, colors, o) {
      this.bits.burst(n, Object.assign({ x, y, g: 600, s0: 60, s1: 220, a0: -Math.PI, a1: 0, life: 1.4, sizes: [2, 3], color: colors, floor: FLOOR + 4 }, o || {}));
    }
    stars(x, y) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        this.bits.add({ x, y, vx: Math.cos(a) * 45, vy: Math.sin(a) * 30 - 10, g: 30, life: 0.6, size: 2, color: i % 2 ? '#ffd23e' : '#ffffff' });
      }
    }
    sparkle(x, y) {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const s = EC.rand(30, 90);
        this.bits.add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 20, life: EC.rand(0.6, 1), size: EC.pick([1, 2]), color: EC.pick(['#ffd23e', '#ffffff', '#7fd7ff']) });
      }
    }
    hole(x) {
      this.decals.push({ kind: 'hole', x });
      this.bitsBurst(x, TOP + 2, 18, ['#efe7d6', '#c9bfa9', '#2a2026'], { a0: 0.2, a1: Math.PI - 0.2, s0: 20, s1: 90 });
    }
    crater(x) {
      this.decals.push({ kind: 'crater', x });
    }
    stampIt(text) {
      this.stamp = { text, t: 0 };
      sfx.stamp();
    }
    // Mom, walking somewhere with purpose.
    momWalk(x) {
      this.mom.to = x;
    }
    // Where the worst of it is.
    messX() {
      if (this.messHint != null) return this.messHint;
      const low = this.pieces.filter((p) => !p.hold && p.y > FLOOR - 60);
      if (!low.length) return this.beast.x + 50;
      return low.reduce((a, p) => a + p.x, 0) / low.length;
    }
    mopAt(x) {
      this.decals = this.decals.filter((d) => {
        if (d.kind === 'hole' || d.kind === 'crater') return true;
        if (d.kind === 'pool') return Math.abs(d.x - x) > 30;
        if (d.kind === 'splat') return d.y < FLOOR - 46 || Math.abs(d.x - x) > 30;
        return Math.abs(d.x - x) > 30;
      });
    }
    viewBounds() {
      const half = EC.W / 2 / this.cam.z;
      return [this.cam.x - half + 6, this.cam.x + half - 6];
    }

    // ---------------------------------------------------------------- frame
    update(dt) {
      const d = dt * this.ts;
      this.t += d;
      this.cs.update(d);
      if (this.cs.done) this.done = true;
      for (const p of this.pieces) {
        if (p.hold) this.syncHold(p);
        if (p.orbit) {
          const o = p.orbit;
          o.a += o.w * d;
          p.x = o.cx + Math.cos(o.a) * o.r;
          p.y = o.cy + Math.sin(o.a) * o.r * 0.55;
          p.rot += 6 * d;
        }
        p.rot += p.spin * d;
        if (!p.phys) continue;
        p.vy += p.g * d;
        p.x += p.vx * d;
        p.y += p.vy * d;
        p.rot += p.vr * d;
        if (p.walls) {
          const [l, r] = this.viewBounds();
          if (p.x < l || p.x > r) {
            p.x = EC.clamp(p.x, l, r);
            p.vx *= -0.8;
            if (p.onBounce) p.onBounce(p);
          }
          if (p.y < TOP + 6) {
            p.y = TOP + 6;
            p.vy *= -0.7;
            if (p.onBounce) p.onBounce(p);
          }
        }
        if (p.y + p.floorOff > FLOOR) {
          p.y = FLOOR - p.floorOff;
          const hard = Math.abs(p.vy) > 120;
          if (!p.landed || hard) {
            if (p.onLand) p.onLand(p, hard);
            if (hard) sfx.land();
          }
          p.landed = true;
          p.vy = Math.abs(p.vy) > 60 ? -p.vy * p.bounce : 0;
          p.vx *= 0.6;
          p.vr *= 0.5;
          if (p.walls && hard && p.onBounce) p.onBounce(p);
        }
      }
      for (const f of this.fountains) {
        if (f.t >= f.dur) continue;
        f.t += d;
        let x = f.x;
        let y = f.y;
        if (f.follow) {
          x = f.follow.x + f.dx;
          y = f.follow.y + f.dy;
        }
        const n = Math.round(f.rate * d + Math.random() * 0.6);
        if (n > 0) this.bleed(x, y, n, { a0: f.a - f.spread, a1: f.a + f.spread, s0: f.s0, s1: f.s1 });
      }
      for (const dcl of this.decals) {
        if (dcl.kind === 'pool' && dcl.w < dcl.max) dcl.w = Math.min(dcl.max, dcl.w + d * 30);
        if (dcl.kind === 'splat' && dcl.drip < dcl.dripMax) dcl.drip = Math.min(dcl.dripMax, dcl.drip + d * 8);
      }
      const m = this.mom;
      if (m && m.to != null) {
        const dx = m.to - m.x;
        if (Math.abs(dx) < 1) {
          m.x = m.to;
          m.to = null;
        } else {
          m.face = dx > 0 ? 1 : -1;
          const mv = Math.min(Math.abs(dx), (m.speed || 150) * d);
          m.x += Math.sign(dx) * mv;
          m.dist += mv;
        }
      }
      const a = this.alex;
      if (a) {
        if (a.to != null) {
          const dx = a.to - a.x;
          if (Math.abs(dx) < 1) {
            a.x = a.to;
            a.to = null;
          } else {
            a.face = dx > 0 ? 1 : -1;
            const mv = Math.min(Math.abs(dx), a.speed * d);
            a.x += Math.sign(dx) * mv;
            a.dist += mv;
          }
        }
        if (a.crying) {
          a.ct += d;
          a.tearT -= d;
          if (a.tearT <= 0) {
            // two little fountains
            a.tearT = 0.06;
            const ey = FLOOR - 21 + (Math.floor(a.ct / 0.22) & 1);
            for (const sd of [-1, 1]) {
              this.tears.add({ x: a.x + 2 * a.face, y: ey, vx: sd * EC.rand(25, 70), vy: EC.rand(-120, -50), g: 420, life: 0.8, size: EC.pick([1, 1, 2]), color: EC.pick(['#7fd7ff', '#bfeaff', '#ffffff']), floor: FLOOR + 2, bounce: 0, onBounce: (q) => (q.t = q.life) });
            }
          }
        }
        if (a.to == null && !this.done) {
          a.sobT -= dt;
          if (a.sobT <= 0) {
            sfx.sob();
            a.sobT = 1.6;
          }
        }
      }
      this.tears.update(d);
      this.blood.update(d);
      this.bits.update(d);
      if (this.stamp) this.stamp.t += dt;
      if (this.glass) this.glass.t += dt;
    }

    // Decals sit on the wall and floor, behind everyone.
    drawDecals(g) {
      for (const d of this.decals) {
        if (d.kind === 'dot') R(g, Math.round(d.x), Math.round(d.y), d.s, Math.max(1, d.s - 1), d.c);
        else if (d.kind === 'splat') {
          R(g, Math.round(d.x - d.s / 2), Math.round(d.y - d.s / 2), d.s, d.s, d.c);
          R(g, Math.round(d.x + d.s / 2), Math.round(d.y - d.s), 1, 1, d.c);
          if (d.drip > 0) R(g, Math.round(d.x), Math.round(d.y + d.s / 2), 1, Math.round(d.drip), d.c);
        } else if (d.kind === 'pool') {
          const w = Math.round(d.w);
          R(g, Math.round(d.x - w / 2), FLOOR + 2, w, 3, '#8c0a1d');
          R(g, Math.round(d.x - w / 2 + 2), FLOOR + 1, Math.max(0, w - 4), 1, '#a80d24');
          R(g, Math.round(d.x - w / 2 + 3), FLOOR + 5, Math.max(0, w - 6), 1, '#8c0a1d');
          R(g, Math.round(d.x - w / 4), FLOOR + 2, Math.max(0, Math.round(w / 3)), 1, '#d6102b');
        } else if (d.kind === 'hole') {
          R(g, d.x - 11, 0, 22, TOP + 4, '#0b0709');
          R(g, d.x - 14, TOP - 6, 4, 6, '#0b0709');
          R(g, d.x + 9, TOP - 5, 5, 7, '#0b0709');
          R(g, d.x - 7, TOP + 4, 5, 3, '#0b0709');
          R(g, d.x + 3, TOP + 4, 4, 2, '#0b0709');
        } else if (d.kind === 'crater') {
          R(g, d.x - 30, FLOOR - 2, 60, 9, '#140d10');
          R(g, d.x - 22, FLOOR - 4, 44, 3, '#140d10');
          R(g, d.x - 36, FLOOR + 1, 8, 1, '#2a1a12');
          R(g, d.x + 28, FLOOR + 2, 10, 1, '#2a1a12');
          R(g, d.x - 10, FLOOR - 40, 1, 38, '#3a2a22');
          R(g, d.x + 14, FLOOR - 30, 1, 28, '#3a2a22');
        }
      }
    }

    draw(g, t) {
      const b = this.beast;
      art.put(g, art.beastSide(b.o), b.x + b.jitter, FLOOR);
      const eye = art.beastSideEye[b.o.head] || art.beastSideEye.n;
      art.glow(g, b.x + eye[0] + b.jitter, FLOOR + eye[1] + (b.o.drop | 0), 10, 'rgba(255,43,43,0.95)', 0.8 + Math.sin(t * 9) * 0.15);
      for (const p of this.pieces) {
        let sx = p.sx;
        if (p.wobble) sx *= 1 + Math.sin(this.t * 14) * p.wobble;
        if (p.clipY != null) {
          g.save();
          g.beginPath();
          g.rect(-1e5, -1e5, 2e5, 1e5 + p.clipY);
          g.clip();
        }
        art.put(g, p.spr, p.x, p.y, { rot: p.rot, sx, sy: p.sy, flip: p.flip, alpha: p.alpha });
        if (p.clipY != null) g.restore();
      }
      // like the furniture: covered in plastic
      if (this.plastic > 0) {
        g.globalAlpha = this.plastic;
        for (const p of this.pieces) {
          if (p.hold || p.noPlastic || p.y < FLOOR - 50 || p.spr === art.gib('framed')) continue;
          const hw = Math.ceil(p.spr.w / 2) + 3;
          const top = Math.round(Math.min(p.y - p.spr.h / 2, FLOOR - 8)) - 3;
          R(g, Math.round(p.x - hw), top, hw * 2, FLOOR - top + 1, 'rgba(225,238,255,0.42)');
          R(g, Math.round(p.x - hw), top, hw * 2, 1, 'rgba(255,255,255,0.8)');
          R(g, Math.round(p.x - hw + 2), top + 2, 1, 3, 'rgba(255,255,255,0.8)');
          R(g, Math.round(p.x + hw - 4), top + 4, 1, 5, 'rgba(255,255,255,0.6)');
        }
        g.globalAlpha = 1;
      }
      const a = this.alex;
      if (a) {
        const spr = a.to != null ? art.alex('run', Math.floor(a.dist / 7)) : a.crying ? art.alex('cry', Math.floor(a.ct / 0.22)) : art.alex(a.pose, 0);
        art.put(g, spr, a.x, FLOOR, { flip: a.face < 0 });
      }
      const m = this.mom;
      if (m) {
        const pose = m.to != null ? 'walk' : m.pose;
        art.put(g, art.mom(pose, Math.floor(m.dist / 6)), m.x, FLOOR, { flip: m.face < 0 });
      }
      this.blood.draw(g, 0);
      this.bits.draw(g, 0);
      this.tears.draw(g, 0);
    }

    // Things on the glass of the TV: a face, a red tide, Gary, the stamp.
    drawScreen(g) {
      if (this.red > 0) {
        const h = EC.H * this.red;
        g.globalAlpha = 0.75;
        g.fillStyle = '#8c0a1d';
        g.fillRect(0, EC.H - h, EC.W, h);
        g.fillStyle = '#d6102b';
        for (let x = 0; x < EC.W; x += 6) g.fillRect(x, EC.H - h - 2 - ((x * 7) % 5), 4, 3);
        g.globalAlpha = 1;
      }
      if (this.glass) this.drawGlass(g);
      if (this.gary > 0) this.drawGary(g);
      if (this.momScore > 0) this.drawMomScore(g);
      if (this.wipe > 0 && this.wipe < 1) this.drawWipe(g);
      if (this.stamp) {
        const s = this.stamp;
        const k = Math.min(1, s.t / 0.16);
        const sc = 1.8 - 0.8 * EC.ease.out(k);
        g.save();
        g.translate(EC.W / 2, 64);
        g.rotate(-0.07);
        g.scale(sc, sc);
        g.globalAlpha = Math.min(1, k * 1.5);
        g.font = '400 30px ' + EC.FONT.display;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        const w = g.measureText(s.text).width + 22;
        g.strokeStyle = '#ff3b30';
        g.lineWidth = 3;
        g.strokeRect(-w / 2, -22, w, 44);
        g.fillStyle = C.ink;
        g.fillText(s.text, 3, 3);
        g.fillStyle = '#ff3b30';
        g.fillText(s.text, 0, 0);
        g.restore();
      }
    }
    drawGlass(g) {
      const G = this.glass;
      const slide = Math.min(60, G.t * 14);
      // Mom's rag clears everything to the left of where it's been
      const clearX = this.wipe > 0 ? -40 + this.wipe * (EC.W + 80) : -1e4;
      g.save();
      for (const s of G.splats) {
        if (s.x < clearX) continue;
        g.fillStyle = s.c;
        g.fillRect(s.x, s.y + slide * s.k, s.w, s.h);
        if (s.drip) g.fillRect(s.x + 1, s.y + slide * s.k + s.h, 2, s.drip + slide * 0.6);
      }
      if (G.x + 30 > clearX) art.put(g, art.gib('head'), G.x, G.y + slide, { sx: G.sx, sy: G.sy, rot: 0.15 });
      g.restore();
    }
    // A pink sleeve and a yellow rag, wiping the inside of the TV.
    drawWipe(g) {
      const x = -40 + this.wipe * (EC.W + 80);
      const y = 120 + Math.sin(this.wipe * Math.PI * 6) * 26;
      R(g, x - 70, y + 6, 70, 18, C.mCardi);
      R(g, x - 70, y + 6, 70, 3, C.mCardiS);
      R(g, x - 4, y + 4, 12, 20, C.aSkin);
      R(g, x - 2, y - 6, 30, 30, '#f2d14a');
      R(g, x, y - 4, 26, 3, '#ffe27a');
      R(g, x + 4, y + 8, 18, 2, '#d9b43a');
      R(g, x + 6, y + 16, 16, 2, '#d9b43a');
    }
    // Mom has notes.
    drawMomScore(g) {
      const k = EC.clamp(this.momScore, 0, 1.2);
      const fx = 286;
      const fy = EC.H + 10 - 72 * k;
      art.put(g, art.mom('score', 0), fx, fy, { sx: 2, sy: 2 });
      const cx = fx + 8;
      const cy = fy - 84;
      R(g, cx - 1, cy + 24, 3, 14, C.woodS);
      R(g, cx - 12, cy - 1, 24, 28, C.ink);
      R(g, cx - 11, cy, 22, 26, '#ffffff');
      g.font = '400 15px ' + EC.FONT.display;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#3d6fc4';
      g.fillText('4', cx, cy + 14);
    }
    // Gary from church, beaming, scoring it.
    drawGary(g) {
      const k = EC.clamp(this.gary, 0, 1.2);
      const ox = 356;
      const oy = EC.H + 6 - 84 * k;
      const P = (x, y, w, h, c) => R(g, ox + x * 2, oy + y * 2, w * 2, h * 2, c);
      const card = (x, y) => {
        P(x + 5, y + 13, 1, 8, C.woodS);
        P(x - 0.5, y - 0.5, 12, 14, C.ink);
        P(x, y, 11, 13, '#ffffff');
        g.font = '400 13px ' + EC.FONT.display;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = '#d6102b';
        g.fillText('10', ox + (x + 5.5) * 2, oy + (y + 7) * 2);
      };
      // sweater vest over a church shirt
      P(-5, 14, 22, 26, '#3a5a8a');
      P(0, 14, 12, 26, '#c9a26e');
      P(5, 14, 2, 7, '#f2eee4');
      // arms up
      P(-8, 5, 3, 12, '#3a5a8a');
      P(17, 5, 3, 12, '#3a5a8a');
      P(-8, 3, 3, 3, C.skin);
      P(17, 3, 3, 3, C.skin);
      // head
      P(0, 0, 12, 14, C.skin);
      P(1, -1, 10, 1, C.skin);
      P(2, 0, 4, 2, '#f8dbb6');
      P(-1, 4, 2, 6, C.dHair);
      P(11, 4, 2, 6, C.dHair);
      P(2, 5, 3, 2, C.glass);
      P(7, 5, 3, 2, C.glass);
      P(5, 6, 2, 1, C.glass);
      P(3, 6, 1, 1, C.ink);
      P(8, 6, 1, 1, C.ink);
      P(3, 10, 6, 2, C.ink);
      P(4, 10, 4, 1, '#ffffff');
      P(2, 9, 1, 1, C.ink);
      P(9, 9, 1, 1, C.ink);
      // the scores
      card(-12, -10);
      card(19, -10);
      card(0.5, -15);
    }
  }

  // ================================================================ Alex
  // Every time: she runs in, drops to her knees beside what's left, and cries. She doesn't stop.
  function* grief(F, cs, x) {
    const [l, r] = F.viewBounds();
    let spot = x - 20;
    let face = 1;
    if (spot < l + 14) {
      spot = x + 20;
      face = -1;
    }
    spot = EC.clamp(spot, l + 14, r - 14);
    F.alex = { x: face > 0 ? l - 16 : r + 16, face, to: spot, speed: 210, dist: 0, pose: 'run', crying: false, ct: 0, tearT: 0, sobT: 0 };
    const a = F.alex;
    yield () => a.to == null;
    a.face = face;
    a.pose = 'kneel';
    sfx.land();
    yield 0.45;
    a.crying = true;
    yield 0.4;
  }

  // ================================================================ Mom cleans up
  // She has done this before. She will do it again.
  function* aftermath(F, cs, how) {
    if (how === 'wipe') {
      // the camera got the worst of it
      yield 0.6;
      sfx.squeegee();
      cs.tween(F, { wipe: 1 }, 1.4, EC.ease.inOut);
      yield 0.7;
      sfx.squeegee();
      yield 0.8;
      F.glass = null;
      yield 0.5;
      return;
    }
    if (how === 'score') {
      cs.tween(F, { momScore: 1 }, 0.45, EC.ease.outBack);
      yield 0.5;
      sfx.tsk();
      yield 1.4;
      return;
    }
    const [l, r] = F.viewBounds();
    F.mom = { x: r + 16, face: -1, pose: 'sigh', dist: 0, to: null, speed: 150 };
    const m = F.mom;
    if (how === 'leftovers') {
      // the sneaker goes in a Tupperware, for later
      const shoe = F.pieces.find((p) => p.spr === art.gib('shoe'));
      if (shoe) {
        F.momWalk(shoe.x + 13);
        yield () => m.to == null;
        m.face = -1;
        m.pose = 'tupper';
        yield 0.3;
        cs.tween(shoe, { x: m.x - 8, y: FLOOR - 13 }, 0.25);
        yield 0.3;
        F.remove(shoe);
        m.pose = 'tupperFull';
        sfx.click();
        yield 0.12;
        sfx.click();
        yield 0.6;
        m.pose = 'sigh';
      }
    }
    if (how === 'tape') {
      // she puts him back together with packing tape
      const front = F.pieces.find((p) => p.half === 'front');
      const back = F.pieces.find((p) => p.half === 'back');
      if (front && back) {
        const X = back.x;
        F.momWalk(X + 24);
        yield () => m.to == null;
        m.face = -1;
        m.pose = 'point';
        // face-up half on top, cut sides together
        cs.tween(back, { y: FLOOR - 7, rot: -Math.PI / 2 }, 0.45, EC.ease.inOut);
        cs.tween(front, { x: X, y: FLOOR - 20, rot: -Math.PI / 2 }, 0.45, EC.ease.inOut);
        sfx.slide();
        yield 0.55;
        for (const dx of [-10, 0, 10]) {
          F.add(TAPE(), X + dx, FLOOR - 13, { noPlastic: true });
          sfx.tape();
          yield 0.32;
        }
        sfx.pat();
        m.pose = 'sigh';
        yield 0.35;
      }
    }
    if (how === 'frame') {
      const frame = F.pieces.find((p) => p.spr === art.gib('framed'));
      if (frame) {
        F.momWalk(frame.x + 16);
        yield () => m.to == null;
        m.face = -1;
        m.pose = 'score';
        for (const rot of [0.05, -0.02, 0]) {
          frame.rot = rot;
          sfx.click();
          yield 0.28;
        }
        m.pose = 'sigh';
        yield 0.3;
      }
    }
    if (how === 'head') {
      const head = F.pieces.find((p) => p.spr === art.gib('head') || p.spr === art.gib('headBlink'));
      const body = F.pieces.find((p) => p.spr === art.gib('body'));
      if (head && body) {
        F.momWalk(head.x + 12);
        yield () => m.to == null;
        m.face = -1;
        m.pose = 'hold';
        head.phys = false;
        cs.tween(head, { x: head.x + 4, y: FLOOR - 22, rot: 0 }, 0.25);
        yield 0.3;
        // she carries it over and puts it back where it goes
        const neckX = body.x + (body.rot ? 16 : 0);
        F.momWalk(neckX + 12);
        const hs = cs.t;
        yield () => {
          head.x = m.x - 8;
          return m.to == null || cs.t - hs > 2;
        };
        cs.tween(head, { x: neckX, y: body.rot ? body.y : body.y - 16, rot: body.rot || 0 }, 0.3);
        yield 0.35;
        sfx.pat();
        m.pose = 'sigh';
        yield 0.4;
      }
    }
    // mop
    const mess = EC.clamp(F.messX(), l + 30, r - 30);
    F.momWalk(mess + 18);
    yield () => m.to == null;
    m.face = -1;
    for (let i = 0; i < 6; i++) {
      m.pose = i % 2 ? 'mop2' : 'mop';
      m.x -= 3;
      F.mopAt(m.x - 8);
      sfx.mop();
      yield 0.22;
    }
    // and plastic over whatever's left
    m.pose = 'sigh';
    if (F.pieces.some((p) => !p.hold && !p.noPlastic && p.y > FLOOR - 50)) {
      sfx.crinkle();
      cs.tween(F, { plastic: 1 }, 0.3);
      yield 0.5;
      sfx.pat();
    }
    yield 0.6;
  }

  const BULGE = () =>
    art.sprite('bulge', 9, 8, (g) => {
      R(g, 1, 0, 7, 8, C.bSkin);
      R(g, 0, 1, 9, 6, C.bSkin);
      R(g, 2, 1, 3, 2, C.bSkinL);
      R(g, 1, 6, 7, 1, C.bSkinS);
    }, true);
  const TAPE = () =>
    art.sprite('tape', 3, 15, (g) => {
      R(g, 0, 0, 3, 15, '#d9bf8c');
      R(g, 0, 0, 1, 15, '#f0dcb0');
      R(g, 0, 7, 3, 1, '#c4a874');
    }, true);

  // ================================================================ the ten
  // 1. Head-first into the floorboards. The legs keep going for a while.
  function* lawnDart(F, cs) {
    const bx = F.beast.x;
    F.camTo(1.6, bx + 30, FLOOR - 62, 0.4);
    F.pose({ arm: 'fwd', head: 'roar' });
    const z = F.zach('hurt', { flip: true });
    F.holdAt(z, 'fwd', 4, 22);
    sfx.roar(0.8);
    yield 0.55;
    F.pose({ arm: 'up', armB: 'wide', head: 'roar' });
    z.rot = Math.PI;
    F.holdAt(z, 'up', 0, -2);
    F.shake(2, 0.5);
    yield 0.6;
    F.pose({ arm: 'down', armB: 'down', head: 'low', drop: 12 });
    F.release(z);
    z.x = bx + 30;
    z.y = FLOOR - 14;
    z.clipY = FLOOR + 1;
    sfx.crunch();
    sfx.smash();
    F.shake(8, 0.5);
    F.bitsBurst(z.x, FLOOR, 16, ['#8a5a38', '#5a3419', '#a8784f'], { s0: 80, s1: 260 });
    F.bleed(z.x, FLOOR - 2, 22, { a0: -2.6, a1: -0.5, s0: 100, s1: 260 });
    F.pool(z.x, 26);
    yield 0.45;
    F.camTo(2.4, z.x - 4, FLOOR - 26, 0.5);
    F.pose({ arm: 'swing0', armB: 'swing1', head: 'n' });
    for (let i = 0; i < 11; i++) {
      z.flip = !z.flip;
      if (i % 3 === 0) sfx.blip('zachm');
      yield 0.08 + i * 0.035;
    }
    F.gib('shoe', z.x, FLOOR - 16, { phys: true, vx: 70, vy: -300, vr: 14, bounce: 0.4 });
    sfx.boing();
    yield 0.7;
    F.camTo(1.6, bx + 30, FLOOR - 62, 0.4);
    yield 0.4;
    // he dusts off his hands
    F.bitsBurst(bx + 22, FLOOR - 32, 6, ['#d8cfc0'], { g: -20, s0: 10, s1: 40, life: 0.6 });
    sfx.pat();
    yield 0.18;
    sfx.pat();
    F.stampIt('LAWN DARTED.');
    yield* grief(F, cs, z.x);
    yield* aftermath(F, cs, 'mop');
  }

  // 2. Folded up like a recliner. There's a lever.
  function* reclined(F, cs) {
    const bx = F.beast.x;
    F.camTo(1.8, bx + 36, FLOOR - 52, 0.4);
    F.pose({ arm: 'fwd', armB: 'fwd', head: 'roar' });
    const z = F.zach('hurt', { flip: true });
    F.holdAt(z, 'fwd', 4, 22);
    yield 0.6;
    for (const [sx, sy] of [[1.15, 0.72], [1.1, 0.48]]) {
      z.sx = sx;
      z.sy = sy;
      sfx.crunch();
      sfx.whine();
      F.bleed(z.x, z.y - 8, 10, { s0: 80, s1: 200 });
      F.shake(3, 0.2);
      yield 0.6;
    }
    // a neat little cube
    F.remove(z);
    const cube = F.gib('cube', z.x, z.y - 6, { flip: true });
    F.holdAt(cube, 'fwd', 4, 10);
    sfx.crunch();
    sfx.kachunk();
    F.bleed(cube.x, cube.y, 16, { s0: 80, s1: 240 });
    F.splatWall(cube.x, cube.y - 10, 12, 30);
    F.shake(4, 0.25);
    yield 0.7;
    F.pose({ arm: 'down', armB: 'down', head: 'low', drop: 12 });
    F.release(cube);
    cs.tween(cube, { x: bx + 46, y: FLOOR - 7 }, 0.35);
    yield 0.5;
    sfx.land();
    F.pool(bx + 46, 20);
    F.pose({ arm: 'swing0', armB: 'swing1', head: 'n' });
    F.camTo(2.4, bx + 46, FLOOR - 22, 0.45);
    yield 0.5;
    // pull the lever
    sfx.click();
    yield 0.4;
    F.swap(cube, 'cubeFeet');
    cube.x += 4;
    cube.flip = false;
    sfx.kachunk();
    F.bleed(cube.x + 8, cube.y, 8, { s0: 60, s1: 140 });
    F.shake(2, 0.15);
    yield 0.7;
    sfx.pat();
    F.stampIt('RECLINED.');
    yield* grief(F, cs, cube.x);
    yield* aftermath(F, cs, 'mop');
  }

  // 3. Tossed up like a grape and caught. Chewed. Swallowed. A sneaker comes back up.
  function* eaten(F, cs) {
    const bx = F.beast.x;
    const mx = bx + 28;
    const my = FLOOR - 66;
    F.camTo(1.6, bx + 30, FLOOR - 80, 0.4);
    F.pose({ arm: 'fwd', head: 'roar' });
    const z = F.zach('hurt', { flip: true });
    F.holdAt(z, 'fwd', 4, 22);
    sfx.roar(0.6);
    yield 0.5;
    // up he goes
    F.release(z);
    F.pose({ arm: 'up', armB: 'swing1', head: 'n' });
    sfx.whoosh();
    cs.tween(z, { x: mx, y: my - 84, rot: Math.PI * 3 }, 0.55, EC.ease.out);
    yield 0.6;
    // mouth open; head first
    F.pose({ arm: 'swing0', armB: 'swing1', head: 'roar' });
    z.clipY = my + 1;
    cs.tween(z, { y: my - 22 }, 0.35, EC.ease.in);
    yield 0.36;
    sfx.crunch();
    sfx.splat();
    F.shake(5, 0.25);
    F.bleed(mx, my + 2, 14, { a0: -0.4, a1: Math.PI + 0.4, s0: 40, s1: 160 });
    F.fountain({ x: mx + 3, y: my + 7, dur: 3.2, rate: 12, a: Math.PI / 2, spread: 0.3, s0: 10, s1: 40 });
    // chewing, legs still going
    for (let i = 0; i < 8; i++) {
      F.pose({ arm: 'swing0', armB: 'swing1', head: i % 2 ? 'roar' : 'n' });
      z.flip = !z.flip;
      z.y += 1.5;
      if (i % 2 === 0) {
        sfx.crunch();
        F.bleed(mx - 2, my + 4, 5, { a0: 0.3, a1: 2.8, s0: 20, s1: 90 });
      }
      if (i === 3) sfx.blip('zachm');
      yield 0.17;
    }
    // slurped in like spaghetti
    F.pose({ arm: 'swing0', armB: 'swing1', head: 'roar' });
    sfx.slurp();
    cs.tween(z, { y: my + 2 }, 0.45, EC.ease.in);
    yield 0.5;
    F.remove(z);
    F.pool(mx + 3, 16);
    // gulp: a lump goes down, and something inside is still yelling
    F.pose({ arm: 'swing0', armB: 'swing1', head: 'n' });
    sfx.gulp();
    const lump = F.add(BULGE(), bx + 15, FLOOR - 58);
    cs.tween(lump, { x: bx + 2, y: FLOOR - 38 }, 0.6, EC.ease.in);
    yield 0.7;
    for (let i = 0; i < 4; i++) {
      lump.x += i % 2 ? 3 : -3;
      lump.sx = 1.25;
      lump.sy = 1.15;
      sfx.blip('zachm');
      yield 0.18;
      lump.sx = lump.sy = 1;
      yield 0.22;
    }
    F.remove(lump);
    yield 0.25;
    // and the burp
    F.pose({ arm: 'down', armB: 'swing1', head: 'roar' });
    sfx.burp();
    F.shake(2, 0.6);
    F.bitsBurst(mx + 4, my + 2, 14, ['#c9d68a', '#e8eebc', '#a8b860'], { g: -30, s0: 20, s1: 80, a0: -0.9, a1: 0.7, life: 1.1 });
    const shoe = F.gib('shoe', mx + 4, my + 2, { phys: true, vx: 110, vy: -160, vr: 12, bounce: 0.4 });
    F.bleed(mx + 4, my + 2, 6, { a0: -0.6, a1: 0.4, s0: 80, s1: 180 });
    yield 1.0;
    // he pats his belly
    F.pose({ arm: 'down', armB: 'swing1', head: 'n' });
    sfx.pat();
    yield 0.2;
    sfx.pat();
    yield 0.4;
    F.messHint = mx + 3;
    F.stampIt('LEFTOVERS.');
    yield* grief(F, cs, shoe.x);
    yield* aftermath(F, cs, 'leftovers');
  }

  // 4. Through the ceiling. Something comes back down.
  function* punted(F, cs) {
    const bx = F.beast.x;
    F.camTo(1.0, bx + 40, EC.H / 2, 0.35);
    F.pose({ arm: 'fwd', head: 'roar' });
    const z = F.zach('hurt', { flip: true });
    F.holdAt(z, 'fwd', 4, 22);
    yield 0.45;
    F.release(z, 0, 0);
    F.pose({ arm: 'swing0', armB: 'swing1', head: 'n' });
    yield 0.4;
    F.pose({ legUp: 'kick', arm: 'wide', armB: 'swing1', head: 'roar' });
    sfx.smash();
    F.shake(6, 0.3);
    F.bleed(z.x, z.y - 14, 12, { a0: -2.2, a1: -0.4 });
    z.phys = true;
    z.vx = 90;
    z.vy = -1150;
    z.vr = 16;
    z.g = 0;
    yield () => z.y < TOP + 24;
    const hx = z.x;
    F.hole(hx);
    F.remove(z);
    sfx.smash();
    F.shake(4, 0.3);
    F.pose({ arm: 'swing0', armB: 'swing1', head: 'roar' });
    yield 1.2;
    for (let i = 0; i < 4; i++) {
      F.bleed(hx + EC.rand(-4, 4), TOP + 3, 2, { a0: 1.4, a1: 1.7, s0: 5, s1: 20 });
      yield 0.4;
    }
    F.pool(hx, 14);
    // a sneaker falls, right on his head
    const fall = Math.sqrt((2 * (FLOOR - 90 - TOP)) / 600);
    const shoe = F.gib('shoe', hx, TOP + 4, { phys: true, vx: (bx + 26 - hx) / fall, vy: 0, g: 600, vr: 10, bounce: 0.4 });
    sfx.whistle();
    yield () => shoe.y > FLOOR - 92;
    sfx.bonk();
    shoe.vy = -220;
    shoe.vx = 90;
    F.stars(bx + 26, FLOOR - 92);
    F.beast.jitter = 1;
    yield 0.12;
    F.beast.jitter = 0;
    yield 0.8;
    F.stampIt('PUNTED.');
    yield* grief(F, cs, hx);
    yield* aftermath(F, cs, 'mop');
  }

  // 5. Stomped flat, peeled up like a sticker, framed, squared up, patted once.
  function* framed(F, cs) {
    const bx = F.beast.x;
    F.camTo(1.6, bx + 40, FLOOR - 64, 0.4);
    F.pose({ arm: 'fwd', head: 'roar' });
    const z = F.zach('hurt', { flip: true });
    F.holdAt(z, 'fwd', 4, 22);
    yield 0.45;
    // dropped on his back
    F.release(z);
    z.rot = Math.PI / 2;
    z.x = bx + 40;
    z.y = FLOOR - 5;
    sfx.land();
    F.shake(2, 0.15);
    yield 0.3;
    F.pose({ legUp: 'stomp', arm: 'wide', armB: 'wide', head: 'roar' });
    sfx.whoosh();
    yield 0.6;
    // STOMP
    F.pose({ arm: 'down', armB: 'swing1', head: 'low' });
    F.remove(z);
    const flat = F.gib('flat', bx + 52, FLOOR - 2);
    sfx.splat();
    sfx.crunch();
    F.shake(9, 0.5);
    F.bleed(flat.x, FLOOR - 3, 34, { a0: -Math.PI + 0.1, a1: -0.1, s0: 120, s1: 300 });
    F.splatWall(flat.x, FLOOR - 26, 18, 44);
    F.pool(flat.x, 44);
    yield 1.0;
    // peeled off the floor
    F.pose({ arm: 'down', armB: 'down', head: 'low', drop: 12 });
    yield 0.25;
    sfx.rip();
    cs.tween(flat, { rot: -Math.PI / 2, y: FLOOR - 40, x: bx + 40 }, 0.6);
    yield 0.6;
    flat.wobble = 0.1;
    F.pose({ arm: 'fwd', armB: 'swing1', head: 'n' });
    yield 0.4;
    // onto the wall, in a frame
    cs.tween(flat, { x: bx + 44, y: FLOOR - 96 }, 0.45);
    yield 0.5;
    F.remove(flat);
    const frame = F.gib('framed', bx + 44, FLOOR - 96);
    sfx.stomp();
    yield 0.45;
    // squared up. Patted once.
    frame.rot = 0.06;
    sfx.click();
    yield 0.3;
    frame.rot = -0.03;
    sfx.click();
    yield 0.3;
    frame.rot = 0;
    sfx.click();
    yield 0.45;
    frame.y += 1;
    sfx.pat();
    yield 0.15;
    frame.y -= 1;
    F.stampIt('FRAMED.');
    yield* grief(F, cs, frame.x);
    yield* aftermath(F, cs, 'frame');
  }

  // 6. Held up like a phone book and torn down the middle. Over the shoulders; a flex.
  function* split(F, cs) {
    const bx = F.beast.x;
    F.camTo(1.6, bx + 26, FLOOR - 66, 0.4);
    F.pose({ arm: 'fwd', head: 'roar' });
    const z = F.zach('hurt', { flip: true });
    F.holdAt(z, 'fwd', 4, 22);
    yield 0.45;
    // turned sideways, both hands on him
    F.pose({ arm: 'fwd', armB: 'hold', head: 'roar' });
    F.remove(z);
    const cx = bx + 31;
    const cy = FLOOR - 52;
    const whole = F.zach('idle', { rot: -Math.PI / 2 });
    whole.x = cx + 17;
    whole.y = cy;
    sfx.roar(0.7);
    yield 0.4;
    // he pulls
    for (let i = 0; i < 3; i++) {
      whole.sx = 1.3;
      F.beast.jitter = i % 2 ? -1 : 1;
      sfx.stretch();
      F.shake(2, 0.2);
      yield 0.26;
      whole.sx = 1;
      F.beast.jitter = 0;
      yield 0.16;
    }
    // RRRIP
    F.remove(whole);
    sfx.rip();
    sfx.crack();
    sfx.splat();
    EC.fx.flash('#ff2b2b', 0.25);
    F.shake(7, 0.4);
    const front = F.gib('halfF', cx, cy - 6, { rot: -Math.PI / 2, half: 'front' });
    const back = F.gib('halfB', cx, cy + 6, { rot: -Math.PI / 2, half: 'back' });
    F.pose({ arm: 'up', armB: 'down', head: 'roar' });
    const up = F.hand('up');
    const dn = F.hand('down');
    cs.tween(front, { x: up.x + 2, y: up.y + 4, rot: -Math.PI / 2 - 0.5 }, 0.18, EC.ease.out);
    cs.tween(back, { x: dn.x + 4, y: dn.y - 4, rot: -Math.PI / 2 + 0.6 }, 0.18, EC.ease.out);
    F.fountain({ x: cx, y: cy, dur: 1.3, rate: 120, a: -Math.PI / 2, spread: 1.1, s0: 140, s1: 340 });
    F.gib('bone', cx, cy, { phys: true, vx: 70, vy: -380, vr: 18, bounce: 0.5 });
    F.gib('bone', cx, cy, { phys: true, vx: -50, vy: -300, vr: -16, bounce: 0.5 });
    F.splatWall(cx, cy - 20, 24, 50);
    yield 1.0;
    // over the shoulders
    F.camTo(1.25, bx - 18, FLOOR - 74, 0.5);
    F.pose({ arm: 'up', armB: 'up', head: 'roar' });
    sfx.whoosh();
    const arc = (p, x1, h, spin, dur) => {
      const x0 = p.x;
      const y0 = p.y;
      const r0 = p.rot;
      const t0 = cs.t;
      return () => {
        const k = Math.min(1, (cs.t - t0) / dur);
        p.x = EC.lerp(x0, x1, k);
        p.y = EC.lerp(y0, FLOOR - 7, k) - Math.sin(k * Math.PI) * h;
        p.rot = EC.lerp(r0, -Math.PI / 2 + spin, k);
        return k >= 1;
      };
    };
    const fa = arc(front, bx - 64, 70, -Math.PI * 2, 0.75);
    const fb = arc(back, bx - 96, 50, Math.PI * 2, 0.65);
    yield () => {
      const a = fa();
      const b = fb();
      return a && b;
    };
    sfx.land();
    sfx.splat();
    F.pool(bx - 64, 22);
    F.pool(bx - 96, 18);
    F.bleed(bx - 80, FLOOR - 8, 16, { s0: 60, s1: 180 });
    yield 0.3;
    // the flex
    F.pose({ arm: 'up', armB: 'up', head: 'roar' });
    sfx.roar(0.9);
    F.shake(3, 0.5);
    yield 1.1;
    F.pose({ arm: 'swing0', armB: 'swing1', head: 'n' });
    F.stampIt('SPLIT DECISION.');
    yield* grief(F, cs, bx - 112);
    yield* aftermath(F, cs, 'tape');
  }

  // 7. Squeezed until the head pops like a cork. The body takes a lap. The head blinks.
  function* popped(F, cs) {
    const bx = F.beast.x;
    F.camTo(1.6, bx + 40, FLOOR - 76, 0.4);
    F.pose({ arm: 'fwd', head: 'roar' });
    const z = F.zach('hurt', { flip: true });
    F.holdAt(z, 'fwd', 4, 22);
    yield 0.45;
    for (let i = 0; i < 3; i++) {
      z.sy = 0.82;
      z.sx = 1.12;
      sfx.squeak();
      F.shake(1.5, 0.1);
      yield 0.18;
      z.sx = z.sy = 1;
      yield 0.22;
    }
    F.remove(z);
    const body = F.gib('body', 0, 0, { flip: true });
    F.holdAt(body, 'fwd', 4, 6);
    const head = F.gib('headOk', 0, 0, { flip: true });
    F.holdAt(head, 'fwd', 4, -11);
    sfx.inflate();
    cs.tween(head, { sx: 1.7, sy: 1.7 }, 0.8, EC.ease.in);
    yield 0.8;
    // POP
    sfx.pop();
    sfx.splat();
    F.shake(5, 0.3);
    F.release(head);
    F.swap(head, 'head');
    head.sx = head.sy = 1;
    head.phys = true;
    head.vx = 260;
    head.vy = -640;
    head.vr = 18;
    head.bounce = 0.72;
    head.walls = true;
    head.onBounce = (p) => {
      sfx.ping();
      F.splatWall(p.x, Math.min(p.y, FLOOR - 6), 3, 4);
    };
    F.fountain({ follow: body, dx: 0, dy: -11, dur: 1.9, rate: 90, a: -Math.PI / 2, spread: 0.25, s0: 220, s1: 380 });
    yield 1.5;
    // headless, the body goes for a little walk
    F.release(body);
    F.pose({ arm: 'swing0', armB: 'swing1', head: 'n' });
    cs.tween(body, { y: FLOOR - 11, x: body.x + 10 }, 0.25);
    yield 0.3;
    for (let i = 0; i < 4; i++) {
      body.flip = i % 2 === 1;
      cs.tween(body, { x: body.x + (i % 2 ? -36 : 36) }, 0.42);
      F.bleed(body.x, body.y - 11, 4, { a0: -2, a1: -1.1 });
      yield 0.45;
    }
    cs.tween(body, { rot: Math.PI / 2, y: FLOOR - 6 }, 0.3);
    yield 0.32;
    sfx.land();
    F.pool(body.x, 22);
    yield 0.6;
    // the head, on the floor, blinks
    head.vx = 0;
    head.rot = 0;
    F.camTo(2.6, head.x, FLOOR - 16, 0.45);
    yield 0.5;
    F.swap(head, 'headBlink');
    yield 0.15;
    F.swap(head, 'head');
    yield 0.35;
    F.swap(head, 'headBlink');
    yield 0.15;
    F.swap(head, 'head');
    F.stampIt('POPPED.');
    yield* grief(F, cs, body.x);
    yield* aftermath(F, cs, 'head');
  }

  // 8. Pulled apart like a wishbone, in slow motion. He makes a wish.
  function* wishbone(F, cs) {
    const bx = F.beast.x;
    F.camTo(1.7, bx + 26, FLOOR - 76, 0.4);
    F.pose({ arm: 'wide', armB: 'wide', head: 'roar' });
    const z = F.zach('hurt');
    z.rot = Math.PI;
    F.holdAt(z, 'wide', -6, 2);
    yield 0.5;
    sfx.stretch();
    cs.tween(z, { sy: 1.4 }, 0.9, EC.ease.in);
    F.shake(1.5, 0.9);
    yield 0.9;
    // SNAP
    F.ts = 0.35;
    sfx.crack();
    sfx.rip();
    sfx.splat();
    EC.fx.flash('#ff2b2b', 0.25);
    const cx = z.x;
    const cy = z.y + 20;
    F.remove(z);
    F.gib('top', cx - 6, cy + 10, { phys: true, vx: -170, vy: -260, vr: -7, rot: Math.PI, bounce: 0.3, onLand: (p, hard) => hard && F.pool(p.x, 22) });
    F.gib('legs', cx + 6, cy - 6, { phys: true, vx: 200, vy: -320, vr: 9, rot: Math.PI, bounce: 0.3, onLand: (p, hard) => hard && F.pool(p.x, 16) });
    F.gib('bone', cx, cy, { phys: true, vx: 40, vy: -420, vr: 20, bounce: 0.5 });
    F.fountain({ x: cx, y: cy, dur: 1.4, rate: 110, a: -Math.PI / 2, spread: 0.9, s0: 160, s1: 360 });
    F.splatWall(cx, cy, 26, 50);
    yield 0.55;
    F.ts = 1;
    F.pose({ arm: 'swing0', armB: 'swing1', head: 'n' });
    yield 1.2;
    // he makes a wish
    F.pose({ arm: 'hold', armB: 'swing1', head: 'n' });
    F.sparkle(bx + 30, FLOOR - 52);
    sfx.wish();
    yield 1.0;
    F.stampIt('WISHBONED.');
    yield* grief(F, cs, F.messX());
    yield* aftermath(F, cs, 'mop');
  }

  // 9. Helicoptered by the ankle until things come off. One of them hits the camera. He tidies up.
  function* tidied(F, cs) {
    const bx = F.beast.x;
    F.camTo(1.25, bx + 30, FLOOR - 84, 0.4);
    F.pose({ arm: 'up', armB: 'swing1', head: 'roar' });
    const z = F.zach('hurt');
    z.rot = Math.PI;
    F.holdAt(z, 'up', 0, 0);
    z.spin = 2;
    cs.tween(z, { spin: 34 }, 1.6, EC.ease.in);
    const flung = [];
    const fling = (name) => {
      const a = z.rot + Math.PI / 2;
      const px = z.x + Math.cos(a) * 26;
      const py = z.y + Math.sin(a) * 26;
      const p = F.gib(name, px, py, { phys: true, vx: Math.cos(a) * 320, vy: Math.sin(a) * 320 - 120, vr: 14, bounce: 0.35 });
      F.bleed(px, py, 10, { s0: 80, s1: 260 });
      F.splatWall(px, py, 6, 30);
      flung.push(p);
      sfx.rip();
    };
    for (let i = 0; i < 8; i++) {
      sfx.whoosh();
      if (i === 3) fling('shoe');
      if (i === 5) fling('arm');
      if (i === 6) fling('arm');
      if (i === 7) fling('leg');
      yield 0.3 - i * 0.022;
    }
    // the rest lets go, straight at the camera
    F.remove(z);
    F.fountain({ x: F.hand('up').x, y: F.hand('up').y, dur: 0.6, rate: 120, spread: Math.PI, s0: 100, s1: 300 });
    yield 0.1;
    sfx.thwack();
    sfx.splat();
    F.shake(6, 0.3);
    const splats = [];
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = EC.rand(10, 70);
      splats.push({ x: 300 + Math.cos(a) * r * 1.3, y: 110 + Math.sin(a) * r, w: EC.rand(3, 12), h: EC.rand(3, 10), c: EC.pick(RED), k: EC.rand(0.3, 1), drip: Math.random() < 0.4 ? EC.rand(4, 20) : 0 });
    }
    F.glass = { t: 0, x: 300, y: 110, sx: 6, sy: 5.2, splats };
    F.gib('torso', bx + 50, FLOOR - 60, { phys: true, vx: 60, vy: -60, vr: 6, bounce: 0.3 });
    F.gib('leg', bx + 40, FLOOR - 60, { phys: true, vx: -40, vy: -100, vr: -8, bounce: 0.3 });
    F.pose({ arm: 'swing0', armB: 'swing1', head: 'n' });
    yield 1.6;
    // and then he tidies up
    F.pose({ arm: 'down', armB: 'down', head: 'low', drop: 12 });
    const stack = F.pieces.slice();
    const sx = bx + 48;
    let sy = FLOOR;
    stack.forEach((p, i) => {
      p.phys = false;
      p.vr = 0;
      const h = p.spr.h - 2;
      sy -= h * 0.5;
      cs.tween(p, { x: sx + (i % 2 ? 1 : -1), y: sy, rot: Math.PI / 2 * (i % 2) }, 0.3 + i * 0.12);
      sy -= h * 0.5;
    });
    yield 0.6 + stack.length * 0.12;
    F.pose({ arm: 'swing0', armB: 'swing1', head: 'n' });
    sfx.click();
    yield 0.35;
    sfx.pat();
    F.stampIt('TIDIED UP.');
    yield* grief(F, cs, sx);
    yield* aftermath(F, cs, 'wipe');
  }

  // 10. Punched to pieces, juggled, slam-dunked. Gary from church scores it.
  function* flawless(F, cs) {
    const bx = F.beast.x;
    F.camTo(1.0, bx + 30, EC.H / 2, 0.3);
    F.pose({ arm: 'fwd', head: 'roar' });
    const z = F.zach('hurt', { flip: true });
    F.holdAt(z, 'fwd', 4, 22);
    yield 0.35;
    F.release(z, 0, -720);
    z.vr = 8;
    F.pose({ arm: 'up', armB: 'up', head: 'roar' });
    sfx.whoosh();
    yield 0.62;
    // a flurry
    for (let i = 0; i < 9; i++) {
      F.pose(i % 2 ? { arm: 'wide', armB: 'swing1', head: 'roar' } : { arm: 'swing1', armB: 'wide', head: 'roar' });
      sfx.hit();
      F.shake(3, 0.08);
      F.bleed(z.x, z.y - 16, 7, { s0: 60, s1: 200 });
      z.vy = Math.min(z.vy, -40);
      z.vx = (z.x < bx + 30 ? 30 : -30);
      yield 0.085;
    }
    // into pieces, and up they go
    const cx = z.x;
    const cy = z.y - 16;
    F.remove(z);
    sfx.splat();
    sfx.crunch();
    F.bleed(cx, cy, 40, { a0: -Math.PI, a1: Math.PI, s0: 80, s1: 300 });
    F.splatWall(cx, cy, 30, 70);
    const names = ['head', 'torso', 'arm', 'leg', 'arm', 'leg', 'bone', 'shoe', 'bone'];
    const parts = names.map((n, i) => F.gib(n, cx, cy, { orbit: { cx: bx + 26, cy: FLOOR - 128, r: 34, a: (i / names.length) * Math.PI * 2, w: 6 } }));
    F.pose({ arm: 'up', armB: 'wide', head: 'roar' });
    for (let i = 0; i < 10; i++) {
      F.pose(i % 2 ? { arm: 'up', armB: 'wide', head: 'roar' } : { arm: 'wide', armB: 'up', head: 'roar' });
      if (i % 2) sfx.boing();
      parts.forEach((p) => (p.orbit.w = 6 + i * 0.9));
      yield 0.17;
    }
    // SLAM DUNK
    F.pose({ arm: 'down', armB: 'down', head: 'low', drop: 12 });
    parts.forEach((p) => {
      p.orbit = null;
      p.phys = true;
      p.vx = EC.rand(-260, 260);
      p.vy = EC.rand(-520, -200);
      p.vr = EC.rand(-20, 20);
      p.bounce = 0.4;
    });
    F.crater(bx + 30);
    sfx.smash();
    sfx.thunder();
    F.shake(11, 1.1);
    EC.fx.flash('#ffffff', 0.3);
    F.fountain({ x: bx + 30, y: FLOOR - 4, dur: 2.2, rate: 170, a: -Math.PI / 2, spread: 0.3, s0: 300, s1: 520 });
    F.splatWall(bx + 30, FLOOR - 80, 50, 120);
    F.L.smoke = 5;
    sfx.beeps(10, 0.3);
    cs.tween(F, { red: 0.42 }, 1.8, EC.ease.out);
    yield 1.7;
    // Gary from church rises
    cs.tween(F, { gary: 1 }, 0.5, EC.ease.outBack);
    sfx.organ();
    sfx.cheer();
    yield 1.9;
    F.stampIt('FLAWLESS.');
    yield* grief(F, cs, bx + 30);
    yield* aftermath(F, cs, 'score');
  }

  const LIST = [
    { name: 'LAWN DARTED.', script: lawnDart },
    { name: 'RECLINED.', script: reclined },
    { name: 'LEFTOVERS.', script: eaten },
    { name: 'PUNTED.', script: punted },
    { name: 'FRAMED.', script: framed },
    { name: 'SPLIT DECISION.', script: split },
    { name: 'POPPED.', script: popped },
    { name: 'WISHBONED.', script: wishbone },
    { name: 'TIDIED UP.', script: tidied },
    { name: 'FLAWLESS.', script: flawless },
  ];

  // Each catch is the next one on the list for this session; after the last, he picks.
  let session = 0;
  EC.fatalities = {
    count: LIST.length,
    create(level) {
      const idx = session < LIST.length ? session : (Math.random() * LIST.length) | 0;
      session++;
      // remembered by name, so reordering the list doesn't muddle the count
      const seen = EC.store.get('deathsSeen', []).filter((n) => typeof n === 'string');
      if (seen.indexOf(LIST[idx].name) < 0) {
        seen.push(LIST[idx].name);
        EC.store.set('deathsSeen', seen);
      }
      return new Fatal(level, idx);
    },
    seen() {
      return EC.store.get('deathsSeen', []).filter((n) => LIST.some((d) => d.name === n)).length;
    },
  };
})();

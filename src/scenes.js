/* Eddie's Couch 2 — the cutscene runner and the scripted scenes (intro, title card, ending). The story is acted, not narrated. */
(function () {
  'use strict';
  const EC = window.EC;
  const art = EC.art;
  const paint = EC.paint;
  const C = EC.C;
  const R = art.R;
  const sfx = EC.audio.sfx;
  const ui = EC.ui;

  EC.FONT = {
    display: '"Bungee", "Arial Black", Impact, sans-serif',
    ui: '"Pixelify Sans", "Trebuchet MS", Verdana, sans-serif',
  };
  const NAMES = { zach: 'ZACH', alex: 'ALEX', dad: 'DAD', beast: "GIRLFRIEND'S DAD BEAST", phone: 'UNKNOWN NUMBER' };

  // ================================================================ runner
  // A script is a generator. It yields a number (seconds), 'line' (wait for the reader), or a function (wait until true).
  class Cutscene {
    constructor(script, scene, arg) {
      this.scene = scene;
      this.tweens = [];
      this.t = 0;
      this.typer = null;
      this.done = false;
      this.gen = script(scene, this, arg);
      this.advance();
    }
    advance() {
      const r = this.gen.next();
      this.wait = r.done ? null : r.value;
      this.waitStart = this.t;
      if (r.done) this.done = true;
    }
    tween(obj, to, dur, ease) {
      const from = {};
      Object.keys(to).forEach((k) => (from[k] = obj[k]));
      this.tweens = this.tweens.filter((tw) => tw.obj !== obj || !Object.keys(to).some((k) => k in tw.to));
      this.tweens.push({ obj, from, to, dur: Math.max(0.0001, dur), t: 0, ease: ease || EC.ease.inOut });
    }
    update(dt) {
      this.t += dt;
      this.tweens = this.tweens.filter((tw) => {
        tw.t = Math.min(tw.dur, tw.t + dt);
        const k = tw.ease(tw.t / tw.dur);
        Object.keys(tw.to).forEach((p) => (tw.obj[p] = EC.lerp(tw.from[p], tw.to[p], k)));
        return tw.t < tw.dur;
      });
      ui.dialog.update(dt);
      const confirm = EC.input.pressed.confirm;
      let used = false;
      if (confirm && this.typer && this.typer.active && !this.typer.done) {
        this.typer.confirm();
        used = true;
      }
      let guard = 0;
      while (!this.done && guard++ < 50) {
        const w = this.wait;
        if (typeof w === 'number') {
          if (this.t - this.waitStart >= w) this.advance();
          else break;
        } else if (w === 'line') {
          if (confirm && !used && this.typer && this.typer.done) {
            used = true;
            sfx.select();
            this.advance();
          } else break;
        } else if (typeof w === 'function') {
          if (w()) this.advance();
          else break;
        } else this.advance();
      }
    }
  }
  EC.Cutscene = Cutscene;

  // ================================================================ speaker portraits
  function poseOf(a, fallback) {
    if (!a || a.to != null || !a.pose) return fallback;
    return a.pose;
  }
  function portrait(who, S) {
    if (who === 'zach') {
      const spr = art.zach(poseOf(S.zach, 'grin'), 0);
      return { img: spr.img, x: 6, y: 3, w: 16, h: 16 };
    }
    if (who === 'alex') {
      const p = poseOf(S.alex, 'smile');
      if (p === 'kneel') return { img: art.alex('kneel').img, x: 4, y: 6, w: 16, h: 16 };
      return { img: art.alex(p, 0).img, x: 4, y: 4, w: 16, h: 16 };
    }
    if (who === 'dad' && S.dad) {
      const d = S.dad;
      if (d.mode === 'seat') return { img: art.dadSeated({ remote: d.remote, glasses: d.glasses, eyes: d.eyes }).img, x: 23, y: 1, w: 18, h: 18 };
      return { img: art.dadStand({ pose: d.pose, buttons: d.buttons, glasses: d.glasses, eyes: d.eyes, stache: d.stache }).img, x: 11, y: 0, w: 18, h: 18 };
    }
    if (who === 'beast') return { img: art.beastFront({ roar: true }).img, x: 22, y: 0, w: 40, h: 40 };
    if (who === 'phone') return { img: art.prop('phone').img, x: 0, y: 0, w: 7, h: 10 };
    return null;
  }

  function showSay(cs, who, text, o) {
    o = o || {};
    if (o.cam !== 'keep') shot(cs.scene, o.cam || SHOT_FOR[who] || 'wide');
    ui.dialog.show(text, {
      who,
      label: o.label || NAMES[who],
      voice: o.voice || who,
      loud: o.loud,
      muffled: o.muffled,
      speed: o.speed,
      portrait: portrait(who, cs.scene),
    });
    cs.typer = ui.dialog;
  }
  function* say(cs, who, text, o) {
    showSay(cs, who, text, o);
    yield 'line';
    ui.dialog.hide();
  }

  // ================================================================ cameras
  const SHOT_FOR = { dad: 'dad', zach: 'two', alex: 'two', beast: 'beast' };
  function shotTarget(S, name) {
    const d = S.dad;
    const c = { x: EC.W / 2, y: EC.H / 2, z: 1 };
    if (name === 'dad') Object.assign(c, { x: d.x + 22, y: FY - 32, z: 2 });
    else if (name === 'two') Object.assign(c, { x: (S.zach.x + S.alex.x) / 2 - 6, y: FY - 32, z: 2 });
    else if (name === 'beast') Object.assign(c, { x: d.x + 34, y: FY - 64, z: 1.5 });
    else if (name === 'clock') Object.assign(c, { x: 50, y: 124, z: 2.5 });
    else if (name === 'table') Object.assign(c, { x: 150, y: 166, z: 3 });
    const hw = EC.W / 2 / c.z;
    const hh = EC.H / 2 / c.z;
    c.x = EC.clamp(c.x, hw, EC.W - hw);
    c.y = EC.clamp(c.y, hh, EC.H - hh);
    return c;
  }
  // A film cut.
  function shot(S, name) {
    if (!S.cam || S.view !== 'living') return;
    Object.assign(S.cam, shotTarget(S, name));
  }
  // A slow camera move.
  function pan(cs, name, dur) {
    const S = cs.scene;
    cs.tween(S.cam, shotTarget(S, name), dur, EC.ease.inOut);
  }

  // ================================================================ the living room
  const FY = 206;
  const TOP = 22;
  let livingBg = null;
  function buildLiving() {
    const c = art.canvasOf(EC.W, EC.H);
    const g = c.getContext('2d');
    paint.ceiling(g, 0, EC.W, TOP);
    paint.wall(g, 0, EC.W, 'living', TOP, FY);
    paint.floorWood(g, 0, EC.W, FY, EC.H - FY);
    // braided rug
    const rug = ['#8a3b2f', '#c7a35a', '#3f5f7a', '#8a3b2f', '#c7a35a'];
    for (let i = 0; i < 5; i++) R(g, 112 + i * 6, 212 + i * 3, 190 - i * 12, 26 - i * 6, rug[i]);
    paint.window(g, 290, 62, 54, 66, { curtain: '#6e2a33', sky: '#3b2b55' });
    paint.frame(g, 158, 62, 48, 24, 'stitch', C.wood);
    paint.frame(g, 232, 82, 20, 24, 'brandon');
    paint.frame(g, 362, 84, 18, 16, 'wedding');
    paint.frame(g, 76, 66, 26, 20, 'mountain', C.wood);
    paint.frame(g, 258, 112, 14, 12, 'dog');
    paint.grandfatherClock(g, 30, FY, 118);
    // end table and lamp
    R(g, 114, 176, 34, 4, C.woodL);
    R(g, 114, 179, 34, 1, C.woodS);
    R(g, 116, 180, 30, 6, C.wood);
    R(g, 117, 186, 3, 20, C.woodS);
    R(g, 142, 186, 3, 20, C.woodS);
    paint.lamp(g, 124, 176);
    // front door frame
    R(g, 395, 117, 42, 4, '#efe7d6');
    R(g, 395, 117, 4, FY - 117, '#efe7d6');
    R(g, 433, 117, 4, FY - 117, '#efe7d6');
    paint.smokeDetector(g, 240, TOP);
    paint.smokeDetector(g, 420, TOP);
    livingBg = c;
  }

  function newLivingScene() {
    return {
      view: 'living',
      t: 0,
      clock: { run: true, t: 0, last: 0, ang: 0, min: 0.6, hour: 2.4, fast: 0 },
      door: 0,
      zach: { x: 452, face: -1, pose: 'grin', frame: 0, visible: false, to: null, speed: 70, hat: true, tilt: 0, arrived: false, dist: 0 },
      alex: { x: 470, face: -1, pose: 'smile', frame: 0, visible: false, to: null, speed: 70, hat: true, tilt: 0, arrived: false, dist: 0 },
      dad: { mode: 'seat', x: 182, remote: true, glasses: true, eyes: 'calm', pose: 'down', buttons: 4, sy: 1, grow: 0, stache: false, stomp: false, roar: false },
      horn: 0,
      remote: null,
      glassesItem: null,
      dim: 0,
      lamp: 1,
      lightning: 0,
      recliner: 'ok',
      smoke: 0,
      gary: 0,
      hatFly: null,
      parts: new EC.Particles(),
      black: 0,
      blinkT: 0,
      title: null,
      power: null,
      cam: { x: EC.W / 2, y: EC.H / 2, z: 1 },
    };
  }

  function walkTo(a, x, speed) {
    a.to = x;
    a.arrived = false;
    if (speed) a.speed = speed;
  }
  function stepActor(a, dt) {
    if (a.to == null) return;
    const d = a.to - a.x;
    if (Math.abs(d) < 1) {
      a.x = a.to;
      a.to = null;
      a.arrived = true;
      return;
    }
    a.face = d > 0 ? 1 : -1;
    const mv = Math.min(Math.abs(d), a.speed * dt);
    a.x += Math.sign(d) * mv;
    a.dist += mv;
    a.frame = Math.floor(a.dist / 6) & 3;
  }

  function updateLiving(S, dt) {
    S.t += dt;
    stepActor(S.zach, dt);
    stepActor(S.alex, dt);
    const ck = S.clock;
    if (ck.fast) {
      // time-lapse: the hands race, Dad does not move
      ck.t += dt;
      ck.min += dt * 26;
      ck.hour += (dt * 26) / 12;
      ck.ang = Math.sin(ck.t * Math.PI * 9) * 0.34;
      const beat = Math.floor(ck.t * 9);
      if (beat !== ck.last) {
        ck.last = beat;
        sfx.tick(beat & 1);
      }
    } else if (ck.run) {
      ck.t += dt;
      ck.min += dt * 0.004;
      ck.ang = Math.sin(ck.t * Math.PI * 1.6) * 0.32;
      const beat = Math.floor(ck.t * 1.6);
      if (beat !== ck.last) {
        ck.last = beat;
        sfx.tick(beat & 1);
      }
    } else ck.ang *= Math.pow(0.03, dt);
    if (S.hatFly) {
      const h = S.hatFly;
      h.vy += 520 * dt;
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.rot += h.vr * dt;
      if (h.y > 320) S.hatFly = null;
    }
    if (S.smoke > 0) S.smoke -= dt;
    if (S.lightning > 0) S.lightning -= dt;
    S.parts.update(dt);
    // He blinks, rarely.
    if (S.dad.mode === 'seat' && S.view === 'living') {
      S.blinkT += dt;
      if (S.blinkT > 4.2 && S.dad.eyes === 'calm') {
        S.dad.eyes = 'blink';
        S.blinkUntil = S.t + 0.14;
        S.blinkT = 0;
      }
      if (S.blinkUntil && S.t > S.blinkUntil) {
        if (S.dad.eyes === 'blink') S.dad.eyes = 'calm';
        S.blinkUntil = 0;
      }
    }
  }

  function drawActor(g, a, kind) {
    if (!a.visible) return;
    const spr = kind === 'zach' ? art.zach(a.to != null ? 'walk' : a.pose, a.frame) : art.alex(a.to != null ? 'walk' : a.pose, a.frame);
    const flip = a.face < 0;
    art.put(g, spr, a.x, FY, { flip });
    if (a.hat && a.pose !== 'kneel') {
      const at = kind === 'zach' ? art.zachHatAt : art.alexHatAt;
      const bob = a.to != null && a.frame & 1 ? 1 : 0;
      art.put(g, art.hat(kind), a.x + at.x * a.face, FY + at.y + bob, { rot: a.tilt * a.face });
    } else if (a.hat && a.pose === 'kneel') {
      art.put(g, art.hat(kind), a.x + 1 * a.face, FY - 26, { rot: 0.2 * a.face });
    }
  }

  function drawDoor(g, open) {
    const x = 399;
    const y = 121;
    const w = 34;
    const h = FY - y;
    if (open > 0.05) {
      R(g, x, y, w, h, '#120d1c');
      R(g, x, y + h - 20, w, 20, '#1d2a1a');
      art.glow(g, x + w / 2, y + 14, 26, 'rgba(255,214,140,0.5)');
      R(g, x, y, Math.max(3, Math.round(w * (1 - open))), h, C.woodS);
    } else {
      R(g, x, y, w, h, C.wood);
      R(g, x + 4, y + 6, w - 8, 24, C.woodS);
      R(g, x + 6, y + 8, w - 12, 20, '#e7c46a');
      R(g, x + 4, y + 38, w - 8, h - 44, C.woodS);
      R(g, x + 5, y + 39, w - 10, h - 46, C.wood);
      R(g, x + w - 7, y + 46, 3, 4, C.brass);
    }
  }

  function drawClockHands(g, S) {
    const cx = 43;
    const cy = FY - 118 + 22;
    const hand = (ang, len) => {
      g.save();
      g.translate(cx, cy);
      g.rotate(ang);
      g.fillStyle = C.ink;
      g.fillRect(-0.5, -len, 1.2, len);
      g.restore();
    };
    hand(S.clock.hour, 4);
    hand(S.clock.min, 6.5);
    R(g, cx - 1, cy - 1, 2, 2, C.brassS);
  }

  // Gary, at church, feels it.
  function drawGary(g, S) {
    if (S.gary <= 0) return;
    g.save();
    g.globalAlpha = Math.min(1, S.gary);
    const x = 318;
    const y = 104;
    const w = 150;
    const h = 92;
    R(g, x - 2, y - 2, w + 4, h + 4, C.ink);
    R(g, x, y, w, h, '#4a3a5a');
    // stained glass
    R(g, x + 14, y + 6, 46, 44, '#2a2033');
    const glassC = ['#c8434a', '#3d6fc4', '#e2b84a', '#5f8a5a'];
    for (let i = 0; i < 12; i++) R(g, x + 16 + (i % 4) * 11, y + 8 + Math.floor(i / 4) * 14, 9, 12, glassC[(i + Math.floor(i / 4)) % 4]);
    R(g, x + 14, y + 4, 46, 3, '#2a2033');
    art.glow(g, x + 37, y + 28, 40, 'rgba(255,220,160,0.25)');
    // the pew
    R(g, x, y + 62, w, 30, '#5a3419');
    R(g, x, y + 60, w, 3, '#7a4a2a');
    R(g, x, y + 74, w, 2, '#3e2312');
    // Gary
    const gx = x + 104;
    const gy = y + 62;
    R(g, gx - 9, gy - 22, 18, 22, '#3a5a8a');
    R(g, gx - 6, gy - 22, 12, 22, '#c9a26e');
    R(g, gx - 6, gy - 36, 12, 14, C.skin);
    R(g, gx - 6, gy - 33, 2, 6, C.dHairS);
    R(g, gx + 4, gy - 33, 2, 6, C.dHairS);
    R(g, gx - 4, gy - 31, 3, 2, C.glass);
    R(g, gx + 1, gy - 31, 3, 2, C.glass);
    const worried = S.gary > 0.5 && Math.floor(S.t * 3) % 2;
    R(g, gx - 2, gy - 26, 4, worried ? 2 : 1, worried ? C.mouth : C.skinD);
    // the cup, rippling
    R(g, gx + 9, gy - 16, 9, 11, '#f4f1ea');
    R(g, gx + 6, gy - 13, 4, 3, C.skin);
    const t = S.t * 3;
    for (let i = 0; i < 3; i++) {
      const rr = ((t + i / 3) % 1) * 4;
      g.strokeStyle = 'rgba(90,52,25,' + (1 - rr / 4) + ')';
      g.lineWidth = 0.6;
      g.beginPath();
      g.ellipse(gx + 13.5, gy - 15, rr + 0.5, (rr + 0.5) * 0.4, 0, 0, Math.PI * 2);
      g.stroke();
    }
    R(g, gx + 10, gy - 16, 7, 1, '#6b3a1c');
    g.restore();
  }

  function drawLiving(g, S) {
    if (!livingBg) buildLiving();
    const cam = S.cam;
    g.save();
    g.translate(EC.W / 2, EC.H / 2);
    g.scale(cam.z, cam.z);
    g.translate(-cam.x, -cam.y);
    g.drawImage(livingBg, 0, 0);
    // lightning through the window
    if (S.lightning > 0) {
      g.globalAlpha = Math.min(1, S.lightning * 4) * (EC.reducedMotion ? 0.4 : 0.9);
      R(g, 290, 62, 54, 66, '#eef3ff');
      g.globalAlpha = 1;
    }
    // pendulum and hands
    g.save();
    g.translate(43, 128);
    g.rotate(S.clock.ang);
    R(g, -1, 0, 2, 36, C.brassS);
    art.disc(g, 0, 38, 4, C.brass);
    g.restore();
    drawClockHands(g, S);
    // lamp glow
    if (S.lamp > 0) art.glow(g, 124, 164, 46, 'rgba(255,214,140,0.35)', S.lamp);
    drawDoor(g, S.door);
    if (S.remote) art.put(g, art.prop('remoteFlat'), S.remote.x, S.remote.y);
    if (S.glassesItem) art.put(g, art.prop('glasses'), S.glassesItem.x, S.glassesItem.y);
    // recliner / dad / beast
    const d = S.dad;
    if (d.mode === 'seat') art.put(g, art.dadSeated({ remote: d.remote, glasses: d.glasses, eyes: d.eyes }), d.x, FY);
    else {
      if (S.recliner !== 'gone') art.put(g, art.recliner(S.recliner === 'crushed'), 182, FY);
      if (d.mode === 'stand') art.put(g, art.dadStand({ pose: d.pose, buttons: d.buttons, glasses: d.glasses, eyes: d.eyes, stache: d.stache }), d.x, FY, { sy: d.sy });
      else if (d.mode === 'grow') {
        const k = d.grow;
        const flick = Math.floor(S.t * 14) % 3 === 0;
        if (k < 0.5 && flick) art.put(g, art.dadStand({ pose: 'down', buttons: 0, glasses: false, eyes: 'glow', stache: true }), d.x, FY, { sx: 1 + k * 0.6, sy: 1.1 + k * 0.5 });
        else art.put(g, art.beastFront({}), d.x, FY, { sx: 0.45 + k * 0.55, sy: 0.5 + k * 0.5 });
      } else if (d.mode === 'beast') {
        const spr = art.beastFront({ roar: d.roar, stomp: d.stomp });
        art.put(g, spr, d.x, FY);
        const flicker = 0.75 + Math.sin(S.t * 9) * 0.15;
        art.beastFrontEyes.forEach(([ex, ey]) => art.glow(g, d.x + ex, FY + ey, 9, 'rgba(255,43,43,0.9)', flicker));
      }
    }
    if (d.mode === 'stand' && d.eyes === 'glow') {
      art.glow(g, d.x - 3, FY - 51 * d.sy + 8 * d.sy, 6, 'rgba(255,43,43,0.9)', 0.9);
      art.glow(g, d.x + 3, FY - 51 * d.sy + 8 * d.sy, 6, 'rgba(255,43,43,0.9)', 0.9);
    }
    // coffee table, in front
    R(g, 158, 194, 50, 4, C.woodL);
    R(g, 158, 197, 50, 1, C.woodS);
    R(g, 160, 198, 46, 4, C.wood);
    R(g, 161, 198, 3, 10, C.woodS);
    R(g, 202, 198, 3, 10, C.woodS);
    R(g, 168, 190, 10, 4, '#3d6fc4');
    R(g, 169, 189, 8, 1, '#f4f1ea');
    drawActor(g, S.alex, 'alex');
    drawActor(g, S.zach, 'zach');
    // party horn
    if (S.horn > 0.02) {
      const z = S.zach;
      const sx = z.x + 4 * z.face;
      const sy = FY - 21;
      const ex = EC.lerp(sx, S.dad.x + 6, S.horn);
      const ey = EC.lerp(sy, FY - 42, S.horn);
      const n = Math.max(1, Math.round(Math.hypot(ex - sx, ey - sy) / 3));
      for (let i = 0; i < n; i++) {
        const t = i / n;
        R(g, Math.round(EC.lerp(sx, ex, t)), Math.round(EC.lerp(sy, ey, t)) - 1, 3, 3, i % 2 ? C.yellow : C.pink);
      }
      R(g, Math.round(ex) - 1, Math.round(ey) - 2, 4, 4, C.pink);
    }
    S.parts.draw(g, 0);
    if (S.hatFly) art.put(g, art.hat('zach'), S.hatFly.x, S.hatFly.y, { rot: S.hatFly.rot });
    if (S.smoke > 0 && Math.floor(S.smoke * 3) % 2 === 0) {
      g.globalAlpha = EC.reducedMotion ? 0.08 : 0.16;
      g.fillStyle = '#ff2b2b';
      g.fillRect(-EC.W, -EC.H, EC.W * 3, EC.H * 3);
      g.globalAlpha = 1;
      art.glow(g, 240, TOP - 4, 14, 'rgba(255,60,60,1)');
      art.glow(g, 420, TOP - 4, 14, 'rgba(255,60,60,1)');
    }
    if (S.dim > 0) {
      g.globalAlpha = S.dim;
      g.fillStyle = '#05030a';
      g.fillRect(-EC.W, -EC.H, EC.W * 3, EC.H * 3);
      g.globalAlpha = 1;
      if (S.dad.eyes === 'glow' && d.mode === 'stand') {
        art.glow(g, d.x - 3, FY - 51 * d.sy + 8 * d.sy, 7, 'rgba(255,43,43,1)', 1);
        art.glow(g, d.x + 3, FY - 51 * d.sy + 8 * d.sy, 7, 'rgba(255,43,43,1)', 1);
      }
    }
    g.restore();
    drawGary(g, S);
  }

  // ================================================================ title card
  function drawTitle(g, S) {
    const T = S.title;
    g.fillStyle = '#07050a';
    g.fillRect(0, 0, EC.W, EC.H);
    const grd = g.createRadialGradient(240, 300, 10, 240, 300, 260);
    grd.addColorStop(0, 'rgba(255,43,43,' + 0.35 * T.alpha + ')');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, EC.W, EC.H);
    g.save();
    g.globalAlpha = T.alpha;
    g.textBaseline = 'alphabetic';
    g.font = '400 34px ' + EC.FONT.display;
    const w1 = g.measureText("EDDIE'S COUCH").width;
    g.font = '400 70px ' + EC.FONT.display;
    const w2 = g.measureText('2').width;
    const total = w1 + 10 + w2;
    const x0 = 240 - total / 2;
    const y1 = 122;
    g.textAlign = 'left';
    g.font = '400 34px ' + EC.FONT.display;
    g.fillStyle = C.ink;
    g.fillText("EDDIE'S COUCH", x0 + 3, y1 + 3);
    g.fillStyle = '#f4e7c9';
    g.fillText("EDDIE'S COUCH", x0, y1);
    g.font = '400 70px ' + EC.FONT.display;
    const x2 = x0 + w1 + 10;
    g.fillStyle = C.ink;
    g.fillText('2', x2 + 4, y1 + 4);
    g.fillStyle = '#ff3b30';
    g.fillText('2', x2, y1);
    T.hatTargetX = x2 + w2 / 2 + 2;
    T.hatTargetY = y1 - 50;
    g.font = '700 17px ' + EC.FONT.ui;
    g.textAlign = 'center';
    g.fillStyle = '#e2b84a';
    g.fillText('M E E T   T H E   F A T H E R', 240, y1 + 34);
    g.restore();
    if (T.hatOn) {
      art.put(g, art.hat('zach'), T.hatX, T.hatY, { rot: T.hatRot, sx: 3, sy: 3 });
    }
  }

  // ================================================================ the front lawn (ending)
  const LY = 214;
  let lawnBg = null;
  function buildLawn() {
    const c = art.canvasOf(EC.W, EC.H);
    const g = c.getContext('2d');
    const sky = g.createLinearGradient(0, 0, 0, LY);
    sky.addColorStop(0, '#0d1026');
    sky.addColorStop(1, '#2c2a52');
    g.fillStyle = sky;
    g.fillRect(0, 0, EC.W, LY);
    for (let i = 0; i < 60; i++) R(g, (i * 97) % 480, (i * 53) % 90, 1, 1, i % 5 ? '#c9cbe8' : '#ffffff');
    art.disc(g, 418, 36, 12, '#f7efd2');
    art.disc(g, 414, 33, 3, '#e3d9b6');
    // house
    R(g, 40, 70, 330, LY - 70, '#d8c98f');
    for (let y = 74; y < LY; y += 6) R(g, 40, y, 330, 1, '#b9aa72');
    R(g, 28, 58, 354, 14, '#4a3a3a');
    R(g, 20, 54, 370, 6, '#3a2a2a');
    // windows, warm
    [[70, 96], [290, 96]].forEach(([x, y]) => {
      R(g, x - 3, y - 3, 46, 46, '#f4f1ea');
      R(g, x, y, 40, 40, '#f2c46a');
      R(g, x + 19, y, 2, 40, '#f4f1ea');
      R(g, x, y + 19, 40, 2, '#f4f1ea');
      R(g, x - 8, y - 3, 6, 46, '#3a5a3a');
      R(g, x + 42, y - 3, 6, 46, '#3a5a3a');
    });
    // a silhouette in the left window
    R(g, 80, 112, 8, 8, '#8a5a2a');
    R(g, 78, 120, 12, 18, '#8a5a2a');
    // porch
    R(g, 150, 196, 130, 6, '#9a8a6a');
    R(g, 150, 202, 130, 12, '#7a6a4a');
    R(g, 196, 202, 40, 4, '#b9a98a');
    R(g, 192, 208, 48, 6, '#b9a98a');
    R(g, 150, 150, 4, 46, '#f4f1ea');
    R(g, 276, 150, 4, 46, '#f4f1ea');
    R(g, 146, 146, 138, 6, '#f4f1ea');
    for (let x = 156; x < 196; x += 7) R(g, x, 176, 2, 20, '#f4f1ea');
    for (let x = 240; x < 276; x += 7) R(g, x, 176, 2, 20, '#f4f1ea');
    R(g, 154, 174, 42, 3, '#f4f1ea');
    R(g, 236, 174, 40, 3, '#f4f1ea');
    // door frame
    R(g, 196, 116, 40, 80, '#f4f1ea');
    // lawn & path
    R(g, 0, LY, EC.W, EC.H - LY, '#2f4a2a');
    for (let x = 0; x < EC.W; x += 3) R(g, x, LY - 1 - ((x * 7) % 3), 1, 2 + ((x * 7) % 3), '#3c5c34');
    for (let i = 0; i < 6; i++) R(g, 200 - i * 4, LY + i * 9, 32 + i * 8, 8, '#9a9488');
    // mailbox & lamp post
    R(g, 412, 170, 3, 44, '#3a2a1a');
    R(g, 404, 160, 20, 12, '#2a3a5a');
    R(g, 422, 156, 2, 8, '#d8433a');
    R(g, 26, 120, 3, 94, '#2a2a30');
    R(g, 20, 112, 15, 10, '#2a2a30');
    lawnBg = c;
  }
  function newLawnScene() {
    return {
      view: 'lawn',
      t: 0,
      door: 1,
      porch: 1,
      beast: 0,
      beastLook: '',
      zach: { x: 216, y: 196, face: 1, pose: 'hurt', rot: 0, visible: true, gift: false },
      phone: 0,
      black: 1,
      parts: new EC.Particles(),
    };
  }
  // E is the lawn's state: the ending scene itself, or the intro's establishing shot.
  function drawLawn(g, E) {
    if (!lawnBg) buildLawn();
    const cam = E.cam;
    g.save();
    if (cam) {
      g.translate(EC.W / 2, EC.H / 2);
      g.scale(cam.z, cam.z);
      g.translate(-cam.x, -cam.y);
    }
    g.drawImage(lawnBg, 0, 0);
    if (E.dusk) {
      // early evening: the last of the sunset over the roof
      const sky = g.createLinearGradient(0, 0, 0, 214);
      sky.addColorStop(0, 'rgba(120,70,140,0.35)');
      sky.addColorStop(0.7, 'rgba(240,130,90,0.38)');
      sky.addColorStop(1, 'rgba(255,170,110,0.2)');
      g.fillStyle = sky;
      g.fillRect(0, 0, EC.W, 214);
    }
    // doorway
    const dx = 200;
    const dy = 120;
    const dw = 32;
    const dh = 76;
    if (E.door > 0.05) {
      R(g, dx, dy, dw, dh, '#f2c46a');
      R(g, dx, dy + dh - 6, dw, 6, '#c99a4a');
      if (E.beast > 0) {
        // He has to stoop to look out. His fists grip the frame.
        const bx = dx + dw / 2;
        const feet = dy + dh + 36 + (1 - E.beast) * 50;
        const lookY = E.beastLook === 'down' ? 2 : 0;
        const lookX = E.beastLook === 'side' ? -2 : 0;
        g.save();
        g.beginPath();
        g.rect(dx, dy, dw, dh);
        g.clip();
        art.put(g, art.beastFront({ roar: E.beastRoar, look: E.beastLook }), bx, feet);
        art.beastFrontEyes.forEach(([ex, ey]) => art.glow(g, bx + ex + lookX, feet + ey + lookY, 8, 'rgba(255,43,43,0.9)', 0.9));
        g.restore();
        if (E.beast > 0.6) {
          [[dx - 7, dy + 26], [dx + dw - 3, dy + 30]].forEach(([fx, fy]) => {
            R(g, fx - 1, fy - 1, 12, 14, C.ink);
            R(g, fx, fy, 10, 12, C.bSkin);
            R(g, fx, fy + 4, 10, 1, C.bSkinS);
            R(g, fx, fy + 8, 10, 1, C.bSkinS);
          });
        }
      }
      R(g, dx, dy, Math.max(2, Math.round(dw * (1 - E.door))), dh, C.woodS);
    } else {
      R(g, dx, dy, dw, dh, C.wood);
      R(g, dx + 4, dy + 6, dw - 8, 20, C.woodS);
      R(g, dx + 6, dy + 8, dw - 12, 16, E.porch > 0.5 ? '#e7c46a' : '#7a6a3a');
      R(g, dx + 4, dy + 34, dw - 8, dh - 40, C.woodS);
      R(g, dx + 5, dy + 35, dw - 10, dh - 42, C.wood);
      R(g, dx + dw - 7, dy + 40, 3, 4, C.brass);
    }
    // porch light
    R(g, 244, 128, 8, 10, E.porch > 0.5 ? '#fff2b0' : '#5a5040');
    R(g, 243, 126, 10, 2, '#2a2a30');
    if (E.porch > 0.5) art.glow(g, 248, 134, 60, 'rgba(255,220,150,0.55)');
    // zach
    const z = E.zach;
    if (z && z.visible) {
      art.put(g, art.zach(z.pose, 0), z.x, z.y, { flip: z.face < 0, rot: z.rot });
      if (z.gift) art.put(g, art.prop('gift'), z.x + 9 * z.face, z.y - 9);
      if (E.phone > 0) {
        art.put(g, art.prop('phone'), z.x + 8 * z.face, z.y - 17);
        if (Math.floor(E.t * 10) % 2 === 0) art.glow(g, z.x + 8 * z.face, z.y - 17, 8, 'rgba(127,215,255,0.8)', 0.7);
      }
    }
    if (E.parts) E.parts.draw(g, 0);
    g.restore();
  }

  // ================================================================ public: drawing any scene
  EC.scenes = {};
  EC.scenes.draw = function (g, S) {
    const [ox, oy] = EC.fx.offset();
    g.save();
    g.translate(ox, oy);
    if (S.view === 'living') drawLiving(g, S);
    else if (S.view === 'title') drawTitle(g, S);
    else if (S.view === 'lawn') drawLawn(g, S);
    else if (S.view === 'ext') drawLawn(g, S.ext);
    else {
      g.fillStyle = '#000';
      g.fillRect(-10, -10, EC.W + 20, EC.H + 20);
    }
    g.restore();
    EC.fx.drawFlash(g);
    if (S.black > 0) {
      g.globalAlpha = Math.min(1, S.black);
      g.fillStyle = '#000';
      g.fillRect(0, 0, EC.W, EC.H);
      g.globalAlpha = 1;
    }
    // the TV warming up: a bright line that opens into the picture
    if (S.power != null && S.power < 1) {
      const k = EC.ease.out(Math.min(1, S.power * 1.4));
      const band = Math.max(2, EC.H * k);
      const top = (EC.H - band) / 2;
      g.fillStyle = '#000';
      g.fillRect(0, 0, EC.W, top);
      g.fillRect(0, top + band, EC.W, EC.H - top - band);
      g.globalAlpha = Math.max(0, 1 - S.power) * 0.85;
      g.fillStyle = '#e8f0ff';
      g.fillRect(0, top, EC.W, band);
      g.globalAlpha = 1;
    }
  };
  EC.scenes.update = function (S, dt) {
    if (S.power != null && S.power < 1) S.power = Math.min(1, S.power + dt * 1.5);
    if (S.view === 'living' || S.view === 'ext') updateLiving(S, dt);
    else {
      S.t += dt;
      if (S.parts) S.parts.update(dt);
    }
    if (S.view === 'title' && S.title && S.title.falling) {
      const T = S.title;
      T.ft += dt;
      const tx = T.hatTargetX || 300;
      const ty = T.hatTargetY || 70;
      const k = Math.min(1, T.ft / 2.6);
      T.hatY = EC.lerp(-30, ty, EC.ease.out(k));
      T.hatX = tx + Math.sin(T.ft * 3.2) * 34 * (1 - k);
      T.hatRot = Math.sin(T.ft * 3.2 + 0.6) * 0.5 * (1 - k) + 0.12 * k;
      if (k >= 1 && !T.landed) {
        T.landed = true;
        sfx.stomp();
      }
    }
  };
  EC.scenes.newLiving = newLivingScene;
  EC.scenes.newLawn = newLawnScene;
  EC.scenes.ensureBackgrounds = () => {
    if (!livingBg) buildLiving();
    if (!lawnBg) buildLawn();
  };

  // ================================================================ THE INTRO
  function* intro(S, cs) {
    // The house, early evening.
    S.view = 'ext';
    S.ext = { door: 0, porch: 1, beast: 0, zach: null, phone: 0, dusk: true, t: 0, cam: { x: EC.W / 2, y: EC.H / 2, z: 1 } };
    S.clock.run = false;
    S.black = 1;
    cs.tween(S, { black: 0 }, 1.2);
    cs.tween(S.ext.cam, { x: 92, y: 118, z: 2.6 }, 3.6, EC.ease.inOut);
    sfx.crickets();
    yield 3.4;

    // Inside. He has been sitting like this for a while.
    S.view = 'living';
    shot(S, 'wide');
    S.clock.run = true;
    S.clock.fast = 1;
    yield 2.4;
    S.clock.fast = 0;
    yield 0.9;
    pan(cs, 'dad', 2.4);
    yield 3.0;

    // The door bursts open.
    shot(S, 'wide');
    S.door = 1;
    sfx.door();
    EC.fx.shake(3, 0.25);
    S.zach.visible = S.alex.visible = true;
    walkTo(S.zach, 230, 95);
    walkTo(S.alex, 272, 80);
    yield () => S.zach.arrived;
    S.zach.face = -1;
    S.alex.face = -1;
    yield 0.25;
    S.zach.pose = 'horn';
    sfx.horn();
    cs.tween(S, { horn: 1 }, 0.22, EC.ease.out);
    yield 0.25;
    S.dad.eyes = 'blink';
    yield 0.45;
    cs.tween(S, { horn: 0 }, 0.18, EC.ease.in);
    yield 0.2;
    S.dad.eyes = 'calm';
    S.zach.pose = 'grin';
    yield 0.5;

    yield* say(cs, 'zach', 'Mr. — sir! Hey! We can’t stay long. We’re heading to a birthday party.');
    yield* say(cs, 'alex', 'We just came to grab the gift, Daddy.');
    yield* say(cs, 'dad', 'His party.', { speed: 12 });
    yield 1.1;
    yield* say(cs, 'dad', 'The couch boy.', { cam: 'keep', speed: 22 });
    yield* say(cs, 'zach', 'Ha, yeah, that’s him.');

    // He sets down the remote with great care.
    shot(S, 'table');
    S.dad.remote = false;
    S.remote = { x: 166, y: 174 };
    const r = S.remote;
    const rs = cs.t;
    yield () => {
      const k = EC.ease.inOut(Math.min(1, (cs.t - rs) / 1.8));
      r.x = EC.lerp(166, 140, k);
      r.y = EC.lerp(174, 176, k) - Math.sin(k * Math.PI) * 5;
      return k >= 1;
    };
    sfx.click();
    yield 0.7;
    yield* say(cs, 'dad', 'Zachary. Before you go to the couch boy’s party. I believe you have something for me.');
    S.zach.pose = 'worry';
    yield* say(cs, 'zach', 'I... do?');
    yield* say(cs, 'dad', 'The game. _Eddie’s Couch._ You said you would show me.');
    S.alex.pose = 'worry';
    yield* say(cs, 'alex', 'Oh no.', { speed: 14, voice: 'alexm' });
    yield* say(cs, 'dad', 'I cleared my Thursday. I cleared my Friday. I told Gary from church about it, Zachary. Gary is _waiting._');
    S.zach.pose = 'grin';
    yield* say(cs, 'zach', 'Right! Totally. Yes. One sec.');

    // Taps. Scrolls. Taps harder. Scrolls faster. The hat tilts.
    shot(S, 'two');
    S.zach.pose = 'phone';
    cs.tween(S.zach, { tilt: -0.55 }, 3.4, EC.ease.inOut);
    for (let i = 0; i < 10; i++) {
      sfx.click();
      if (i === 5) S.parts.add({ x: S.zach.x + 3 * S.zach.face, y: FY - 30, vx: 0, vy: 10, g: 60, life: 1.1, size: 2, color: '#9ad7ff' });
      yield 0.12 + (10 - i) * 0.035;
    }
    yield 0.6;

    // ---- The Verdict
    S.zach.pose = 'worry';
    yield* say(cs, 'zach', 'So, funny thing. The guy who made it... deleted it.');
    shot(S, 'clock');
    yield 0.4;
    S.clock.run = false;
    yield 1.7;
    yield* say(cs, 'dad', 'Deleted.', { speed: 14 });
    S.zach.pose = 'poof';
    S.parts.burst(10, { x: S.zach.x - 8, y: FY - 34, g: 40, s0: 20, s1: 60, life: 0.8, size: 2, color: ['#ffffff', '#ffd23e', '#ff5aa5'] });
    yield* say(cs, 'zach', 'Like, off the internet. Gone. Colby just — poof.');

    // He rises. He is somehow taller standing than sitting.
    S.zach.pose = 'worry';
    shot(S, 'wide');
    S.dad.mode = 'stand';
    S.dad.x = 182;
    S.dad.sy = 0.55;
    S.dad.eyes = 'glare';
    sfx.creak();
    cs.tween(S.dad, { sy: 1.16 }, 1.8, EC.ease.out);
    yield 1.9;
    yield* say(cs, 'dad', 'You looked me in the eye and told me I would see that game.');
    yield* say(cs, 'zach', 'I didn’t know he was gonna —');
    S.dad.pose = 'point';
    yield* say(cs, 'dad', 'You are _unreliable._');
    yield* say(cs, 'zach', 'That’s fair, but —');
    yield* say(cs, 'dad', 'You are a _liar._');
    yield* say(cs, 'zach', 'I’d say more of a “miscommunicator” —');
    yield* say(cs, 'dad', 'A man who cannot produce a couch game cannot produce a _future._ You are not good enough for my daughter.');
    S.alex.pose = 'worry';
    yield* say(cs, 'alex', 'Daddy, please! It’s his birthday!');

    // He ignores her. Off come the reading glasses, folded very neatly.
    S.dad.pose = 'glasses';
    S.dad.glasses = false;
    sfx.click();
    yield 0.5;
    sfx.click();
    yield* say(cs, 'dad', 'I want you to know, Zachary... I gave you every chance.');

    // On the end table. Squared up. Patted once.
    cs.tween(S.dad, { x: 154 }, 1.0);
    yield 1.05;
    shot(S, 'table');
    S.dad.pose = 'down';
    S.glassesItem = { x: S.dad.x - 0.5, y: FY - 34 };
    cs.tween(S.glassesItem, { x: 130, y: 176 }, 0.7, EC.ease.out);
    yield 0.8;
    sfx.click();
    yield 0.45;
    S.glassesItem.x = 129;
    sfx.click();
    yield 0.3;
    S.glassesItem.x = 130;
    sfx.click();
    yield 0.55;
    S.glassesItem.y = 177;
    sfx.pat();
    yield 0.16;
    S.glassesItem.y = 176;
    yield 0.8;
    cs.tween(S.dad, { x: 182 }, 0.9);
    shot(S, 'dad');
    yield 0.95;

    yield* say(cs, 'dad', 'Son...', { speed: 10 });
    for (let i = 0; i < 4; i++) {
      S.dim = 0.85;
      S.lamp = 0.1;
      sfx.flicker();
      yield 0.09 + i * 0.03;
      S.dim = 0.1;
      S.lamp = 1;
      yield 0.16 + (i % 2) * 0.12;
    }
    S.dim = 0.35;
    S.lamp = 0.5;
    S.dad.eyes = 'glow';
    yield 0.5;
    yield* say(cs, 'dad', '...I’m going to kill you.', { speed: 22 });

    // ---- Not Again
    shot(S, 'wide');
    S.dim = 0;
    S.lamp = 1;
    sfx.thunder();
    S.lightning = 0.5;
    EC.fx.flash('#e8f0ff', 0.6);
    EC.fx.shake(4, 0.6);
    yield 0.9;
    // The cardigan buttons go, one by one, like bullets. One takes Zach's hat.
    for (let i = 0; i < 4; i++) {
      S.dad.buttons = 3 - i;
      const bx = S.dad.x - 5;
      const by = FY - (52 - 16 - i * 3) * S.dad.sy;
      const hatShot = i === 2;
      const ang = hatShot ? Math.atan2(FY - 38 - by, S.zach.x - bx) : EC.rand(-Math.PI, 0);
      const sp = 340;
      S.parts.add({ spr: art.prop('button'), x: bx, y: by, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g: 300, life: 2.2, vr: 20, floor: FY - 1, walls: [6, 474, TOP + 2], onBounce: () => sfx.ping() });
      sfx.ping();
      if (hatShot) {
        yield 0.12;
        S.zach.hat = false;
        S.hatFly = { x: S.zach.x + 1, y: FY - 29, vx: 70, vy: -260, rot: 0, vr: 9 };
        S.zach.pose = 'shock';
        sfx.whoosh();
        yield 0.3;
      } else yield 0.36;
    }
    yield 0.9;

    // The mustache thickens. The khakis hold. Everything above them grows.
    shot(S, 'dad');
    S.dad.stache = true;
    sfx.stomp();
    yield 0.7;
    S.dad.mode = 'grow';
    S.dad.grow = 0;
    sfx.roar(2.4);
    EC.fx.shake(3, 2.4);
    cs.tween(S.dad, { grow: 1 }, 2.4, EC.ease.in);
    pan(cs, 'beast', 2.4);
    yield 2.4;
    S.dad.mode = 'beast';
    ui.rec(true);
    EC.fx.flash('#ff2b2b', 0.3);
    yield 1.0;

    // The recliner, now too small, is crushed beneath him.
    shot(S, 'wide');
    cs.tween(S.dad, { x: 184 }, 0.3);
    yield 0.4;
    S.recliner = 'crushed';
    sfx.whine();
    EC.fx.shake(2, 0.3);
    S.parts.burst(8, { x: 182, y: FY - 20, g: 500, s0: 60, s1: 140, a0: -Math.PI, a1: 0, life: 1.4, sizes: [2, 3], color: [C.chair, C.chairS, C.metal], floor: FY - 1 });
    yield 1.5;

    S.alex.pose = 'kneel';
    sfx.land();
    yield 0.4;
    yield* say(cs, 'alex', 'No, Daddy, NOOOOOO!!! Not again!');
    S.zach.face = 1;
    S.zach.pose = 'turn';
    yield 0.5;
    yield* say(cs, 'zach', '...Again?', { speed: 16 });
    S.alex.pose = 'away';
    yield* say(cs, 'alex', 'We don’t talk about Brandon.');
    S.zach.pose = 'shock';
    yield* say(cs, 'zach', 'WHO IS BRANDON?');

    // One slipper on the coffee table. Full height. The roar.
    S.zach.face = -1;
    shot(S, 'beast');
    S.dad.stomp = true;
    sfx.stomp();
    EC.fx.shake(3, 0.3);
    yield 0.8;
    S.dad.roar = true;
    sfx.roar(1.9);
    EC.fx.shake(5, 1.6);
    yield 0.6;
    shot(S, 'wide');
    S.smoke = 6;
    sfx.beeps(12, 0.32);
    yield 0.9;
    // Somewhere, Gary from church feels it.
    cs.tween(S, { gary: 1 }, 0.3);
    yield 2.6;
    cs.tween(S, { gary: 0 }, 0.3);
    yield 0.3;
    sfx.roar(1.4);
    EC.fx.shake(3, 1.2);
    yield* say(cs, 'beast', 'WHERE. IS. MY. GAME.', { loud: true });

    // Smash cut to black.
    sfx.smash();
    S.view = 'black';
    S.smoke = 0;
    yield 1.1;
    yield* titleCard(S, cs);
  }

  function* titleCard(S, cs) {
    ui.dialog.hide();
    S.view = 'title';
    S.title = { alpha: 0, hatOn: true, falling: true, ft: 0, hatX: 300, hatY: -40, hatRot: 0, landed: false };
    S.black = 0;
    sfx.sting();
    cs.tween(S.title, { alpha: 1 }, 0.5, EC.ease.out);
    yield () => S.title.landed;
    yield 0.6;
    ui.prompt.show('ESCAPE THE HOUSE.<small>' + (EC.input.device === 'touch' ? 'Tap to begin' : 'Press Enter to begin') + '</small>', true);
    yield () => EC.input.pressed.confirm;
    ui.prompt.hide();
    sfx.select();
  }

  EC.scenes.intro = intro;
  EC.scenes.titleOnly = function* (S, cs) {
    S.dad.mode = 'beast';
    S.recliner = 'crushed';
    ui.rec(true);
    yield* titleCard(S, cs);
  };

  // ================================================================ THE ENDING
  EC.scenes.ending = function* (S, cs, info) {
    S.black = 1;
    S.zach.gift = !!info.gift;
    cs.tween(S, { black: 0 }, 0.8);
    sfx.door();
    yield 0.3;
    // Zach tumbles out onto the lawn.
    cs.tween(S.zach, { x: 292, rot: Math.PI * 2 }, 0.9, EC.ease.out);
    const zz = S.zach;
    const start = cs.t;
    yield () => {
      const k = Math.min(1, (cs.t - start) / 0.9);
      zz.y = EC.lerp(196, LY, k) - Math.sin(k * Math.PI) * 26;
      return k >= 1;
    };
    zz.rot = 0;
    zz.y = LY;
    zz.pose = 'shock';
    sfx.land();
    S.parts.burst(6, { x: zz.x, y: LY - 2, g: -20, s0: 10, s1: 40, a0: -Math.PI, a1: 0, life: 0.6, size: 2, color: ['#3c5c34', '#5a7a4a'] });
    yield 0.9;
    // The beast fills the doorway.
    zz.face = -1;
    zz.pose = 'worry';
    cs.tween(S, { beast: 1 }, 0.4, EC.ease.out);
    sfx.stomp();
    EC.fx.shake(3, 0.3);
    yield 1.1;
    // He looks down at his slippers. He looks at the wet grass.
    S.beastLook = 'down';
    yield 1.1;
    S.beastLook = 'side';
    yield 1.0;
    S.beastLook = '';
    yield 0.4;
    yield* say(cs, 'beast', 'THESE. ARE. MY. INDOOR. SLIPPERS.', { loud: true });
    // He closes the door very gently. Click. The porch light goes off.
    cs.tween(S, { door: 0 }, 1.6);
    yield 1.65;
    S.beast = 0;
    sfx.click();
    yield 0.7;
    S.porch = 0;
    sfx.lightsOff();
    yield 0.9;
    yield* say(cs, 'alex', 'Tell him happy birthday!', { muffled: true, voice: 'alexm' });
    yield* say(cs, 'zach', '...Is she just staying in there?');
    if (!info.gift) {
      zz.pose = 'shock';
      yield* say(cs, 'zach', 'The gift. I left the gift in there.');
      for (let i = 0; i < 3; i++) {
        S.porch = 1;
        sfx.click();
        yield 0.35;
        S.porch = 0;
        sfx.click();
        yield 0.35;
      }
      S.porch = 1;
      yield 0.8;
    }
    zz.pose = 'phone';
    zz.face = 1;
    S.phone = 1;
    sfx.buzz();
    yield 1.1;
    const all = (info.disks || 0) >= info.disksTotal;
    const text = all
      ? 'hey. this is brandon. heard you got every backup of eddie’s couch out of there. further than i ever got.'
      : 'hey. this is brandon. he does this every time someone promises him a game.';
    yield* say(cs, 'phone', text, { voice: 'phone' });
    zz.pose = 'shock';
    yield* say(cs, 'zach', 'WHO IS BRANDON?!');
    cs.tween(S, { black: 0.55 }, 0.6);
    yield 0.6;
  };
})();

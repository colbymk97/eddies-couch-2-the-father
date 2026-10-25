/* Eddie's Couch 2 — the cutscene runner and the scripted scenes (intro, title card, ending). */
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
    script: '"Courier Prime", "Courier New", Courier, monospace',
  };
  const NAMES = { zach: 'ZACH', alex: 'ALEX', dad: 'DAD', beast: "GIRLFRIEND'S DAD BEAST", gary: 'GARY', phone: 'UNKNOWN NUMBER' };

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
      ui.direction.update(dt);
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

  function showSay(cs, who, text, o) {
    o = o || {};
    shot(cs.scene, o.cam || SHOT_FOR[who] || 'wide');
    ui.direction.hide();
    ui.dialog.show(text, { who, label: o.label || NAMES[who], voice: who, loud: o.loud });
    cs.typer = ui.dialog;
  }
  function showNarr(cs, text, slug, cam) {
    if (cam !== 'keep') shot(cs.scene, cam || 'wide');
    ui.dialog.hide();
    ui.direction.show(text, { slug, voice: 'script' });
    cs.typer = ui.direction;
  }
  function* say(cs, who, text, o) {
    showSay(cs, who, text, o);
    yield 'line';
  }
  function* narr(cs, text, slug, cam) {
    showNarr(cs, text, slug, cam);
    yield 'line';
  }
  function clearText() {
    ui.dialog.hide();
    ui.direction.hide();
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
      clock: { run: true, t: 0, last: 0, ang: 0 },
      door: 0,
      zach: { x: 452, face: -1, pose: 'grin', frame: 0, visible: false, to: null, speed: 70, hat: true, tilt: 0, arrived: false, dist: 0 },
      alex: { x: 470, face: -1, pose: 'smile', frame: 0, visible: false, to: null, speed: 70, hat: true, tilt: 0, arrived: false, dist: 0 },
      dad: { mode: 'seat', x: 182, remote: true, glasses: true, eyes: 'calm', pose: 'down', buttons: 4, sy: 1, grow: 0, stache: false, stomp: false, roar: false },
      horn: 0,
      remoteOnTable: false,
      glassesOnTable: false,
      glassesPat: 0,
      dim: 0,
      recliner: 'ok',
      smoke: 0,
      gary: 0,
      hatFly: null,
      parts: new EC.Particles(),
      black: 0,
      blinkT: 0,
      title: null,
      cam: { x: EC.W / 2, y: EC.H / 2, z: 1 },
    };
  }

  // Film-style cuts between a wide shot and close-ups.
  function shot(S, name) {
    if (!S.cam || S.view !== 'living') return;
    const d = S.dad;
    const c = S.cam;
    if (name === 'wide') Object.assign(c, { x: EC.W / 2, y: EC.H / 2, z: 1 });
    else if (name === 'dad') Object.assign(c, { x: d.x + 22, y: FY - 32, z: 2 });
    else if (name === 'two') Object.assign(c, { x: (S.zach.x + S.alex.x) / 2 - 6, y: FY - 32, z: 2 });
    else if (name === 'beast') Object.assign(c, { x: d.x + 34, y: FY - 64, z: 1.5 });
    const hw = EC.W / 2 / c.z;
    const hh = EC.H / 2 / c.z;
    c.x = EC.clamp(c.x, hw, EC.W - hw);
    c.y = EC.clamp(c.y, hh, EC.H - hh);
  }
  const SHOT_FOR = { dad: 'dad', zach: 'two', alex: 'two', beast: 'beast' };

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
    if (S.clock.run) {
      S.clock.t += dt;
      S.clock.ang = Math.sin(S.clock.t * Math.PI * 1.6) * 0.32;
      const beat = Math.floor(S.clock.t * 1.6);
      if (beat !== S.clock.last) {
        S.clock.last = beat;
        sfx.tick(beat & 1);
      }
    } else S.clock.ang *= Math.pow(0.02, dt);
    if (S.hatFly) {
      const h = S.hatFly;
      h.vy += 520 * dt;
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.rot += h.vr * dt;
      if (h.y > 320) S.hatFly = null;
    }
    if (S.smoke > 0) {
      S.smoke -= dt;
    }
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

  function drawGary(g, S) {
    if (S.gary <= 0) return;
    g.save();
    g.globalAlpha = Math.min(1, S.gary);
    const x = 318;
    const y = 112;
    const w = 150;
    const h = 84;
    R(g, x - 2, y - 2, w + 4, h + 4, C.ink);
    R(g, x, y, w, h, '#4a3a5a');
    const glassC = ['#c8434a', '#3d6fc4', '#e2b84a', '#5f8a5a'];
    for (let i = 0; i < 8; i++) R(g, x + 14 + (i % 4) * 9, y + 18 + Math.floor(i / 4) * 12, 8, 11, glassC[i % 4]);
    R(g, x, y, w, 13, C.ink);
    R(g, x, y + 58, w, 26, '#5a3419');
    R(g, x, y + 56, w, 3, '#7a4a2a');
    // Gary
    const gx = x + 104;
    const gy = y + 58;
    R(g, gx - 9, gy - 22, 18, 22, '#3a5a8a');
    R(g, gx - 6, gy - 22, 12, 22, '#c9a26e');
    R(g, gx - 6, gy - 36, 12, 14, C.skin);
    R(g, gx - 6, gy - 33, 2, 6, C.dHairS);
    R(g, gx + 4, gy - 33, 2, 6, C.dHairS);
    R(g, gx - 4, gy - 31, 3, 2, C.glass);
    R(g, gx + 1, gy - 31, 3, 2, C.glass);
    R(g, gx - 2, gy - 26, 4, 1, C.skinD);
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
    g.font = '700 9px ' + EC.FONT.ui;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#f4e7c9';
    g.fillText('MEANWHILE, AT CHURCH', x + w / 2, y + 7);
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
    // pendulum
    const px = 43;
    const py = 128;
    g.save();
    g.translate(px, py);
    g.rotate(S.clock.ang);
    R(g, -1, 0, 2, 36, C.brassS);
    art.disc(g, 0, 38, 4, C.brass);
    g.restore();
    paint.clockHands(g, 30, FY, 118);
    // lamp glow
    art.glow(g, 124, 164, 46, 'rgba(255,214,140,0.35)');
    drawDoor(g, S.door);
    if (S.remoteOnTable) art.put(g, art.prop('remoteFlat'), 140, 176);
    if (S.glassesOnTable) art.put(g, art.prop('glasses'), 130, 176 - (S.glassesPat > 0 ? 1 : 0));
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
      zach: { x: 216, y: 196, face: 1, pose: 'hurt', rot: 0, visible: true, gift: false },
      phone: 0,
      black: 1,
      parts: new EC.Particles(),
    };
  }
  function drawLawn(g, S) {
    if (!lawnBg) buildLawn();
    g.drawImage(lawnBg, 0, 0);
    // doorway
    const dx = 200;
    const dy = 120;
    const dw = 32;
    const dh = 76;
    if (S.door > 0.05) {
      R(g, dx, dy, dw, dh, '#f2c46a');
      R(g, dx, dy + dh - 6, dw, 6, '#c99a4a');
      if (S.beast > 0) {
        // He has to stoop to look out. His fists grip the frame.
        const bx = dx + dw / 2;
        const feet = dy + dh + 36 + (1 - S.beast) * 50;
        g.save();
        g.beginPath();
        g.rect(dx, dy, dw, dh);
        g.clip();
        art.put(g, art.beastFront({ roar: S.beastRoar }), bx, feet);
        art.beastFrontEyes.forEach(([ex, ey]) => art.glow(g, bx + ex, feet + ey, 8, 'rgba(255,43,43,0.9)', 0.9));
        g.restore();
        if (S.beast > 0.6) {
          [[dx - 7, dy + 26], [dx + dw - 3, dy + 30]].forEach(([fx, fy]) => {
            R(g, fx - 1, fy - 1, 12, 14, C.ink);
            R(g, fx, fy, 10, 12, C.bSkin);
            R(g, fx, fy + 4, 10, 1, C.bSkinS);
            R(g, fx, fy + 8, 10, 1, C.bSkinS);
          });
        }
      }
      R(g, dx, dy, Math.max(2, Math.round(dw * (1 - S.door))), dh, C.woodS);
    } else {
      R(g, dx, dy, dw, dh, C.wood);
      R(g, dx + 4, dy + 6, dw - 8, 20, C.woodS);
      R(g, dx + 6, dy + 8, dw - 12, 16, S.porch > 0.5 ? '#e7c46a' : '#7a6a3a');
      R(g, dx + 4, dy + 34, dw - 8, dh - 40, C.woodS);
      R(g, dx + 5, dy + 35, dw - 10, dh - 42, C.wood);
      R(g, dx + dw - 7, dy + 40, 3, 4, C.brass);
    }
    // porch light
    R(g, 244, 128, 8, 10, S.porch > 0.5 ? '#fff2b0' : '#5a5040');
    R(g, 243, 126, 10, 2, '#2a2a30');
    if (S.porch > 0.5) art.glow(g, 248, 134, 60, 'rgba(255,220,150,0.55)');
    // zach
    const z = S.zach;
    if (z.visible) {
      art.put(g, art.zach(z.pose, 0), z.x, z.y, { flip: z.face < 0, rot: z.rot });
      if (z.gift) art.put(g, art.prop('gift'), z.x + 9 * z.face, z.y - 9);
      if (S.phone > 0) {
        art.put(g, art.prop('phone'), z.x + 8 * z.face, z.y - 17);
        if (Math.floor(S.t * 10) % 2 === 0) art.glow(g, z.x + 8 * z.face, z.y - 17, 8, 'rgba(127,215,255,0.8)', 0.7);
      }
    }
    S.parts.draw(g, 0);
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
  };
  EC.scenes.update = function (S, dt) {
    if (S.view === 'living') updateLiving(S, dt);
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
    S.black = 1;
    cs.tween(S, { black: 0 }, 1.4);
    yield 1.0;
    yield* narr(cs, 'A grandfather clock ticks. ALEX’S DAD sits in a recliner, perfectly still, remote in hand. The TV is off. He has been sitting like this for a while.', 'INT. ALEX’S PARENTS’ HOUSE — LIVING ROOM — EVENING');

    // The door bursts open.
    S.door = 1;
    sfx.door();
    EC.fx.shake(3, 0.25);
    S.zach.visible = S.alex.visible = true;
    walkTo(S.zach, 230, 95);
    walkTo(S.alex, 272, 80);
    showNarr(cs, 'The front door bursts open. ZACH and ALEX enter wearing cone party hats. Zach blows a party horn. It unrolls directly into the Dad’s face.');
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
    yield 'line';

    S.zach.pose = 'grin';
    yield* say(cs, 'zach', 'Mr. — sir! Hey! We can’t stay long. We’re heading to Theo’s birthday party.');
    yield* say(cs, 'alex', 'We just came to grab the gift, Daddy.');
    yield* say(cs, 'dad', '(slowly) Theo.');
    showNarr(cs, 'Beat.', null, 'keep');
    yield 1.4;
    yield* say(cs, 'dad', 'The couch boy.');
    yield* say(cs, 'zach', 'Ha, yeah, that’s him.');
    S.dad.remote = false;
    S.remoteOnTable = true;
    sfx.click();
    yield* say(cs, 'dad', '(sets down the remote with great care) Zachary. Before you go to the couch boy’s party. I believe you have something for me.');
    S.zach.pose = 'worry';
    yield* say(cs, 'zach', 'I... do?');
    yield* say(cs, 'dad', 'The game. _Eddie’s Couch._ You said you would show me.');
    S.alex.pose = 'worry';
    yield* say(cs, 'alex', '(quietly) Oh no.');
    yield* say(cs, 'dad', 'I cleared my Thursday. I cleared my Friday. I told Gary from church about it, Zachary. Gary is _waiting._');
    S.zach.pose = 'grin';
    yield* say(cs, 'zach', 'Right! Totally. Yes. One sec.');

    S.zach.pose = 'phone';
    showNarr(cs, 'Zach pulls out his phone. Taps. Scrolls. Taps harder. Scrolls faster. His party hat slowly tilts sideways.', null, 'two');
    cs.tween(S.zach, { tilt: -0.55 }, 3.2, EC.ease.inOut);
    for (let i = 0; i < 9; i++) {
      sfx.click();
      yield 0.12 + (9 - i) * 0.03;
    }
    yield 'line';

    // ---- Scene 2: The Verdict
    S.zach.pose = 'worry';
    yield* say(cs, 'zach', 'So, funny thing. The guy who made it... deleted it.');
    S.clock.run = false;
    yield* narr(cs, 'Silence. The grandfather clock stops ticking.');
    yield* say(cs, 'dad', 'Deleted.');
    S.zach.pose = 'poof';
    S.parts.burst(10, { x: S.zach.x - 8, y: FY - 34, g: 40, s0: 20, s1: 60, life: 0.8, size: 2, color: ['#ffffff', '#ffd23e', '#ff5aa5'] });
    yield* say(cs, 'zach', 'Like, off the internet. Gone. Colby just — (makes a little poof gesture) — poof.');

    S.zach.pose = 'worry';
    S.dad.mode = 'stand';
    S.dad.x = 182;
    S.dad.sy = 0.55;
    S.dad.eyes = 'glare';
    sfx.creak();
    cs.tween(S.dad, { sy: 1.16 }, 1.6, EC.ease.out);
    showSay(cs, 'dad', '(rising from the recliner, which is somehow taller standing than sitting) You looked me in the eye, at Easter dinner, over a ham, and told me I would see that game.');
    yield 'line';
    yield* say(cs, 'zach', 'I didn’t know he was gonna —');
    S.dad.pose = 'point';
    yield* say(cs, 'dad', 'You are _unreliable._');
    yield* say(cs, 'zach', 'That’s fair, but —');
    yield* say(cs, 'dad', 'You are a _liar._');
    yield* say(cs, 'zach', 'I’d say more of a “miscommunicator” —');
    yield* say(cs, 'dad', 'A man who cannot produce a couch game cannot produce a _future._ You are not good enough for my daughter.');
    S.alex.pose = 'worry';
    yield* say(cs, 'alex', 'Daddy, please, it’s Theo’s birthday!');
    S.dad.pose = 'glasses';
    S.dad.glasses = false;
    sfx.click();
    yield* say(cs, 'dad', '(ignoring her, removing his reading glasses and folding them very neatly) I want you to know, Zachary... I gave you every chance.');

    showNarr(cs, 'He places the glasses on the end table. Squares them up. Pats them once.', null, 'dad');
    cs.tween(S.dad, { x: 156 }, 0.9);
    yield 1.0;
    S.dad.pose = 'down';
    S.glassesOnTable = true;
    sfx.click();
    yield 0.35;
    sfx.click();
    yield 0.4;
    S.glassesPat = 1;
    sfx.pat();
    yield 0.18;
    S.glassesPat = 0;
    cs.tween(S.dad, { x: 182 }, 0.9);
    yield 1.0;
    yield 'line';

    yield* say(cs, 'dad', 'Son...');
    showNarr(cs, 'The lights flicker.', null, 'keep');
    for (let i = 0; i < 4; i++) {
      S.dim = 0.85;
      sfx.flicker();
      yield 0.09 + i * 0.03;
      S.dim = 0.1;
      yield 0.16 + (i % 2) * 0.12;
    }
    S.dim = 0.35;
    S.dad.eyes = 'glow';
    yield 'line';
    yield* say(cs, 'dad', '...I’m going to kill you.');

    // ---- Scene 3: Not Again
    S.dim = 0;
    EC.audio.sfx.thunder();
    EC.fx.flash('#e8f0ff', 0.6);
    EC.fx.shake(4, 0.6);
    showNarr(cs, 'Thunder outside, despite clear skies. The Dad’s cardigan buttons pop off one by one, pinging off the walls like bullets. One knocks Zach’s party hat clean off.');
    yield 0.9;
    for (let i = 0; i < 4; i++) {
      S.dad.buttons = 3 - i;
      const bx = S.dad.x - 5;
      const by = FY - (52 - 16 - i * 3) * S.dad.sy;
      const hatShot = i === 2;
      const ang = hatShot ? Math.atan2(FY - 38 - by, S.zach.x - bx) : EC.rand(-Math.PI, 0);
      const sp = 340;
      S.parts.add({
        spr: art.prop('button'),
        x: bx,
        y: by,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        g: 300,
        life: 2.2,
        vr: 20,
        floor: FY - 1,
        walls: [6, 474, TOP + 2],
        onBounce: () => sfx.ping(),
      });
      sfx.ping();
      if (hatShot) {
        yield 0.12;
        S.zach.hat = false;
        S.hatFly = { x: S.zach.x + 1, y: FY - 28, vx: 70, vy: -260, rot: 0, vr: 9 };
        S.zach.pose = 'shock';
        sfx.whoosh();
        yield 0.3;
      } else yield 0.36;
    }
    yield 'line';

    showNarr(cs, 'His mustache thickens. His khakis hold — they are good khakis — but everything above them grows. Horns curl out of his receding hairline. His eyes glow the exact color of a DVR recording light.');
    S.dad.stache = true;
    yield 0.6;
    S.dad.mode = 'grow';
    S.dad.grow = 0;
    EC.audio.sfx.roar(2.4);
    EC.fx.shake(3, 2.4);
    cs.tween(S.dad, { grow: 1 }, 2.4, EC.ease.in);
    yield 2.4;
    S.dad.mode = 'beast';
    ui.rec(true);
    EC.fx.flash('#ff2b2b', 0.3);
    yield 'line';

    showNarr(cs, 'The recliner, now too small, is crushed beneath him with a sad mechanical whine.');
    cs.tween(S.dad, { x: 184 }, 0.3);
    yield 0.4;
    S.recliner = 'crushed';
    sfx.whine();
    EC.fx.shake(2, 0.3);
    S.parts.burst(8, { x: 182, y: FY - 20, g: 500, s0: 60, s1: 140, a0: -Math.PI, a1: 0, life: 1.4, sizes: [2, 3], color: [C.chair, C.chairS, C.metal], floor: FY - 1 });
    yield 'line';

    S.alex.pose = 'kneel';
    yield* say(cs, 'alex', '(dropping to her knees, arms outstretched) No, Daddy, NOOOOOO!!! Not again!');
    S.zach.face = 1;
    S.zach.pose = 'turn';
    yield* say(cs, 'zach', '(slowly turning to her) ...Again?');
    S.alex.pose = 'away';
    yield* say(cs, 'alex', '(not making eye contact) We don’t talk about Brandon.');
    S.zach.pose = 'shock';
    yield* say(cs, 'zach', 'WHO IS BRANDON?');

    S.zach.face = -1;
    showNarr(cs, 'The beast plants one slipper on the coffee table, rises to full height, and lets out a roar that sets off every smoke detector in the house. Somewhere, Gary from church feels it.');
    S.dad.stomp = true;
    sfx.stomp();
    EC.fx.shake(3, 0.3);
    yield 0.7;
    S.dad.roar = true;
    sfx.roar(1.9);
    EC.fx.shake(5, 1.6);
    yield 0.8;
    S.smoke = 6;
    sfx.beeps(12, 0.32);
    yield 0.5;
    cs.tween(S, { gary: 1 }, 0.4);
    yield 2.4;
    yield 'line';
    S.dad.roar = false;
    cs.tween(S, { gary: 0 }, 0.3);
    S.dad.roar = true;
    sfx.roar(1.4);
    EC.fx.shake(3, 1.2);
    yield* say(cs, 'beast', '(voice like a lawnmower through a megaphone) WHERE. IS. MY. GAME.', { loud: true });

    // SMASH CUT TO BLACK.
    clearText();
    sfx.smash();
    S.view = 'black';
    S.smoke = 0;
    yield 1.1;
    yield* titleCard(S, cs);
  }

  function* titleCard(S, cs) {
    clearText();
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
    yield* narr(cs, 'Zach tumbles out onto the lawn' + (info.gift ? ', Theo’s gift clutched to his chest.' : '.'), 'EXT. FRONT PORCH — NIGHT');
    zz.face = -1;
    zz.pose = 'worry';
    S.beastRoar = false;
    cs.tween(S, { beast: 1 }, 0.4, EC.ease.out);
    sfx.stomp();
    EC.fx.shake(3, 0.3);
    yield 0.4;
    yield* narr(cs, 'The beast fills the doorway. He stops. He looks down at his slippers. He looks at the wet grass.');
    yield* say(cs, 'beast', 'THESE. ARE. MY. INDOOR. SLIPPERS.', { loud: true });
    showNarr(cs, 'He closes the door very gently. Click. Then the porch light goes off.');
    cs.tween(S, { door: 0 }, 0.7);
    yield 0.75;
    S.beast = 0;
    sfx.click();
    yield 0.6;
    S.porch = 0;
    sfx.lightsOff();
    yield 'line';
    yield* say(cs, 'alex', '(muffled, from inside) Tell Theo happy birthday!');
    yield* say(cs, 'zach', '...Is she just staying in there?');
    if (!info.gift) {
      zz.pose = 'shock';
      yield* say(cs, 'zach', '(patting his pockets) The gift. I left Theo’s gift in there.');
      showNarr(cs, 'The porch light flicks on. Then off. Then on. Zach is not going back in there.');
      for (let i = 0; i < 3; i++) {
        S.porch = 1;
        sfx.click();
        yield 0.35;
        S.porch = 0;
        sfx.click();
        yield 0.35;
      }
      S.porch = 1;
      yield 'line';
    }
    zz.pose = 'phone';
    zz.face = 1;
    S.phone = 1;
    sfx.buzz();
    yield 0.9;
    const disks = info.disks || 0;
    let text = 'hey. this is brandon. he does this every time someone promises him a game. you have until Easter.';
    if (disks >= info.disksTotal) text = 'hey. this is brandon. heard you got every backup of eddie’s couch out of there. that’s further than i ever got. respect.';
    yield* say(cs, 'phone', text, { label: 'UNKNOWN NUMBER' });
    zz.pose = 'shock';
    yield* say(cs, 'zach', 'WHO IS BRANDON?!');
    clearText();
    cs.tween(S, { black: 0.55 }, 0.6);
    yield 0.6;
  };
})();

/* Eddie's Couch 2 — core: canvas sizing, input, the loop, screen effects, particles and the text overlays. */
(function () {
  'use strict';
  const EC = (window.EC = window.EC || {});

  EC.W = 480;
  EC.H = 270;
  EC.reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  EC.store = {
    get(key, fallback) {
      try {
        const v = window.localStorage.getItem('ec2:' + key);
        return v == null ? fallback : JSON.parse(v);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem('ec2:' + key, JSON.stringify(value));
      } catch (e) {
        /* storage unavailable: settings just won't stick */
      }
    },
  };

  EC.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  EC.lerp = (a, b, t) => a + (b - a) * t;
  EC.rand = (a, b) => a + Math.random() * (b - a);
  EC.pick = (list) => list[(Math.random() * list.length) | 0];
  EC.ease = {
    linear: (t) => t,
    in: (t) => t * t,
    out: (t) => 1 - (1 - t) * (1 - t),
    inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    outBack: (t) => {
      const c = 1.70158;
      return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
    },
  };
  EC.overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  EC.fmtTime = (s) => {
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return m + ':' + (r < 10 ? '0' : '') + r;
  };

  // ---------------------------------------------------------------- canvas
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const screenEl = document.getElementById('screen');
  const tvEl = document.getElementById('tv');
  EC.canvas = canvas;
  EC.ctx = ctx;
  EC.screenEl = screenEl;
  EC.S = 2;

  EC.fit = function () {
    const bodyCS = getComputedStyle(document.body);
    const padX = parseFloat(bodyCS.paddingLeft) + parseFloat(bodyCS.paddingRight);
    const padY = parseFloat(bodyCS.paddingTop) + parseFloat(bodyCS.paddingBottom);
    const gap = parseFloat(bodyCS.rowGap) || 0;
    let below = 0;
    document.querySelectorAll('.below').forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.position === 'fixed' || cs.position === 'absolute') return;
      below += el.offsetHeight + gap;
    });
    const chromeW = tvEl.offsetWidth - screenEl.offsetWidth;
    const chromeH = tvEl.offsetHeight - screenEl.offsetHeight;
    const rootCS = getComputedStyle(document.documentElement);
    const rootPadY = (parseFloat(rootCS.paddingTop) || 0) + (parseFloat(rootCS.paddingBottom) || 0);
    let availW = document.documentElement.clientWidth - padX - chromeW;
    // Phones in landscape: the touch controls sit beside the TV, so leave them room.
    const touch = document.getElementById('touch');
    const tcs = getComputedStyle(touch);
    if (tcs.display !== 'none' && tcs.position === 'fixed') {
      let side = 0;
      touch.querySelectorAll('.cluster').forEach((c) => (side = Math.max(side, c.offsetWidth)));
      availW = Math.min(availW, document.documentElement.clientWidth - 2 * (side + 20) - chromeW);
    }
    const availH = window.innerHeight - rootPadY - padY - chromeH - below;
    let w = Math.min(availW, (availH * 16) / 9, 1280);
    w = Math.max(200, Math.floor(w));
    const h = Math.round((w * 9) / 16);
    screenEl.style.width = w + 'px';
    screenEl.style.height = h + 'px';
    const dpr = window.devicePixelRatio || 1;
    const S = EC.clamp(Math.ceil((w * dpr) / EC.W), 1, 6);
    if (canvas.width !== EC.W * S) {
      canvas.width = EC.W * S;
      canvas.height = EC.H * S;
    }
    EC.S = S;
  };
  window.addEventListener('resize', () => EC.fit());
  window.addEventListener('orientationchange', () => setTimeout(EC.fit, 120));

  // ---------------------------------------------------------------- input
  const BIND = {
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    down: ['ArrowDown', 'KeyS'],
    jump: ['Space', 'ArrowUp', 'KeyW'],
    a: ['KeyZ', 'KeyJ'],
    b: ['KeyX', 'KeyK', 'ShiftLeft', 'ShiftRight'],
    confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyZ', 'KeyX', 'KeyJ', 'KeyK'],
    pause: ['KeyP', 'Escape'],
    skip: ['Escape'],
    mute: ['KeyM'],
  };
  const codeToActs = {};
  Object.keys(BIND).forEach((act) => BIND[act].forEach((code) => (codeToActs[code] = codeToActs[code] || []).push(act)));
  const keysDown = new Set();
  const fresh = new Set();
  const touchHeld = {};
  let padHeld = {};
  const input = (EC.input = { held: {}, pressed: {}, device: 'keyboard', runLatch: false });

  function unlockAudio() {
    if (EC.audio) EC.audio.unlock();
  }
  function setTouchUI() {
    if (!document.body.classList.contains('touch-ui')) {
      document.body.classList.add('touch-ui');
      EC.fit();
    }
  }

  window.addEventListener('keydown', (e) => {
    const acts = codeToActs[e.code];
    if (!acts || e.metaKey || e.ctrlKey || e.altKey) return;
    const onButton = e.target && e.target.closest && e.target.closest('button');
    if (onButton && (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter')) return;
    e.preventDefault();
    input.device = 'keyboard';
    if (!e.repeat) acts.forEach((a) => fresh.add(a));
    keysDown.add(e.code);
    unlockAudio();
  });
  window.addEventListener('keyup', (e) => keysDown.delete(e.code));
  window.addEventListener('blur', () => {
    keysDown.clear();
    Object.keys(touchHeld).forEach((k) => (touchHeld[k] = false));
    if (EC.onBlur) EC.onBlur();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && EC.onBlur) EC.onBlur();
    if (EC.audio) EC.audio.onVisibility(document.hidden);
  });

  input.setRunLatch = function (on) {
    input.runLatch = on;
    const btn = document.querySelector('.touch [data-act="b"]');
    if (btn) btn.classList.toggle('latched', on);
  };

  document.querySelectorAll('[data-act]').forEach((btn) => {
    const act = btn.dataset.act;
    const face = act === 'a' || act === 'b' || act === 'jump';
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      input.device = 'touch';
      setTouchUI();
      unlockAudio();
      if (act === 'b') input.setRunLatch(!input.runLatch);
      touchHeld[act] = true;
      fresh.add(act);
      if (face) fresh.add('confirm');
      btn.classList.add('down');
      try {
        btn.setPointerCapture(e.pointerId);
      } catch (err) {
        /* capture not supported */
      }
    });
    const up = () => {
      touchHeld[act] = false;
      btn.classList.remove('down');
    };
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  });

  screenEl.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    if (e.pointerType === 'touch') {
      input.device = 'touch';
      setTouchUI();
    }
    unlockAudio();
    fresh.add('confirm');
    fresh.add('tap');
    screenEl.focus({ preventScroll: true });
  });

  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(pointer: fine)').matches) {
    document.body.classList.add('touch-ui');
    input.device = 'touch';
  }

  function pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let p = null;
    for (let i = 0; i < pads.length; i++) if (pads[i] && pads[i].connected) { p = pads[i]; break; }
    const now = {};
    if (p) {
      const b = (i) => !!(p.buttons[i] && p.buttons[i].pressed);
      const ax = p.axes[0] || 0;
      const ay = p.axes[1] || 0;
      now.left = b(14) || ax < -0.45;
      now.right = b(15) || ax > 0.45;
      now.down = b(13) || ay > 0.6;
      now.jump = b(2) || b(3) || b(12);
      now.a = b(0);
      now.b = b(1) || b(5) || b(7);
      now.pause = b(9);
      now.confirm = b(0) || b(1) || b(2) || b(3);
      now.skip = b(8);
      Object.keys(now).forEach((k) => {
        if (now[k] && !padHeld[k]) {
          fresh.add(k);
          input.device = 'pad';
        }
      });
    }
    padHeld = now;
  }

  input.poll = function () {
    pollPad();
    Object.keys(BIND).forEach((act) => {
      let h = !!touchHeld[act] || !!padHeld[act];
      if (!h) for (const code of BIND[act]) if (keysDown.has(code)) { h = true; break; }
      input.held[act] = h;
      input.pressed[act] = fresh.has(act);
    });
    input.pressed.tap = fresh.has('tap');
    fresh.clear();
  };
  input.running = () => !!input.held.b || input.runLatch;
  input.clear = () => {
    fresh.clear();
    Object.keys(input.pressed).forEach((k) => (input.pressed[k] = false));
  };

  // ---------------------------------------------------------------- loop
  EC.start = function (update, render) {
    const STEP = 1 / 60;
    let last = performance.now();
    let acc = 0;
    function frame(now) {
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.1) dt = 0.1;
      acc += dt;
      let n = 0;
      while (acc >= STEP && n < 6) {
        input.poll();
        update(STEP);
        acc -= STEP;
        n++;
      }
      ctx.setTransform(EC.S, 0, 0, EC.S, 0, 0);
      ctx.imageSmoothingEnabled = false;
      render();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };

  // ---------------------------------------------------------------- screen effects
  EC.fx = {
    shakeT: 0,
    shakeAmt: 0,
    flashT: 0,
    flashMax: 1,
    flashColor: '#fff',
    iris: null,
    shake(amount, time) {
      this.shakeAmt = Math.max(this.shakeAmt, amount * (EC.reducedMotion ? 0.2 : 1));
      this.shakeT = Math.max(this.shakeT, time);
    },
    flash(color, time) {
      this.flashColor = color;
      this.flashT = this.flashMax = time;
    },
    // A circular wipe: opens out from (cx, cy), or closes in on it.
    irisTo(open, cx, cy, dur, done) {
      const full = Math.hypot(EC.W, EC.H);
      const cur = this.iris ? this.iris.r : open ? 0 : full;
      this.iris = { cx, cy, from: cur, to: open ? full : 0, r: cur, t: 0, dur: dur || 0.8, done, open };
    },
    update(dt) {
      this.shakeT = Math.max(0, this.shakeT - dt);
      if (!this.shakeT) this.shakeAmt = 0;
      this.flashT = Math.max(0, this.flashT - dt);
      const ir = this.iris;
      if (ir && ir.t < ir.dur) {
        ir.t = Math.min(ir.dur, ir.t + dt);
        ir.r = EC.lerp(ir.from, ir.to, EC.ease.inOut(ir.t / ir.dur));
        if (ir.t >= ir.dur) {
          const cb = ir.done;
          ir.done = null;
          if (ir.open) this.iris = null;
          if (cb) cb();
        }
      }
    },
    offset() {
      if (!this.shakeT) return [0, 0];
      const a = this.shakeAmt * Math.min(1, this.shakeT * 4);
      return [Math.round(EC.rand(-a, a)), Math.round(EC.rand(-a, a))];
    },
    drawFlash(g) {
      if (!this.flashT) return;
      g.globalAlpha = (this.flashT / this.flashMax) * (EC.reducedMotion ? 0.3 : 0.8);
      g.fillStyle = this.flashColor;
      g.fillRect(0, 0, EC.W, EC.H);
      g.globalAlpha = 1;
    },
    drawIris(g) {
      const ir = this.iris;
      if (!ir) return;
      g.save();
      g.beginPath();
      g.rect(-2, -2, EC.W + 4, EC.H + 4);
      g.arc(ir.cx, ir.cy, Math.max(0, ir.r), 0, Math.PI * 2, true);
      g.fillStyle = '#000';
      g.fill('evenodd');
      g.restore();
    },
    reset() {
      this.shakeT = this.shakeAmt = this.flashT = 0;
    },
  };

  // ---------------------------------------------------------------- particles
  EC.Particles = class {
    constructor() {
      this.list = [];
    }
    add(p) {
      this.list.push(
        Object.assign({ x: 0, y: 0, vx: 0, vy: 0, g: 600, life: 1, size: 2, color: '#fff', rot: 0, vr: 0, floor: null, bounce: 0.35, walls: null, onBounce: null }, p, { t: 0 })
      );
    }
    burst(n, base) {
      for (let i = 0; i < n; i++) {
        const a = EC.rand(base.a0 == null ? 0 : base.a0, base.a1 == null ? Math.PI * 2 : base.a1);
        const s = EC.rand(base.s0 || 40, base.s1 || 160);
        this.add(Object.assign({}, base, { vx: Math.cos(a) * s, vy: Math.sin(a) * s, color: Array.isArray(base.color) ? EC.pick(base.color) : base.color, size: base.sizes ? EC.pick(base.sizes) : base.size, life: EC.rand(base.life * 0.6, base.life) }));
      }
    }
    update(dt) {
      const out = [];
      for (const p of this.list) {
        p.t += dt;
        if (p.t >= p.life) continue;
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (p.floor != null && p.y > p.floor) {
          p.y = p.floor;
          if (Math.abs(p.vy) > 40) {
            p.vy *= -p.bounce;
            if (p.onBounce) p.onBounce(p);
          } else p.vy = 0;
          p.vx *= 0.7;
          p.vr *= 0.6;
        }
        if (p.walls) {
          if (p.x < p.walls[0] || p.x > p.walls[1]) {
            p.x = EC.clamp(p.x, p.walls[0], p.walls[1]);
            p.vx *= -0.8;
            if (p.onBounce) p.onBounce(p);
          }
          if (p.y < p.walls[2]) {
            p.y = p.walls[2];
            p.vy *= -0.8;
            if (p.onBounce) p.onBounce(p);
          }
        }
        out.push(p);
      }
      this.list = out;
    }
    draw(g, camX) {
      camX = camX || 0;
      for (const p of this.list) {
        const fade = p.fade === false ? 1 : Math.min(1, (p.life - p.t) / 0.3);
        g.globalAlpha = fade;
        if (p.spr) EC.art.put(g, p.spr, p.x - camX, p.y, { rot: p.rot });
        else {
          g.fillStyle = p.color;
          g.fillRect(Math.round(p.x - camX - p.size / 2), Math.round(p.y - p.size / 2), p.size, p.size);
        }
      }
      g.globalAlpha = 1;
    }
    clear() {
      this.list = [];
    }
  };

  // ---------------------------------------------------------------- text overlays
  const $ = (id) => document.getElementById(id);
  const ui = (EC.ui = {});
  const srEl = $('sr');
  ui.announce = (text) => {
    srEl.textContent = '';
    setTimeout(() => (srEl.textContent = text), 30);
  };

  function esc(s) {
    return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  }
  // Markup: _words_ render as emphasis.
  function parse(text) {
    const segs = [];
    const re = /_([^_]+)_/g;
    let last = 0;
    let m;
    while ((m = re.exec(text))) {
      if (m.index > last) segs.push({ tag: '', s: text.slice(last, m.index) });
      segs.push({ tag: 'i', s: m[1] });
      last = re.lastIndex;
    }
    if (last < text.length) segs.push({ tag: '', s: text.slice(last) });
    return segs;
  }
  function plain(segs) {
    return segs.map((s) => s.s).join('');
  }

  // Dialogue typewriter. It lingers on punctuation so lines land like they're spoken.
  class Typer {
    constructor(el, opts) {
      this.el = el;
      this.line = el.querySelector('.line');
      this.extra = opts || {};
      this.active = false;
      this.done = true;
      this.segs = [];
      this.text = '';
      this.len = 0;
      this.shown = 0;
      this.hold = 0;
      this.voice = null;
      this.speed = 50;
      this.blipAcc = 0;
    }
    show(text, o) {
      o = o || {};
      this.segs = parse(text);
      this.text = plain(this.segs);
      this.len = this.text.length;
      this.shown = 0;
      this.hold = 0;
      this.done = false;
      this.active = true;
      this.voice = o.voice || null;
      this.speed = o.speed || (o.loud ? 24 : 50);
      this.blipAcc = 0;
      if (this.extra.setup) this.extra.setup(this, o);
      this.el.hidden = false;
      this.render();
      ui.announce((o.label ? o.label + ': ' : '') + this.text);
    }
    render() {
      let left = Math.floor(this.shown);
      let html = '';
      let rest = '';
      for (const seg of this.segs) {
        const take = Math.max(0, Math.min(seg.s.length, left));
        left -= take;
        const shownPart = esc(seg.s.slice(0, take));
        const hidden = esc(seg.s.slice(take));
        const open = seg.tag ? '<' + seg.tag + '>' : '';
        const close = seg.tag ? '</' + seg.tag + '>' : '';
        if (shownPart) html += open + shownPart + close;
        if (hidden) rest += open + hidden + close;
      }
      this.line.innerHTML = html + (rest ? '<span class="rest">' + rest + '</span>' : '');
      const more = this.el.querySelector('.more');
      if (more) more.hidden = !this.done;
    }
    update(dt) {
      if (!this.active || this.done) return;
      if (this.hold > 0) {
        this.hold -= dt;
        return;
      }
      const before = Math.floor(this.shown);
      this.shown = Math.min(this.len, this.shown + this.speed * dt);
      let after = Math.floor(this.shown);
      if (after === before) return;
      // stop at the first pause-worthy character we crossed
      for (let i = before; i < after; i++) {
        const ch = this.text[i];
        const next = this.text[i + 1];
        let pause = 0;
        if (ch === '.' && next === '.') pause = 0;
        else if (ch === '.' || ch === '?' || ch === '!') pause = next === ' ' ? 0.28 : 0;
        else if (ch === '—') pause = 0.22;
        else if (ch === ',') pause = 0.12;
        if (ch === '.' && this.text[i - 1] === '.' && next !== '.') pause = 0.35;
        if (pause && i + 1 < this.len) {
          after = i + 1;
          this.shown = after;
          this.hold = pause;
          break;
        }
      }
      this.blipAcc += after - before;
      if (this.voice && this.blipAcc >= 2) {
        this.blipAcc = 0;
        EC.audio.sfx.blip(this.voice);
      }
      if (after >= this.len) this.done = true;
      this.render();
    }
    // Returns true when the line was already complete (caller may move on).
    confirm() {
      if (!this.active) return true;
      if (!this.done) {
        this.shown = this.len;
        this.hold = 0;
        this.done = true;
        this.render();
        return false;
      }
      return true;
    }
    hide() {
      this.active = false;
      this.done = true;
      this.el.hidden = true;
      this.el.classList.remove('loud', 'muffled');
    }
  }

  const dialogEl = $('dialog');
  const portraitEl = dialogEl.querySelector('.portrait');
  ui.dialog = new Typer(dialogEl, {
    setup(t, o) {
      dialogEl.dataset.who = o.who || '';
      dialogEl.querySelector('.who').textContent = o.label || '';
      dialogEl.querySelector('.who').hidden = !o.label;
      dialogEl.classList.toggle('loud', !!o.loud);
      dialogEl.classList.toggle('muffled', !!o.muffled);
      dialogEl.classList.toggle('top', !!o.top);
      const p = o.portrait;
      portraitEl.hidden = !p;
      if (p) {
        portraitEl.width = p.w * 4;
        portraitEl.height = p.h * 4;
        const pg = portraitEl.getContext('2d');
        pg.imageSmoothingEnabled = false;
        pg.clearRect(0, 0, portraitEl.width, portraitEl.height);
        pg.drawImage(p.img, p.x, p.y, p.w, p.h, 0, 0, p.w * 4, p.h * 4);
      }
    },
  });

  const bubbleEl = $('bubble-zach');
  ui.bubble = {
    t: 0,
    say(text, dur) {
      bubbleEl.textContent = text;
      bubbleEl.hidden = false;
      bubbleEl.classList.remove('pop');
      void bubbleEl.offsetWidth;
      bubbleEl.classList.add('pop');
      this.t = dur || 0.9;
    },
    // x, y in internal screen pixels (480x270)
    place(x, y) {
      if (bubbleEl.hidden) return;
      bubbleEl.style.left = EC.clamp((x / EC.W) * 100, 8, 92) + '%';
      bubbleEl.style.top = EC.clamp((y / EC.H) * 100, 14, 96) + '%';
    },
    update(dt) {
      if (this.t > 0) {
        this.t -= dt;
        if (this.t <= 0) bubbleEl.hidden = true;
      }
    },
    hide() {
      bubbleEl.hidden = true;
      this.t = 0;
    },
  };

  const hudEl = $('hud');
  let hudPrev = null;
  function pulse(el) {
    el.classList.remove('pulse');
    void el.offsetWidth;
    el.classList.add('pulse');
  }
  ui.hud = {
    show(on) {
      hudEl.hidden = !on;
      if (!on) hudPrev = null;
    },
    set(s) {
      $('hud-key').classList.toggle('off', !s.key);
      $('hud-gift').classList.toggle('off', !s.gift);
      $('hud-time').textContent = EC.fmtTime(s.time);
      if (hudPrev) {
        if (s.key && !hudPrev.key) pulse($('hud-key'));
        if (s.gift && !hudPrev.gift) pulse($('hud-gift'));
      }
      hudPrev = { key: s.key, gift: s.gift };
    },
  };

  const tutEl = $('tutorial');
  ui.tutorial = {
    show(html) {
      tutEl.innerHTML = html;
      tutEl.hidden = false;
    },
    hide() {
      tutEl.hidden = true;
    },
  };

  const promptEl = $('prompt');
  ui.prompt = {
    show(html, blink) {
      promptEl.innerHTML = html;
      promptEl.hidden = false;
      promptEl.classList.toggle('blink', !!blink);
    },
    hide() {
      promptEl.hidden = true;
    },
  };

  const panelEl = $('panel');
  ui.panel = {
    open: false,
    primary: null,
    show(o) {
      const h = panelEl.querySelector('h2');
      h.textContent = o.title;
      h.classList.toggle('red', !!o.red);
      const body = panelEl.querySelector('.body');
      body.innerHTML = o.html || '';
      body.hidden = !o.html;
      const actions = panelEl.querySelector('.actions');
      actions.innerHTML = '';
      this.primary = null;
      (o.buttons || []).forEach((b, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = b.label;
        if (b.primary || i === 0) btn.className = 'primary';
        btn.addEventListener('click', () => {
          EC.audio.unlock();
          b.onClick();
        });
        actions.appendChild(btn);
        if (!this.primary) this.primary = b.onClick;
      });
      panelEl.hidden = false;
      this.open = true;
      const first = actions.querySelector('button');
      if (first) setTimeout(() => first.focus({ preventScroll: true }), 30);
      ui.announce(o.title);
    },
    hide() {
      panelEl.hidden = true;
      this.open = false;
      this.primary = null;
      if (document.activeElement && panelEl.contains(document.activeElement)) screenEl.focus({ preventScroll: true });
    },
  };

  const skipEl = $('skip');
  ui.skip = {
    show(on) {
      skipEl.hidden = !on;
    },
  };
  skipEl.addEventListener('click', () => {
    EC.audio.unlock();
    if (EC.onSkip) EC.onSkip();
  });

  const recEl = $('rec');
  ui.rec = (on) => recEl.classList.toggle('on', !!on);

  // Button glyphs for the current input device
  ui.glyph = (btn) => {
    const g = '<b class="btn-glyph ' + btn.toLowerCase() + '">' + btn + '</b>';
    if (input.device === 'touch' || input.device === 'pad') return g;
    return g + ' <kbd>' + (btn === 'A' ? 'Z' : 'X') + '</kbd>';
  };
})();

/* Eddie's Couch 2 — every sound is synthesized with Web Audio; no files to load. */
(function () {
  'use strict';
  const EC = window.EC;
  const A = (EC.audio = {});

  let ac = null;
  let master = null;
  let sfxBus = null;
  let musicBus = null;
  let noiseBuf = null;
  let crushCurve = null;
  let muted = EC.store.get('muted', false);
  let pendingSong = null;
  const MASTER = 0.7;
  const MUSIC = 0.3;

  function makeCurve(k) {
    const n = 512;
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      c[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
    }
    return c;
  }

  A.unlock = function () {
    if (!ac) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      try {
        ac = new Ctx();
      } catch (e) {
        return;
      }
      master = ac.createGain();
      master.gain.value = muted ? 0 : MASTER;
      master.connect(ac.destination);
      sfxBus = ac.createGain();
      sfxBus.gain.value = 0.9;
      sfxBus.connect(master);
      musicBus = ac.createGain();
      musicBus.gain.value = MUSIC;
      musicBus.connect(master);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      crushCurve = makeCurve(60);
      if (pendingSong) {
        const s = pendingSong;
        pendingSong = null;
        A.music(s);
      }
    }
    if (ac.state === 'suspended') ac.resume();
  };
  A.onVisibility = function (hidden) {
    if (!ac) return;
    if (hidden) ac.suspend();
    else if (!document.hidden) ac.resume();
  };
  A.muted = () => muted;
  A.setMuted = function (m) {
    muted = m;
    EC.store.set('muted', m);
    if (master) master.gain.setTargetAtTime(m ? 0 : MASTER, ac.currentTime, 0.02);
  };

  function now() {
    return ac ? ac.currentTime : 0;
  }

  function tone(o) {
    if (!ac) return;
    const t = (o.when || ac.currentTime) + (o.delay || 0);
    const osc = ac.createOscillator();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t + (o.slide || o.dur));
    const g = ac.createGain();
    const v = o.vol == null ? 0.2 : o.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (o.attack || 0.005));
    if (o.hold) g.gain.setValueAtTime(v, t + o.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    let node = osc;
    if (o.vib) {
      const lfo = ac.createOscillator();
      const lg = ac.createGain();
      lfo.frequency.value = o.vib[0];
      lg.gain.value = o.vib[1];
      lfo.connect(lg);
      lg.connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + o.dur + 0.05);
    }
    if (o.filter) {
      const f = ac.createBiquadFilter();
      f.type = o.filter[0];
      f.frequency.value = o.filter[1];
      f.Q.value = o.filter[2] || 1;
      node.connect(f);
      node = f;
    }
    if (o.crush) {
      const ws = ac.createWaveShaper();
      ws.curve = crushCurve;
      node.connect(ws);
      node = ws;
    }
    node.connect(g);
    g.connect(o.bus || sfxBus);
    osc.start(t);
    osc.stop(t + o.dur + 0.05);
  }

  function noise(o) {
    if (!ac) return;
    const t = (o.when || ac.currentTime) + (o.delay || 0);
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ac.createBiquadFilter();
    f.type = o.ftype || 'lowpass';
    f.frequency.setValueAtTime(o.f || 2000, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur);
    f.Q.value = o.q || 0.8;
    const g = ac.createGain();
    const v = o.vol == null ? 0.3 : o.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (o.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f);
    f.connect(g);
    g.connect(o.bus || sfxBus);
    src.start(t, Math.random());
    src.stop(t + o.dur + 0.05);
  }

  const VOICES = {
    zach: { type: 'square', f: 540, vol: 0.045 },
    alex: { type: 'triangle', f: 780, vol: 0.09 },
    alexm: { type: 'triangle', f: 560, vol: 0.07, filter: ['lowpass', 650] },
    zachm: { type: 'square', f: 420, vol: 0.05, filter: ['lowpass', 500] },
    mom: { type: 'triangle', f: 640, vol: 0.085, vib: true },
    dad: { type: 'square', f: 175, vol: 0.05, filter: ['lowpass', 1400] },
    beast: { type: 'sawtooth', f: 72, vol: 0.16, crush: true },
    gary: { type: 'triangle', f: 330, vol: 0.08 },
    phone: { type: 'sine', f: 1200, vol: 0.05 },
  };

  const sfx = (A.sfx = {
    blip(who) {
      if (who === 'script') {
        noise({ f: 2600, ftype: 'bandpass', q: 3, dur: 0.03, vol: 0.13 });
        return;
      }
      const v = VOICES[who];
      if (!v) return;
      tone({ type: v.type, f: v.f * EC.rand(0.9, 1.12), dur: 0.055, vol: v.vol, crush: v.crush, filter: v.filter, vib: v.vib ? [9, 18] : null });
    },
    tick(alt) {
      noise({ f: alt ? 3400 : 2500, ftype: 'bandpass', q: 7, dur: 0.05, vol: 0.28 });
      tone({ type: 'sine', f: alt ? 1500 : 1150, dur: 0.035, vol: 0.05 });
    },
    horn() {
      tone({ type: 'sawtooth', f: 330, f2: 350, dur: 0.75, vol: 0.13, hold: 0.55, vib: [10, 16], filter: ['bandpass', 1300, 2] });
      tone({ type: 'square', f: 166, dur: 0.75, vol: 0.05, hold: 0.55, vib: [10, 8] });
    },
    door() {
      noise({ f: 1100, f2: 200, dur: 0.3, vol: 0.55 });
      tone({ type: 'sine', f: 95, f2: 38, dur: 0.35, vol: 0.55 });
    },
    thunder() {
      noise({ f: 4000, f2: 300, dur: 0.5, vol: 0.45 });
      noise({ f: 700, f2: 60, dur: 2.8, vol: 0.65, attack: 0.03 });
      tone({ type: 'sine', f: 52, f2: 28, dur: 2.4, vol: 0.45, attack: 0.05 });
    },
    ping() {
      tone({ type: 'triangle', f: 2300, f2: 1300, dur: 0.18, vol: 0.16 });
      tone({ type: 'sine', f: 3400, f2: 2600, dur: 0.09, vol: 0.06 });
    },
    roar(len) {
      len = len || 1.7;
      tone({ type: 'sawtooth', f: 88, f2: 52, dur: len, vol: 0.32, vib: [13, 20], crush: true, attack: 0.06, hold: len * 0.6 });
      tone({ type: 'square', f: 61, f2: 41, dur: len, vol: 0.18, vib: [7, 10], crush: true, attack: 0.06, hold: len * 0.6 });
      noise({ f: 1000, f2: 260, dur: len, vol: 0.4, attack: 0.06 });
    },
    whine() {
      tone({ type: 'square', f: 640, f2: 120, dur: 1.4, vol: 0.07, vib: [16, 34], filter: ['lowpass', 1800] });
      noise({ f: 500, dur: 0.3, vol: 0.3, delay: 1.1 });
    },
    beeps(n, gap) {
      for (let i = 0; i < n; i++) tone({ type: 'square', f: 3150, dur: 0.11, vol: 0.06, delay: i * (gap || 0.38) });
    },
    smash() {
      noise({ f: 2600, f2: 260, dur: 0.6, vol: 0.75 });
      noise({ f: 6000, ftype: 'highpass', dur: 0.22, vol: 0.25 });
      tone({ type: 'sine', f: 125, f2: 34, dur: 0.45, vol: 0.65 });
    },
    jump() {
      tone({ type: 'square', f: 290, f2: 580, dur: 0.12, vol: 0.06, slide: 0.1 });
    },
    land() {
      noise({ f: 520, dur: 0.06, vol: 0.13 });
    },
    stomp() {
      tone({ type: 'sine', f: 72, f2: 38, dur: 0.16, vol: 0.32 });
      noise({ f: 380, dur: 0.08, vol: 0.18 });
    },
    disk() {
      [660, 880, 1320].forEach((f, i) => tone({ type: 'square', f, dur: 0.09, vol: 0.07, delay: i * 0.06 }));
    },
    key() {
      [1568, 2093, 2637, 3136].forEach((f, i) => tone({ type: 'triangle', f, dur: 0.14, vol: 0.12, delay: i * 0.05 }));
    },
    gift() {
      [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone({ type: 'square', f, dur: 0.1, vol: 0.06, delay: i * 0.07 }));
    },
    hit() {
      noise({ f: 1900, f2: 400, dur: 0.18, vol: 0.5 });
      tone({ type: 'square', f: 320, f2: 90, dur: 0.25, vol: 0.1 });
    },
    bonk() {
      tone({ type: 'triangle', f: 1700, f2: 820, dur: 0.3, vol: 0.13 });
      tone({ type: 'triangle', f: 2550, f2: 1500, dur: 0.22, vol: 0.06 });
    },
    squeak() {
      tone({ type: 'sine', f: 1050, f2: 1550, dur: 0.2, vol: 0.12, vib: [32, 140] });
    },
    slide() {
      noise({ f: 1300, ftype: 'bandpass', q: 1.2, dur: 0.32, vol: 0.14 });
    },
    whoosh() {
      noise({ f: 700, f2: 3200, ftype: 'bandpass', q: 2, dur: 0.26, vol: 0.2 });
    },
    rattle() {
      for (let i = 0; i < 5; i++) noise({ f: 3200, ftype: 'bandpass', q: 5, dur: 0.04, vol: 0.28, delay: i * 0.065 });
    },
    unlock() {
      noise({ f: 2500, ftype: 'bandpass', q: 4, dur: 0.05, vol: 0.3 });
      tone({ type: 'square', f: 880, dur: 0.05, vol: 0.08, delay: 0.1 });
      tone({ type: 'square', f: 590, dur: 0.07, vol: 0.08, delay: 0.2 });
    },
    creak() {
      tone({ type: 'sawtooth', f: 170, f2: 330, dur: 0.7, vol: 0.06, vib: [26, 34], filter: ['bandpass', 800, 3] });
    },
    sting() {
      [55, 58.27, 82.41, 110].forEach((f) => tone({ type: 'sawtooth', f, dur: 2.4, vol: 0.09, crush: true, attack: 0.02, hold: 1 }));
      noise({ f: 3000, f2: 120, dur: 1.6, vol: 0.4 });
    },
    buzz() {
      tone({ type: 'sawtooth', f: 150, dur: 0.32, vol: 0.09, vib: [34, 30], filter: ['lowpass', 900] });
      tone({ type: 'sawtooth', f: 150, dur: 0.32, vol: 0.09, vib: [34, 30], filter: ['lowpass', 900], delay: 0.45 });
    },
    pat() {
      noise({ f: 800, dur: 0.05, vol: 0.22 });
    },
    click() {
      noise({ f: 4000, ftype: 'highpass', dur: 0.03, vol: 0.25 });
    },
    trip() {
      tone({ type: 'square', f: 500, f2: 160, dur: 0.22, vol: 0.08 });
      noise({ f: 900, dur: 0.15, vol: 0.2, delay: 0.12 });
    },
    flicker() {
      noise({ f: 6000, ftype: 'highpass', dur: 0.06, vol: 0.18 });
      tone({ type: 'square', f: 60, dur: 0.12, vol: 0.06 });
    },
    lightsOff() {
      noise({ f: 3000, ftype: 'highpass', dur: 0.04, vol: 0.3 });
    },
    select() {
      tone({ type: 'square', f: 660, f2: 990, dur: 0.09, vol: 0.06 });
    },
    // ---- what it sounds like when he catches you
    crunch() {
      for (let i = 0; i < 3; i++) noise({ f: 2400 - i * 500, ftype: 'bandpass', q: 2, dur: 0.06, vol: 0.4, delay: i * 0.045 });
      tone({ type: 'square', f: 120, f2: 60, dur: 0.12, vol: 0.12 });
    },
    splat() {
      noise({ f: 900, f2: 120, dur: 0.28, vol: 0.55 });
      tone({ type: 'sine', f: 180, f2: 50, dur: 0.22, vol: 0.35 });
    },
    squirt() {
      noise({ f: 500, f2: 2600, ftype: 'bandpass', q: 3, dur: 0.35, vol: 0.25 });
    },
    pop() {
      tone({ type: 'sine', f: 950, f2: 180, dur: 0.12, vol: 0.4, slide: 0.08 });
      noise({ f: 5000, ftype: 'highpass', dur: 0.03, vol: 0.4 });
    },
    rip() {
      noise({ f: 700, f2: 4200, ftype: 'bandpass', q: 1.5, dur: 0.35, vol: 0.35 });
    },
    crack() {
      noise({ f: 6000, ftype: 'highpass', dur: 0.05, vol: 0.5 });
      tone({ type: 'square', f: 1500, f2: 300, dur: 0.06, vol: 0.12 });
    },
    stretch() {
      tone({ type: 'sawtooth', f: 90, f2: 340, dur: 0.9, vol: 0.08, vib: [20, 25], filter: ['lowpass', 900] });
    },
    inflate() {
      tone({ type: 'sine', f: 300, f2: 2400, dur: 0.8, vol: 0.08, vib: [14, 30] });
    },
    kachunk() {
      noise({ f: 1800, ftype: 'bandpass', q: 3, dur: 0.05, vol: 0.4 });
      tone({ type: 'square', f: 140, f2: 70, dur: 0.12, vol: 0.18, delay: 0.06 });
    },
    boing() {
      tone({ type: 'sine', f: 180, f2: 620, dur: 0.25, vol: 0.18, vib: [22, 40] });
    },
    whistle() {
      tone({ type: 'sine', f: 2400, f2: 700, dur: 0.6, vol: 0.06 });
    },
    thwack() {
      noise({ f: 1400, f2: 300, dur: 0.2, vol: 0.6 });
      tone({ type: 'triangle', f: 330, f2: 90, dur: 0.3, vol: 0.25 });
    },
    wish() {
      [1047, 1319, 1568, 2093, 2637].forEach((f, i) => tone({ type: 'triangle', f, dur: 0.22, vol: 0.08, delay: i * 0.07 }));
    },
    stamp() {
      tone({ type: 'sine', f: 110, f2: 55, dur: 0.18, vol: 0.45 });
      noise({ f: 700, dur: 0.1, vol: 0.35 });
    },
    organ() {
      [261.6, 329.6, 392, 523.3].forEach((f) => {
        tone({ type: 'square', f, dur: 2.4, vol: 0.035, attack: 0.15, hold: 1.8, filter: ['lowpass', 1800] });
        tone({ type: 'sine', f: f / 2, dur: 2.4, vol: 0.06, attack: 0.15, hold: 1.8 });
      });
    },
    cheer() {
      noise({ f: 1500, ftype: 'bandpass', q: 0.6, dur: 2.2, vol: 0.25, attack: 0.3 });
      for (let i = 0; i < 10; i++) tone({ type: 'triangle', f: 600 + Math.random() * 700, dur: 0.12, vol: 0.03, delay: 0.2 + Math.random() * 1.6 });
    },

    // ---- Mom
    mop() {
      noise({ f: 900, f2: 2200, ftype: 'bandpass', q: 1.2, dur: 0.18, vol: 0.16 });
    },
    crinkle() {
      for (let i = 0; i < 6; i++) noise({ f: 5000, ftype: 'highpass', dur: 0.03, vol: 0.12, delay: i * 0.04 + Math.random() * 0.02 });
    },
    squeegee() {
      tone({ type: 'sine', f: 1300, f2: 1900, dur: 0.35, vol: 0.07, vib: [40, 160] });
    },
    tsk() {
      noise({ f: 6000, ftype: 'highpass', dur: 0.02, vol: 0.3 });
      noise({ f: 6000, ftype: 'highpass', dur: 0.02, vol: 0.3, delay: 0.12 });
    },

    // Alex, shouting a warning from where she's hiding
    shout() {
      [0, 0.06, 0.12].forEach((d, i) => tone({ type: 'triangle', f: 900 + i * 140, f2: 1100 + i * 140, dur: 0.07, vol: 0.11, delay: d }));
    },
    crickets() {
      for (let i = 0; i < 6; i++) {
        const d = 0.3 + i * 0.55 + (i % 2) * 0.12;
        for (let k = 0; k < 3; k++) tone({ type: 'sine', f: 4200 + (i % 3) * 180, dur: 0.035, vol: 0.035, delay: d + k * 0.05 });
      }
    },
    powerOn() {
      tone({ type: 'sine', f: 60, f2: 15000, dur: 0.5, vol: 0.03, slide: 0.45 });
      noise({ f: 5000, ftype: 'highpass', dur: 0.25, vol: 0.08 });
    },
    sparkle() {
      [1760, 2350, 2960].forEach((f, i) => tone({ type: 'triangle', f, dur: 0.08, vol: 0.05, delay: i * 0.04 }));
    },
    lock() {
      tone({ type: 'square', f: 220, f2: 180, dur: 0.12, vol: 0.08 });
      noise({ f: 2600, ftype: 'bandpass', q: 5, dur: 0.05, vol: 0.25, delay: 0.05 });
    },
  });
  A.tone = tone;
  A.noise = noise;
  A.now = now;

  // ---------------------------------------------------------------- music
  const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  function hz(n) {
    const m = /^([A-G]#?)(\d)$/.exec(n);
    const midi = NOTE[m[1]] + (parseInt(m[2], 10) + 1) * 12;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  // Bass is written in eighth notes, lead and drums in sixteenths.
  const SONGS = {
    chase: {
      bpm: 158,
      bass: 'A2 A3 A2 A3 A2 A3 G2 G3 F2 F3 F2 F3 F2 F3 G2 G3 A2 A3 A2 A3 A2 A3 C3 C4 E2 E3 E2 E3 G#2 G#3 B2 B3'.split(' '),
      lead: (
        'E5 . . E5 . . D5 . E5 . . . C5 . B4 . ' +
        'C5 . . C5 . . B4 . C5 . . . A4 . G4 . ' +
        'A4 . C5 . E5 . A5 . G5 . E5 . C5 . E5 . ' +
        'G#5 . . . E5 . . . B4 . D5 . E5 . . .'
      ).split(' '),
      drums: 'K.h.S.h.K.KhS.hh'.split(''),
    },
    ending: {
      bpm: 128,
      bass: 'C3 G2 C3 G2 F2 C3 F2 C3 G2 D3 G2 D3 C3 G2 C3 E3'.split(' '),
      lead: (
        'C5 . E5 . G5 . E5 . F5 . A5 . G5 . . . ' +
        'E5 . D5 . C5 . D5 . E5 . . . C5 . . .'
      ).split(' '),
      drums: 'K.h.S.h.K.h.S.hh'.split(''),
      leadType: 'triangle',
      leadVol: 0.12,
    },
  };
  let seq = null;

  function tickSeq() {
    if (!seq || !ac) return;
    const s = seq.song;
    const stepDur = 60 / s.bpm / 4;
    if (seq.next < ac.currentTime - 0.05) seq.next = ac.currentTime + 0.05;
    while (seq.next < ac.currentTime + 0.12) {
      const i = seq.step;
      const t = seq.next;
      if (i % 2 === 0) {
        const n = s.bass[(i / 2) % s.bass.length];
        if (n && n !== '.') tone({ when: t, type: 'square', f: hz(n), dur: stepDur * 1.7, vol: 0.15, filter: ['lowpass', 850], bus: musicBus });
      }
      const l = s.lead[i % s.lead.length];
      if (l && l !== '.') tone({ when: t, type: s.leadType || 'square', f: hz(l), dur: stepDur * 1.7, vol: s.leadVol || 0.06, vib: [6, 4], bus: musicBus });
      const d = s.drums[i % s.drums.length];
      if (d === 'K') tone({ when: t, type: 'sine', f: 140, f2: 45, dur: 0.15, vol: 0.5, bus: musicBus });
      if (d === 'S') noise({ when: t, f: 1900, ftype: 'bandpass', q: 0.9, dur: 0.12, vol: 0.32, bus: musicBus });
      if (d === 'h') noise({ when: t, f: 7000, ftype: 'highpass', dur: 0.03, vol: 0.12, bus: musicBus });
      seq.next += stepDur;
      seq.step++;
    }
  }

  A.music = function (name) {
    if (!ac) {
      pendingSong = name;
      return;
    }
    if (seq && seq.name === name) return;
    A.stopMusic();
    const song = SONGS[name];
    if (!song) return;
    musicBus.gain.cancelScheduledValues(ac.currentTime);
    musicBus.gain.setValueAtTime(MUSIC, ac.currentTime);
    seq = { name, song, step: 0, next: ac.currentTime + 0.08, timer: setInterval(tickSeq, 25) };
    tickSeq();
  };
  A.stopMusic = function () {
    pendingSong = null;
    if (seq) {
      clearInterval(seq.timer);
      seq = null;
    }
  };
  A.duckMusic = function (on) {
    if (!ac) return;
    musicBus.gain.setTargetAtTime(on ? MUSIC * 0.25 : MUSIC, ac.currentTime, 0.05);
  };
})();

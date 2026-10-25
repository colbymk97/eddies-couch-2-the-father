/* Eddie's Couch 2 — the flow: title, intro, tutorial, the chase, game over, the ending. */
(function () {
  'use strict';
  const EC = window.EC;
  const ui = EC.ui;
  const A = EC.audio;
  const sfx = A.sfx;
  const input = EC.input;

  let mode = 'boot';
  let scene = null;
  let cs = null;
  let level = null;
  let tut = null;
  let hudKey = '';
  let seenIntro = EC.store.get('seenIntro', false);

  function clearOverlays() {
    ui.dialog.hide();
    ui.bubble.hide();
    ui.tutorial.hide();
    ui.prompt.hide();
    ui.panel.hide();
  }
  function setSkip(label) {
    const el = document.getElementById('skip');
    if (label) el.textContent = label;
    ui.skip.show(!!label);
  }

  // ---------------------------------------------------------------- title
  function goTitle(powerOn) {
    mode = 'title';
    clearOverlays();
    A.stopMusic();
    ui.hud.show(false);
    ui.rec(false);
    EC.fx.iris = null;
    scene = EC.scenes.newLiving();
    if (powerOn) scene.power = 0;
    ui.prompt.show('PRESS START<small>' + (input.device === 'touch' ? 'Tap the screen' : 'Enter, Space or a tap') + '</small>', true);
    setSkip(seenIntro ? 'Skip intro ▸▸' : null);
  }

  // ---------------------------------------------------------------- intro
  function startIntro() {
    mode = 'intro';
    clearOverlays();
    A.stopMusic();
    EC.fx.iris = null;
    ui.hud.show(false);
    ui.rec(false);
    scene = EC.scenes.newLiving();
    cs = new EC.Cutscene(EC.scenes.intro, scene);
    setSkip('Skip ▸▸');
    seenIntro = true;
    EC.store.set('seenIntro', true);
  }
  function skipIntro() {
    if (scene && scene.view === 'title') {
      startTutorial();
      return;
    }
    ui.dialog.hide();
    EC.fx.reset();
    cs = new EC.Cutscene(EC.scenes.titleOnly, scene);
    setSkip('Skip ▸▸');
  }

  // ---------------------------------------------------------------- tutorial
  function startTutorial(opts) {
    mode = 'tutorial';
    clearOverlays();
    A.stopMusic();
    setSkip(null);
    EC.fx.reset();
    level = new EC.Level(opts);
    ui.hud.show(true);
    hudKey = '';
    input.setRunLatch(false);
    const f = level.focus();
    EC.fx.irisTo(true, f.x, f.y, 0.9);
    tut = { step: 0, t: 0 };
    ui.tutorial.show('<p>Press ' + ui.glyph('A') + ' to apologize.</p>');
  }
  function updateTutorial(dt) {
    level.update(dt, 'tutorial');
    tut.t += dt;
    if (tut.step === 0 && input.pressed.a) {
      tut.step = 1;
      tut.t = 0;
      ui.tutorial.show('<p>Press ' + ui.glyph('A') + ' to apologize.</p><p class="aside">(It does nothing.)</p>');
    } else if (tut.step === 1 && tut.t > 1.7) {
      tut.step = 2;
      ui.tutorial.show('<p>Press ' + ui.glyph('B') + ' to run.</p>');
    } else if (tut.step === 2 && input.pressed.b) {
      ui.tutorial.hide();
      level.blowWall();
      A.music('chase');
      mode = 'play';
    }
  }

  // ---------------------------------------------------------------- the chase
  function updatePlay(dt) {
    level.update(dt, 'play');
    const h = level.hudState();
    const key = [h.disks, h.key, h.gift, Math.floor(h.time)].join('|');
    if (key !== hudKey) {
      hudKey = key;
      ui.hud.set(h);
    }
    if (input.pressed.pause) {
      pause();
      return;
    }
    if (level.caught && level.caughtT > 1.4) showCaught();
    else if (level.escaped) {
      // close in on the front door, then out onto the lawn
      mode = 'leaving';
      const f = level.doorFocus();
      A.stopMusic();
      EC.fx.irisTo(false, f.x, f.y, 0.8, startEnding);
    }
  }

  function pause() {
    if (mode !== 'play') return;
    mode = 'paused';
    A.duckMusic(true);
    ui.panel.show({
      title: 'PAUSED',
      buttons: [
        { label: 'Resume', onClick: resume },
        { label: 'Restart this room', onClick: retry },
        { label: 'Restart the level', onClick: () => startTutorial() },
        { label: 'Watch the intro', onClick: startIntro },
      ],
    });
  }
  function resume() {
    ui.panel.hide();
    mode = 'play';
    A.duckMusic(false);
    input.clear();
  }

  function showCaught() {
    mode = 'gameover';
    A.duckMusic(true);
    ui.panel.show({
      title: 'NOT GOOD ENOUGH.',
      red: true,
      buttons: [
        { label: 'Try again', onClick: retry },
        { label: 'Restart the level', onClick: () => startTutorial() },
      ],
    });
  }
  function retry() {
    ui.panel.hide();
    ui.prompt.hide();
    EC.fx.reset();
    level.loadCheckpoint(level.checkpoint);
    hudKey = '';
    mode = 'play';
    const f = level.focus();
    EC.fx.irisTo(true, f.x, f.y, 0.6);
    A.music('chase');
    A.duckMusic(false);
    input.clear();
  }

  // ---------------------------------------------------------------- the ending
  function startEnding() {
    mode = 'ending';
    EC.fx.iris = null;
    clearOverlays();
    ui.hud.show(false);
    ui.rec(false);
    scene = EC.scenes.newLawn();
    cs = new EC.Cutscene(EC.scenes.ending, scene, { gift: level.hasGift, disks: level.disksGot.size, disksTotal: EC.LEVEL.DISKS.length });
    setSkip('Skip ▸▸');
  }
  function showResults() {
    mode = 'results';
    setSkip(null);
    ui.dialog.hide();
    A.music('ending');
    const s = level.stats;
    const best = EC.store.get('best', null);
    const isBest = best == null || s.time < best;
    if (isBest) EC.store.set('best', s.time);
    const disks = level.disksGot.size;
    const total = EC.LEVEL.DISKS.length;
    const rows = [
      ['Time', EC.fmtTime(s.time) + (isBest ? ' (best)' : ' (best ' + EC.fmtTime(best) + ')')],
      ['Times caught', s.deaths],
      ['Hit by household objects', s.hits],
      ['Apologies', s.apologies + ' (accepted: 0)'],
      ['Eddie’s Couch backups', disks + '/' + total],
      ['The gift', level.hasGift ? 'Delivered' : 'Left behind'],
    ];
    ui.panel.show({
      title: 'YOU ESCAPED THE HOUSE.',
      html: '<dl>' + rows.map((r) => '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>').join('') + '</dl>',
      buttons: [
        { label: 'Play again', onClick: () => startTutorial() },
        { label: 'Watch the intro', onClick: startIntro },
      ],
    });
  }

  // ---------------------------------------------------------------- loop
  function update(dt) {
    EC.fx.update(dt);
    if (input.pressed.mute) toggleMute();
    switch (mode) {
      case 'title':
        EC.scenes.update(scene, dt);
        if (input.pressed.confirm) {
          sfx.select();
          startIntro();
        }
        break;
      case 'intro':
        EC.scenes.update(scene, dt);
        if (input.pressed.skip) {
          skipIntro();
          break;
        }
        cs.update(dt);
        if (cs.done) startTutorial();
        break;
      case 'tutorial':
        updateTutorial(dt);
        break;
      case 'play':
        updatePlay(dt);
        break;
      case 'leaving':
        level.update(dt, 'leaving');
        break;
      case 'paused':
        if (input.pressed.pause) resume();
        break;
      case 'gameover':
        level.update(dt, 'caught');
        break;
      case 'ending':
        EC.scenes.update(scene, dt);
        if (input.pressed.skip) {
          showResults();
          break;
        }
        cs.update(dt);
        if (cs.done) showResults();
        break;
      case 'results':
        EC.scenes.update(scene, dt);
        break;
    }
  }
  function render() {
    const g = EC.ctx;
    if ((mode === 'title' || mode === 'intro' || mode === 'ending' || mode === 'results') && scene) EC.scenes.draw(g, scene);
    else if (level && mode !== 'boot') level.draw(g);
    else {
      g.fillStyle = '#000';
      g.fillRect(0, 0, EC.W, EC.H);
    }
    EC.fx.drawIris(g);
  }

  // ---------------------------------------------------------------- the TV's buttons
  const soundBtn = document.getElementById('btn-sound');
  function syncSound() {
    soundBtn.setAttribute('aria-pressed', String(!A.muted()));
    soundBtn.textContent = A.muted() ? 'Muted' : 'Sound';
  }
  function toggleMute() {
    A.unlock();
    A.setMuted(!A.muted());
    syncSound();
  }
  soundBtn.addEventListener('click', toggleMute);
  document.getElementById('btn-pause').addEventListener('click', () => {
    A.unlock();
    if (mode === 'play') pause();
    else if (mode === 'paused') resume();
  });
  document.getElementById('btn-full').addEventListener('click', () => {
    const el = document.documentElement;
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    } catch (e) {
      /* fullscreen not available here */
    }
  });
  document.addEventListener('fullscreenchange', () => setTimeout(EC.fit, 60));
  syncSound();

  EC.onBlur = () => {
    if (mode === 'play') pause();
  };
  EC.onSkip = () => {
    if (mode === 'title') startTutorial();
    else if (mode === 'intro') skipIntro();
    else if (mode === 'ending') showResults();
  };
  // Enter/Z/X activate the first button on a panel when focus is elsewhere.
  window.addEventListener('keydown', (e) => {
    if (!ui.panel.open || !ui.panel.primary) return;
    if (e.target && e.target.closest && e.target.closest('button')) return;
    if (e.code === 'Enter' || e.code === 'KeyZ' || e.code === 'KeyX' || e.code === 'Space') {
      e.preventDefault();
      ui.panel.primary();
    }
  });

  // ---------------------------------------------------------------- boot
  function boot(data) {
    EC.fit();
    EC.scenes.ensureBackgrounds();
    if (data && data.mode === 'play') {
      startTutorial({ checkpoint: data.cp || 0 });
      (data.disks || []).forEach((i) => level.disksGot.add(i));
      level.disks.forEach((d) => (d.got = level.disksGot.has(d.i)));
      if (data.stats) Object.assign(level.stats, data.stats);
      ui.tutorial.hide();
      if (!data.cp) level.blowWall();
      else level.loadCheckpoint(data.cp);
      mode = 'play';
      A.music('chase');
    } else goTitle(true);
    EC.start(update, render);
  }

  // Read-only handle for poking at a running game from the console.
  EC.debug = {
    get mode() {
      return mode;
    },
    get level() {
      return level;
    },
    get scene() {
      return scene;
    },
  };

  const hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) {
    hot.snapshot(() => ({
      mode: mode === 'play' || mode === 'paused' || mode === 'gameover' ? 'play' : null,
      cp: level ? level.checkpoint : 0,
      disks: level ? Array.from(level.disksGot) : [],
      stats: level ? level.stats : null,
    }));
  }
  function start(data) {
    const fonts = ['400 20px "Bungee"', '700 16px "Pixelify Sans"', '400 16px "Pixelify Sans"'];
    const ready = document.fonts && document.fonts.load ? Promise.all(fonts.map((f) => document.fonts.load(f).catch(() => null))) : Promise.resolve();
    let started = false;
    const go = () => {
      if (started) return;
      started = true;
      boot(data || {});
    };
    ready.then(go, go);
    setTimeout(go, 2500);
  }
  if (hot && hot.ready) hot.ready(start);
  else start((hot && hot.data) || {});
})();

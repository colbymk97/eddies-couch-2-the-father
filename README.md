# Eddie's Couch 2: Meet the Father

Zach promised his girlfriend's dad he'd show him *Eddie's Couch*. The game no longer exists. The dad does not accept this.

A browser game in three parts:

1. **The intro.** All three scenes of the intro script (The Hats, The Verdict, Not Again), played out in the living room with close-ups, then the title card and the party hat.
2. **The tutorial.** Press [A] to apologize. It does nothing. Press [B] to run. A wall explodes.
3. **Level 1: Escape the House.** Five rooms, the Girlfriend's Dad Beast right behind you, and a front door that is locked.

## Play

Open `index.html` in a browser. There's no build step, no dependencies, and no server needed. The only network request is for Google Fonts, and the game falls back to system fonts without it.

| | Keyboard | Touch | Gamepad |
|---|---|---|---|
| Move | ← → or A D | ◀ ▶ | D-pad / left stick |
| Jump | Space, ↑ or W | JUMP | X or Y |
| Duck (slide while running) | ↓ or S | ▼ | D-pad down |
| [A] Apologize | Z or J | A | A |
| [B] Run | hold X, K or Shift | B (toggles on) | hold B or RB |
| Pause | P or Esc | Pause on the TV | Start |
| Sound | M | Sound on the TV | |

## The house rules

- **He won't step on a carpet in his slippers.** He stops to take them off, carries them across, and puts them back on at the far side. That's your window.
- **Alex shouts warnings** from wherever she's hiding: the Easter ham, the remote, the gravy boat, the commemorative plates.
- **The front door is locked.** The key is on the hall table, right next to Theo's gift. Taking the gift slows you down, and the ending notices whether you have it.
- **Five Eddie's Couch backup disks** are hidden on top of things. Brandon notices if you get all of them.

Getting caught sends you back to the start of the room you're in. Disks you've found stay found.

## Code

Plain JavaScript, Canvas 2D and Web Audio. All art is drawn in code and every sound is synthesized, so the repository has no asset files.

| File | What's in it |
|---|---|
| `index.html` | The page: a wood-grain TV, the text overlays, touch controls, styles |
| `src/core.js` | Canvas sizing, keyboard/touch/gamepad input, the fixed-step loop, screen shake, particles, the dialogue typewriter and overlays |
| `src/audio.js` | Sound effects, character voice blips, and a small step sequencer for the chase and ending music |
| `src/art.js` | Every sprite (Zach, Alex, Dad, the Beast, props) and the room painters |
| `src/scenes.js` | The cutscene runner (generator-based scripts), the intro, the title card and the ending |
| `src/level.js` | Level 1: room layout, Zach's movement, the Beast's AI, throws, pickups, the door |
| `src/main.js` | The flow between title, intro, tutorial, play, pause, game over and results |

`EC.debug.level` and `EC.debug.mode` are exposed for poking at a running game from the browser console.

# Eddie's Couch 2: Meet the Father

Zach promised his girlfriend's dad he'd show him *Eddie's Couch*. The game no longer exists. The dad does not accept this.

A browser game in three parts:

1. **The intro.** All three scenes of the intro script (The Hats, The Verdict, Not Again). There's no narration: the scenes act the story out with camera moves and close-ups, and only the characters' lines are text. Then the title card and the party hat.
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
- **Alex shouts warnings** from where she's hiding near the camera: a picture (jump, duck, go, the key's behind you), never words, so nothing covers the play area.
- **He throws things:** a casserole, the TV remote, the gravy boat, the commemorative plates.
- **The front door is locked.** The key is on the hall table, right next to the birthday gift. Taking the gift slows you down, and the ending notices whether you have it.
- **Five Eddie's Couch backup disks** are hidden on top of things. Brandon notices if you get all of them.

Getting caught sends you back to the start of the room you're in. Disks you've found stay found.

## Getting caught

He doesn't just catch you. Each catch is worse than the last, in order, and after the eighth he picks at random. Press Enter or tap to skip to the end of one. The game-over card counts how many you've seen.

1. **Lawn Darted.** Head-first into the floorboards. The legs keep kicking. A sneaker comes off.
2. **Reclined.** Folded into a neat cube with a lever. He pulls it; the footrest comes out.
3. **Punted.** Through the ceiling. Something drips. A sneaker comes back down on his head.
4. **Framed.** Stomped flat, peeled off the floor, hung on the wall, squared up, patted once.
5. **Wishboned.** Pulled apart in slow motion. He makes a wish.
6. **Popped.** Squeezed until the head pops like a cork and ricochets around the room. The body takes a lap. The head blinks.
7. **Tidied Up.** Helicoptered by the ankle until pieces come off; one hits the TV screen. He stacks the rest neatly.
8. **Flawless.** Punched to pieces, juggled, slam-dunked into a crater. Gary from church rises from the floor and scores it a 10, 10, 10.

## Code

Plain JavaScript, Canvas 2D and Web Audio. All art is drawn in code and every sound is synthesized, so the repository has no asset files.

| File | What's in it |
|---|---|
| `index.html` | The page: a wood-grain TV, the text overlays, touch controls, styles |
| `src/core.js` | Canvas sizing, keyboard/touch/gamepad input, the fixed-step loop, screen shake, particles, the dialogue typewriter and overlays |
| `src/audio.js` | Sound effects, character voice blips, and a small step sequencer for the chase and ending music |
| `src/art.js` | Every sprite (Zach, Alex, Dad, the Beast, props) and the room painters |
| `src/scenes.js` | The cutscene runner (generator-based scripts), camera cuts and pans, speaker portraits, the intro, the title card and the ending |
| `src/fatalities.js` | The eight ways he deals with Zach: body-part physics, blood that lands and stays, camera push-ins, Gary's scorecards |
| `src/level.js` | Level 1: room layout, Zach's movement, the Beast's AI, throws, pickups, the door, night lighting and the foreground layer |
| `src/main.js` | The flow between title, intro, tutorial, play, pause, game over and results |

`EC.debug.level` and `EC.debug.mode` are exposed for poking at a running game from the browser console.

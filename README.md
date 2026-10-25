# Eddie's Couch 2: Alex's Father

Zach promised his girlfriend's dad he'd show him *Eddie's Couch*. The game no longer exists. The dad has gotten over the game. He has not gotten over Zach.

A browser game in four parts:

1. **The intro.** All three scenes of the intro script (The Hats, The Verdict, Not Again). There's no narration: the scenes act the story out with camera moves and close-ups, and only the characters' lines are text. Then the title card and the party hat.
2. **The tutorial.** Press [A] to apologize. It does nothing. Press [B] to run. A wall explodes.
3. **Level 1: Escape the House.** Five rooms, the Girlfriend's Dad Beast right behind you, and a front door that is locked.
4. **The getaway.** Out on the lawn, Alex climbs out a window to join Zach, and Eddie (it's his birthday, it's his couch) pulls up in a wood-panelled station wagon with the couch strapped to the roof. "Get in!" The Beast comes through the front door in his socks. "Don't make a mess in the car." Eddie floors it, and the couch slides off the roof into the Beast.

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
- **Alex shouts warnings,** popping up from the bottom corner of the screen: a picture (jump, duck, go, the key's behind you), never words, so nothing covers the play area.
- **He throws things:** a casserole, the TV remote, the gravy boat, the commemorative plates.
- **The front door is locked.** The key is on the hall table, right next to the birthday gift. Taking the gift slows you down, and the ending notices whether you have it.

Getting caught sends you back to the start of the room you're in.

## Getting caught

He doesn't just catch you. Each catch is worse than the last, in order, and after the tenth he picks at random. Nothing on screen names them; it just happens. The names below are for us. Press Enter or tap to skip to the end of one. The game-over card counts how many you've seen.

Every time, blood hits the TV screen where the hit lands and runs down the glass. Then Alex runs in, drops to her knees beside what's left of Zach, and cries. She's still crying when the card comes up.

1. **Lawn Darted.** Head-first into the floorboards. The legs keep kicking. A sneaker comes off.
2. **Reclined.** Folded into a neat cube with a lever. He pulls it; the footrest comes out.
3. **Leftovers.** Tossed up like a grape and caught head-first. Chewed with the legs still kicking, slurped down, a lump in his belly still yelling. He burps up a sneaker.
4. **Punted.** Through the ceiling. Something drips. A sneaker comes back down on his head.
5. **Framed.** Stomped flat, peeled off the floor, hung on the wall, squared up, patted once.
6. **Split Decision.** Held up like a phone book and torn down the middle, one half in each hand. Over the shoulders, then a flex.
7. **Popped.** Squeezed until the head pops like a cork and ricochets around the room. The body takes a lap. The head blinks.
8. **Wishboned.** Pulled apart at the waist in slow motion. He makes a wish.
9. **Tidied Up.** Helicoptered by the ankle until pieces come off; one hits the TV screen. He stacks the rest neatly.
10. **Flawless.** Punched to pieces, juggled, slam-dunked into a crater. Gary from church rises from the floor and scores it a 10, 10, 10.

## Mom

Alex's mom is completely unbothered by all of this.

- **In the intro** she walks in with a casserole mid-argument, asks if you two are staying for dinner, and tells the Beast to mind the good cardigan. When he roars she stands in the gale and keeps hold of the casserole.
- **In the kitchen** she's stirring a pot. She waves when Zach runs past. If the Beast comes through while she's there, she points at him and he stops dead for a second, head down.
- **After every death** she comes in with a mop and a roll of plastic sheeting and tidies up. She hangs the frame back up straight, carries the head back to its body, tapes the two halves back together with packing tape, puts the burped-up sneaker in a Tupperware, wipes the TV screen, and holds up her own scorecard for Flawless: a 4.
- **At the end** the porch light comes on and she hands Zach a casserole for the road, or the gift if he left it behind. Then: "And Zachary? Find the game."

## Code

Plain JavaScript, Canvas 2D and Web Audio. All art is drawn in code and every sound is synthesized, so the repository has no asset files.

| File | What's in it |
|---|---|
| `index.html` | The page: a wood-grain TV, the text overlays, touch controls, styles |
| `src/core.js` | Canvas sizing, keyboard/touch/gamepad input, the fixed-step loop, screen shake, particles, the dialogue typewriter and overlays |
| `src/audio.js` | Sound effects, character voice blips, and a small step sequencer for the chase and ending music |
| `src/art.js` | Every sprite (Zach, Alex, Dad, Mom, the Beast, props) and the room painters |
| `src/scenes.js` | The cutscene runner (generator-based scripts), camera cuts and pans, speaker portraits, the intro, the title card and the ending |
| `src/fatalities.js` | The eight ways he deals with Zach: body-part physics, blood that lands and stays, camera push-ins, Gary's scorecards |
| `src/level.js` | Level 1: room layout, Zach's movement, the Beast's AI, throws, pickups, the door, night lighting and the foreground layer |
| `src/main.js` | The flow between title, intro, tutorial, play, pause, game over and results |

`EC.debug.level` and `EC.debug.mode` are exposed for poking at a running game from the browser console.

# Stoolball

A side-on pixel stoolball game. Bat an innings against a computer side that bowls, keeps wicket and fields; bowl an innings at a computer side that bats and runs; or play a full match, both innings, after a toss. Every figure is drawn from the sprite manifest. The figures are Pixellab sprites (`assets/sprites/`, one sheet per body, palette-swapped per player); the block placeholders still draw until the sheets load.

## Run it

No build step. Serve the folder and open it:

```
python3 -m http.server 8765
# then http://localhost:8765/
```

Batting: move the pointer up and down over the pitch (or Up/Down) to set the bat height, press (click, tap, Space) to swing. Once the ball is in the field, press to run and press again while running to call for another.

Bowling: press once to set the pace off the power bar (left of the white mark is a lob, walked in), then press during the run-up to let it go at the height the marker on the gauge has reached. The tan tick on the gauge is where the batter holds the bat: what they expect. They remember your last few balls, so vary height and pace. While the ball is in the field, press to switch the throw between the keeper's end and your end.

`?auto` plays itself (alternating batting and bowling innings), `?mode=bat|bowl|match` picks the mode, `?speed=4` runs faster, `?overs=12` sets the length.

## The sprite list

- `src/sprites.js` is the manifest: every figure, animation, frame, facing and size.
- `docs/sprite-list.md` is generated from it: `node tools/sprite-list.mjs`.
- The **Sprite list** button on the start screen shows every placeholder frame.
- `node tools/check-sprites.cjs 300` (with the server running and Playwright installed) plays innings on autopilot and fails if anything on the list is never drawn, or anything drawn is not on the list.

## Layout

| File | What it does |
|---|---|
| `src/geometry.js` | Constants from the brief: 0.75 px/in vertical, 0.427 px/in along the pitch, ground at y=150, batting wicket at x=268 |
| `src/physics.js` | Delivery flight, contact, shot outcome, fielding and throw times |
| `src/running.js` | Running between wickets, calls, run-out danger |
| `src/teams.js` | The two sides and the bowling attack (overs alternate women and men) |
| `src/game.js` | The innings, either way round: phases, the ball in play, keeper, bowler, umpire, scoring, chasing a target |
| `src/bowling.js` | Your bowling (power bar, height marker) and the computer batter: memory of what you bowl, shot choice, running |
| `src/art.js` | Loads the sprite sheets and palette-swaps clothes, skin and hair per player |
| `src/placeholder.js` | Draws a frame: the sprite if loaded, else the block-figure placeholder |
| `src/main.js` | Page, input, scoreboard, sprite sheet, autopilot |

Tests: `node --test test/*.test.mjs`.

## Sprites

`assets/sprites/{W62,W67,M67,M73,UMP}.png` hold one row per animation and one 64x64 cell per frame, feet on (32, 63); `index.json` maps animation keys to rows. They were generated with Pixellab: a base sprite per figure and facing, then each animation posed from it with skeleton animation (skeletons taken from the placeholder poses), then repainted so each base colour (`BASE_PALETTE` in `src/sprites.js`) means one body part.

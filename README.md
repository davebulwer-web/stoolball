# Stoolball

A side-on pixel stoolball game. This is the innings build on placeholder figures: you bat a full innings against a computer side that bowls, keeps wicket and fields. Every figure is a block placeholder drawn from the sprite manifest, so the game doubles as the specification for the sprite batch.

## Run it

No build step. Serve the folder and open it:

```
python3 -m http.server 8765
# then http://localhost:8765/
```

Controls: move the pointer up and down over the pitch (or Up/Down) to set the bat height, press (click, tap, Space) to swing. Once the ball is in the field, press to run and press again while running to call for another.

`?auto` plays itself, `?speed=4` runs faster, `?overs=12` sets the length.

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
| `src/game.js` | The innings: phases, the ball in play, keeper, bowler, umpire, scoring |
| `src/placeholder.js` | Block-figure placeholders for every animation frame |
| `src/main.js` | Page, input, scoreboard, sprite sheet, autopilot |

Tests: `node --test test/*.test.mjs`.

# Sprite list for the batch run

Generated from `src/sprites.js` by `node tools/sprite-list.mjs`. Do not edit by hand: change the manifest and regenerate.

Every animation here is drawn during a placeholder innings, and nothing is drawn that is not here: `tools/check-sprites.cjs` plays innings on autopilot and fails if either is untrue.

## Totals

- **375 character frames**: 32 animations across 5 figures (4 player bodies and the umpire).
- **8 prop frames** (ball, wickets) and **1 backdrop**.
- 134 of the character frames are west-facing copies of east-facing ones. Mirroring in code would save them, but would put the light on the upper right, so the list draws them separately. That is the first thing to cut if the budget is tight.
- At one generation per frame (pose guide as init_image, as the test settled) the run is about 383 generations before retries, against roughly 695 left.

## Conventions for every character frame

- Canvas **64x64**, transparent, feet on the anchor at **(32, 63)** (bottom centre). No ground patch, no shadow: the game draws the shadow.
- Flat side-on camera, no top-down tilt. Figures are drawn at **0.75 px per inch** in both directions, so normal proportions.
- Facing: **south** = chest-on to us, which in this camera is side-on to the bowler. **east** = facing screen right (towards the batting wicket). **west** = facing screen left.
- Light from the **upper left**, in every frame including west-facing ones.
- Casual summer clothes, no pads, gloves, helmets or uniform. The bat is a stoolball bat: a round flat wooden paddle on a long handle with a red grip.
- Palette: keep these exact figure colours so the game can recolour clothes, hair and skin per player. Paint the red grip and stitching afterwards (red in color_image bleeds into skin).

| Part | Colour | Shadow |
|---|---|---|
| Shirt | `#e4e8da` | `#aeb5a4` |
| Shorts | `#34425e` | `#232c3b` |
| Skin | `#c08a5e` | `#94643f` |
| Hair | `#20282a` | |
| Trainers | `#f2f2ea` | |
| Bat | `#caa463` | `#8f7139` |
| Grip (paint after) | `#b9412f` | |

## Figures

| Figure | Height | Figure height on canvas | Used for |
|---|---|---|---|
| W62 | Woman, 5ft 2in | 47px | batters, bowlers and fielders (each player recoloured) |
| W67 | Woman, 5ft 7in | 50px | batters, bowlers and fielders (each player recoloured) |
| M67 | Man, 5ft 7in | 50px | batters, bowlers and fielders (each player recoloured); also the keeper |
| M73 | Man, 6ft 1in | 55px | batters, bowlers and fielders (each player recoloured) |
| UMP | Umpire, 5ft 6in | 50px | the umpire at the bowler's end |

Eleven players a side are made from the four player bodies by recolouring. The opposition attack uses all four bodies (overs alternate woman, man), so every body needs the bowling set as well as the batting set.

The stance is drawn at 7 bat heights (20, 30, 40, 50, 60, 70, 80in). **50in is the normal stance when facing**: the bat held out beside the wicket at board height. The others are the player raising or lowering it.

## Batter at the crease

### `bat_guard`

Stance, bat held out to the side beside the wicket with the paddle face to the bowler. The 50in frame (board height) is the normal stance when facing; the others are the bat raised or lowered by the player. The game shows the band nearest the chosen height.

- Facing **south**, 7 frames (held), holding the bat.
- Figures: W62, W67, M67, M73 (28 frames).
- Frames:
  1. paddle centre 20in up (15px above the feet)
  2. paddle centre 30in up (23px above the feet)
  3. paddle centre 40in up (30px above the feet)
  4. paddle centre 50in up (38px above the feet)
  5. paddle centre 60in up (45px above the feet)
  6. paddle centre 70in up (53px above the feet)
  7. paddle centre 80in up (60px above the feet)

### `bat_swing_low`

Swing at a low (below 37in) ball, sweeping left to right across the body.

- Facing **south**, 3 frames, 22 fps, holding the bat.
- Figures: W62, W67, M67, M73 (12 frames).
- Frames:
  1. contact, paddle level at about 30in
  2. follow-through, paddle past the body
  3. recovery, paddle up by the shoulder

### `bat_swing_mid`

Swing at a middle (37 to 62in) ball, sweeping left to right across the body.

- Facing **south**, 3 frames, 22 fps, holding the bat.
- Figures: W62, W67, M67, M73 (12 frames).
- Frames:
  1. contact, paddle level at about 50in
  2. follow-through, paddle past the body
  3. recovery, paddle up by the shoulder

### `bat_swing_high`

Swing at a high (above 62in) ball, sweeping left to right across the body.

- Facing **south**, 3 frames, 22 fps, holding the bat.
- Figures: W62, W67, M67, M73 (12 frames).
- Frames:
  1. contact, paddle level at about 70in
  2. follow-through, paddle past the body
  3. recovery, paddle up by the shoulder

### `bat_out`

Out. Bat dropped to the side, head down.

- Facing **south**, 1 frame (held), holding the bat.
- Figures: W62, W67, M67, M73 (4 frames).
- Frames:
  1. dejected

## Non-striker

### `ns_idle`

Waiting by the far wicket, bat resting on the ground.

- Facing **south**, 1 frame (held), holding the bat.
- Figures: W62, W67, M67, M73 (4 frames).
- Frames:
  1. standing

### `ns_backup`

Backing up while the ball is bowled: leaning towards the batting end, bat held low and forward.

- Facing **east**, 1 frame (held), holding the bat.
- Figures: W62, W67, M67, M73 (4 frames).
- Frames:
  1. leaning, ready to go

## Running between wickets

### `run_bat_e`

Sprinting with the bat carried forward in the leading hand.

- Facing **east**, 8 frames, 14 fps, loops, holding the bat.
- Figures: W62, W67, M67, M73 (32 frames).
- Frames:
  1. contact, right foot forward
  2. down
  3. passing
  4. up / push off
  5. contact, left foot forward
  6. down
  7. passing
  8. up / push off

### `run_bat_w`

As run_bat_e, facing the other way. Drawn separately so the light stays upper left.

- Facing **west**, 8 frames, 14 fps, loops, holding the bat.
- Figures: W62, W67, M67, M73 (32 frames).
- Frames:
  1. contact, right foot forward
  2. down
  3. passing
  4. up / push off
  5. contact, left foot forward
  6. down
  7. passing
  8. up / push off

### `ground_bat_e`

Arriving at the wicket: lunge and touch the board with the bat, then gather to turn.

- Facing **east**, 2 frames, 8 fps, holding the bat.
- Figures: W62, W67, M67, M73 (8 frames).
- Frames:
  1. lunge, bat touching the board
  2. gathered, ready to turn

### `ground_bat_w`

As ground_bat_e, facing the other way.

- Facing **west**, 2 frames, 8 fps, holding the bat.
- Figures: W62, W67, M67, M73 (8 frames).
- Frames:
  1. lunge, bat touching the board
  2. gathered, ready to turn

### `walk_bat_e`

Walking with the bat: the new batter coming in, or the out batter walking off.

- Facing **east**, 6 frames, 8 fps, loops, holding the bat.
- Figures: W62, W67, M67, M73 (24 frames).
- Frames:
  1. contact, right foot forward
  2. passing
  3. up
  4. contact, left foot forward
  5. passing
  6. up

### `walk_bat_w`

As walk_bat_e, facing the other way.

- Facing **west**, 6 frames, 8 fps, loops, holding the bat.
- Figures: W62, W67, M67, M73 (24 frames).
- Frames:
  1. contact, right foot forward
  2. passing
  3. up
  4. contact, left foot forward
  5. passing
  6. up

## Bowler and fielders

### `bowl_ready`

At the top of the run-up, ball held in front at the waist.

- Facing **east**, 1 frame (held), holding the ball.
- Figures: W62, W67, M67, M73 (4 frames).
- Frames:
  1. standing

### `run_e`

Running without a bat: the long run-up, and the keeper chasing a short ball.

- Facing **east**, 8 frames, 14 fps, loops.
- Figures: W62, W67, M67, M73 (32 frames).
- Frames:
  1. contact, right foot forward
  2. down
  3. passing
  4. up / push off
  5. contact, left foot forward
  6. down
  7. passing
  8. up / push off

### `run_w`

Running without a bat: the bowler racing back to the far wicket for a throw, the keeper getting back to the stumps.

- Facing **west**, 8 frames, 14 fps, loops.
- Figures: W62, W67, M67, M73 (32 frames).
- Frames:
  1. contact, right foot forward
  2. down
  3. passing
  4. up / push off
  5. contact, left foot forward
  6. down
  7. passing
  8. up / push off

### `walk_e`

Walking in to bowl a lob (the donkey drop has to be walked in).

- Facing **east**, 6 frames, 8 fps, loops, holding the ball.
- Figures: W62, W67, M67, M73 (24 frames).
- Frames:
  1. contact, right foot forward
  2. passing
  3. up
  4. contact, left foot forward
  5. passing
  6. up

### `walk_w`

Walking back to the mark between balls.

- Facing **west**, 6 frames, 8 fps, loops.
- Figures: W62, W67, M67, M73 (24 frames).
- Frames:
  1. contact, right foot forward
  2. passing
  3. up
  4. contact, left foot forward
  5. passing
  6. up

### `bowl_deliver`

Underarm delivery. The ball leaves the hand on frame 3.

- Facing **east**, 4 frames, 12 fps, holding the ball.
- Figures: W62, W67, M67, M73 (16 frames).
- Frames:
  1. gather, ball at the hip
  2. backswing, arm straight back, front foot planted
  3. release, arm swinging through low
  4. follow-through, arm up and forward

### `field_receive`

Taking a throw that comes in from the field on the right.

- Facing **east**, 2 frames, 10 fps.
- Figures: W62, W67, M67, M73 (8 frames).
- Frames:
  1. hands up and out to the ball
  2. ball gathered into the chest

### `field_break`

Run-out attempt: hitting the board with the ball in hand.

- Facing **west**, 2 frames, 10 fps, holding the ball.
- Figures: W62, W67, M67, M73 (8 frames).
- Frames:
  1. ball hand drawn back
  2. ball hand striking the board at shoulder height

### `celebrate`

Wicket! Arms up.

- Facing **south**, 2 frames, 6 fps, loops.
- Figures: W62, W67, M67, M73 (8 frames).
- Frames:
  1. arms up
  2. arms up, small hop

## Keeper

### `keep_ready`

Crouched behind the wicket, hands forward (about 38px tall).

- Facing **west**, 1 frame (held).
- Figures: M67 (1 frames).
- Frames:
  1. crouch

### `keep_take`

Taking a ball the batter missed or left.

- Facing **west**, 2 frames, 10 fps.
- Figures: M67 (2 frames).
- Frames:
  1. hands to the ball
  2. ball taken into the body

### `keep_return`

Lobbing the ball back to the bowler.

- Facing **west**, 3 frames, 9 fps, holding the ball.
- Figures: M67 (3 frames).
- Frames:
  1. standing, ball hand back
  2. arm swinging through
  3. release, arm up

### `keep_pickup`

Scooping up a short ball in front of him.

- Facing **east**, 2 frames, 8 fps.
- Figures: M67 (2 frames).
- Frames:
  1. bent down, hand to the ball
  2. rising with the ball

## Umpire

### `ump_idle`

Standing, hands behind back or at the sides.

- Facing **south**, 1 frame (held).
- Figures: UMP (1 frames).
- Frames:
  1. standing

### `ump_out`

Out: right index finger raised above the head.

- Facing **south**, 1 frame (held).
- Figures: UMP (1 frames).
- Frames:
  1. finger up

### `ump_wide`

Wide: both arms straight out to the sides.

- Facing **south**, 1 frame (held).
- Figures: UMP (1 frames).
- Frames:
  1. arms out

### `ump_noball`

No ball: right arm straight out to the side.

- Facing **south**, 1 frame (held).
- Figures: UMP (1 frames).
- Frames:
  1. one arm out

### `ump_four`

Four: arm waved across the chest.

- Facing **south**, 2 frames, 5 fps, loops.
- Figures: UMP (2 frames).
- Frames:
  1. arm out to the right
  2. arm across to the left

### `ump_six`

Six: both arms straight up.

- Facing **south**, 1 frame (held).
- Figures: UMP (1 frames).
- Frames:
  1. arms up

## Props

| Prop | Size | Frames | Notes |
|---|---|---|---|
| `ball` | 5x5 | 4 | White leather, red stitching: a small baseball. Spins through 4 frames in flight. |
| `wicket_near` | 9x42 | 1 | Batting wicket: a 12in square board (9x9) on an upright to 44in (3x33), red no-ball mark at 24in. Lit from the upper left. |
| `wicket_far` | 9x42 | 1 | Far wicket: the same, flatter and darker so it sits back. |
| `wicket_hit` | 13x44 | 2 | The near board struck (bowled or run out): board jolted back, then wobbling. Also used at the far end, darkened in code. |

## Environment

| Piece | Size | Notes |
|---|---|---|
| `backdrop` | 320x180 | Dusk sky, low sun upper left, hedge line, outfield, the pitch strip and both creases. No wickets or people. Probably drawn by hand rather than generated. |

## Frame count by figure

| Figure | Frames |
|---|---|
| W62 | 90 |
| W67 | 90 |
| M67 | 98 |
| M73 | 90 |
| UMP | 7 |
| **Total** | **375** |

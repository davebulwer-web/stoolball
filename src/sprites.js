// The sprite manifest. This is the single source of truth for the batch
// generation run: the placeholder renderer draws exactly these animations and
// frames, the game asks for them by key, and tools/sprite-list.mjs turns this
// file into docs/sprite-list.md.

import { PXI } from './geometry.js';

// Every character frame sits on the same canvas, feet on the anchor.
export const CANVAS = { w: 64, h: 64, anchorX: 32, anchorY: 63 };

export const MODELS = {
  W62: { kind: 'player', sex: 'F', heightIn: 62, label: 'Woman, 5ft 2in' },
  W67: { kind: 'player', sex: 'F', heightIn: 67, label: 'Woman, 5ft 7in' },
  M67: { kind: 'player', sex: 'M', heightIn: 67, label: 'Man, 5ft 7in' },
  M73: { kind: 'player', sex: 'M', heightIn: 73, label: 'Man, 6ft 1in' },
  UMP: { kind: 'umpire', sex: 'M', heightIn: 66, label: 'Umpire, 5ft 6in' },
};
for (const m of Object.values(MODELS)) m.px = Math.round(m.heightIn * PXI);

export const PLAYERS = ['W62', 'W67', 'M67', 'M73'];
export const KEEPER_MODEL = 'M67';

// Bat heights the stance is drawn at. The game snaps the drawn bat to the
// nearest band; the hit test still uses the exact height.
export const GUARD_BANDS = [20, 30, 40, 50, 60, 70, 80];
export const REST_BAND = 50;   // board height: where the bat sits when facing a delivery
export const SWING_GROUPS = [
  { key: 'bat_swing_low', upTo: 37, at: 30, label: 'low (below 37in)' },
  { key: 'bat_swing_mid', upTo: 62, at: 50, label: 'middle (37 to 62in)' },
  { key: 'bat_swing_high', upTo: 999, at: 70, label: 'high (above 62in)' },
];

const runNotes = n => Array.from({ length: n }, (_, i) =>
  ['contact, right foot forward', 'down', 'passing', 'up / push off',
   'contact, left foot forward', 'down', 'passing', 'up / push off'][i % 8]);
const walkNotes = ['contact, right foot forward', 'passing', 'up',
                   'contact, left foot forward', 'passing', 'up'];

// facing: south = chest-on to the camera (side-on to the bowler);
// east = facing screen right (towards the batting wicket); west = screen left.
export const ANIMS = [
  // ---------------- Striker ----------------
  { key: 'bat_guard', group: 'Batter at the crease', facing: 'south', models: PLAYERS, fps: 0, holds: 'bat',
    frames: GUARD_BANDS.length,
    desc: 'Stance, bat held out to the side beside the wicket with the paddle face to the bowler. The 50in frame (board height) is the normal stance when facing; the others are the bat raised or lowered by the player. The game shows the band nearest the chosen height.',
    frameNotes: GUARD_BANDS.map(h => `paddle centre ${h}in up (${Math.round(h * PXI)}px above the feet)`) },
  ...SWING_GROUPS.map(g => ({
    key: g.key, group: 'Batter at the crease', facing: 'south', models: PLAYERS, fps: 22, holds: 'bat', frames: 3,
    desc: `Swing at a ${g.label} ball, sweeping left to right across the body.`,
    frameNotes: [`contact, paddle level at about ${g.at}in`, 'follow-through, paddle past the body', 'recovery, paddle up by the shoulder'] })),
  { key: 'bat_out', group: 'Batter at the crease', facing: 'south', models: PLAYERS, fps: 0, holds: 'bat', frames: 1,
    desc: 'Out. Bat dropped to the side, head down.', frameNotes: ['dejected'] },

  // ---------------- Non-striker ----------------
  { key: 'ns_idle', group: 'Non-striker', facing: 'south', models: PLAYERS, fps: 0, holds: 'bat', frames: 1,
    desc: 'Waiting by the far wicket, bat resting on the ground.', frameNotes: ['standing'] },
  { key: 'ns_backup', group: 'Non-striker', facing: 'east', models: PLAYERS, fps: 0, holds: 'bat', frames: 1,
    desc: 'Backing up while the ball is bowled: leaning towards the batting end, bat held low and forward.', frameNotes: ['leaning, ready to go'] },

  // ---------------- Running between wickets ----------------
  { key: 'run_bat_e', group: 'Running between wickets', facing: 'east', models: PLAYERS, fps: 14, holds: 'bat', frames: 8, loop: true,
    desc: 'Sprinting with the bat carried forward in the leading hand.', frameNotes: runNotes(8) },
  { key: 'run_bat_w', group: 'Running between wickets', facing: 'west', models: PLAYERS, fps: 14, holds: 'bat', frames: 8, loop: true,
    desc: 'As run_bat_e, facing the other way. Drawn separately so the light stays upper left.', frameNotes: runNotes(8) },
  { key: 'ground_bat_e', group: 'Running between wickets', facing: 'east', models: PLAYERS, fps: 8, holds: 'bat', frames: 2,
    desc: 'Arriving at the wicket: lunge and touch the board with the bat, then gather to turn.', frameNotes: ['lunge, bat touching the board', 'gathered, ready to turn'] },
  { key: 'ground_bat_w', group: 'Running between wickets', facing: 'west', models: PLAYERS, fps: 8, holds: 'bat', frames: 2,
    desc: 'As ground_bat_e, facing the other way.', frameNotes: ['lunge, bat touching the board', 'gathered, ready to turn'] },
  { key: 'walk_bat_e', group: 'Running between wickets', facing: 'east', models: PLAYERS, fps: 8, holds: 'bat', frames: 6, loop: true,
    desc: 'Walking with the bat: the new batter coming in, or the out batter walking off.', frameNotes: walkNotes },
  { key: 'walk_bat_w', group: 'Running between wickets', facing: 'west', models: PLAYERS, fps: 8, holds: 'bat', frames: 6, loop: true,
    desc: 'As walk_bat_e, facing the other way.', frameNotes: walkNotes },

  // ---------------- Bowler and fielders ----------------
  { key: 'bowl_ready', group: 'Bowler and fielders', facing: 'east', models: PLAYERS, fps: 0, holds: 'ball', frames: 1,
    desc: 'At the top of the run-up, ball held in front at the waist.', frameNotes: ['standing'] },
  { key: 'run_e', group: 'Bowler and fielders', facing: 'east', models: PLAYERS, fps: 14, holds: 'none', frames: 8, loop: true,
    desc: 'Running without a bat: the long run-up, and the keeper chasing a short ball.', frameNotes: runNotes(8) },
  { key: 'run_w', group: 'Bowler and fielders', facing: 'west', models: PLAYERS, fps: 14, holds: 'none', frames: 8, loop: true,
    desc: 'Running without a bat: the bowler racing back to the far wicket for a throw, the keeper getting back to the stumps.', frameNotes: runNotes(8) },
  { key: 'walk_e', group: 'Bowler and fielders', facing: 'east', models: PLAYERS, fps: 8, holds: 'ball', frames: 6, loop: true,
    desc: 'Walking in to bowl a lob (the donkey drop has to be walked in).', frameNotes: walkNotes },
  { key: 'walk_w', group: 'Bowler and fielders', facing: 'west', models: PLAYERS, fps: 8, holds: 'none', frames: 6, loop: true,
    desc: 'Walking back to the mark between balls.', frameNotes: walkNotes },
  { key: 'bowl_deliver', group: 'Bowler and fielders', facing: 'east', models: PLAYERS, fps: 12, holds: 'ball', frames: 4,
    desc: 'Underarm delivery. The ball leaves the hand on frame 3.', frameNotes: ['gather, ball at the hip', 'backswing, arm straight back, front foot planted', 'release, arm swinging through low', 'follow-through, arm up and forward'] },
  { key: 'field_receive', group: 'Bowler and fielders', facing: 'east', models: PLAYERS, fps: 10, holds: 'none', frames: 2,
    desc: 'Taking a throw that comes in from the field on the right.', frameNotes: ['hands up and out to the ball', 'ball gathered into the chest'] },
  { key: 'field_break', group: 'Bowler and fielders', facing: 'west', models: PLAYERS, fps: 10, holds: 'ball', frames: 2,
    desc: 'Run-out attempt: hitting the board with the ball in hand.', frameNotes: ['ball hand drawn back', 'ball hand striking the board at shoulder height'] },
  { key: 'celebrate', group: 'Bowler and fielders', facing: 'south', models: PLAYERS, fps: 6, holds: 'none', frames: 2, loop: true,
    desc: 'Wicket! Arms up.', frameNotes: ['arms up', 'arms up, small hop'] },

  // ---------------- Keeper (one model) ----------------
  { key: 'keep_ready', group: 'Keeper', facing: 'west', models: [KEEPER_MODEL], fps: 0, holds: 'none', frames: 1,
    desc: 'Crouched behind the wicket, hands forward (about 38px tall).', frameNotes: ['crouch'] },
  { key: 'keep_take', group: 'Keeper', facing: 'west', models: [KEEPER_MODEL], fps: 10, holds: 'none', frames: 2,
    desc: 'Taking a ball the batter missed or left.', frameNotes: ['hands to the ball', 'ball taken into the body'] },
  { key: 'keep_return', group: 'Keeper', facing: 'west', models: [KEEPER_MODEL], fps: 9, holds: 'ball', frames: 3,
    desc: 'Lobbing the ball back to the bowler.', frameNotes: ['standing, ball hand back', 'arm swinging through', 'release, arm up'] },
  { key: 'keep_pickup', group: 'Keeper', facing: 'east', models: [KEEPER_MODEL], fps: 8, holds: 'none', frames: 2,
    desc: 'Scooping up a short ball in front of him.', frameNotes: ['bent down, hand to the ball', 'rising with the ball'] },

  // ---------------- Umpire ----------------
  { key: 'ump_idle', group: 'Umpire', facing: 'south', models: ['UMP'], fps: 0, holds: 'none', frames: 1,
    desc: 'Standing, hands behind back or at the sides.', frameNotes: ['standing'] },
  { key: 'ump_out', group: 'Umpire', facing: 'south', models: ['UMP'], fps: 0, holds: 'none', frames: 1,
    desc: 'Out: right index finger raised above the head.', frameNotes: ['finger up'] },
  { key: 'ump_wide', group: 'Umpire', facing: 'south', models: ['UMP'], fps: 0, holds: 'none', frames: 1,
    desc: 'Wide: both arms straight out to the sides.', frameNotes: ['arms out'] },
  { key: 'ump_noball', group: 'Umpire', facing: 'south', models: ['UMP'], fps: 0, holds: 'none', frames: 1,
    desc: 'No ball: right arm straight out to the side.', frameNotes: ['one arm out'] },
  { key: 'ump_four', group: 'Umpire', facing: 'south', models: ['UMP'], fps: 5, holds: 'none', frames: 2, loop: true,
    desc: 'Four: arm waved across the chest.', frameNotes: ['arm out to the right', 'arm across to the left'] },
  { key: 'ump_six', group: 'Umpire', facing: 'south', models: ['UMP'], fps: 0, holds: 'none', frames: 1,
    desc: 'Six: both arms straight up.', frameNotes: ['arms up'] },
];

export const ANIM = Object.fromEntries(ANIMS.map(a => [a.key, a]));

export const PROPS = [
  { key: 'ball', w: 5, h: 5, frames: 4, desc: 'White leather, red stitching: a small baseball. Spins through 4 frames in flight.' },
  { key: 'wicket_near', w: 9, h: 42, frames: 1, desc: 'Batting wicket: a 12in square board (9x9) on an upright to 44in (3x33), red no-ball mark at 24in. Lit from the upper left.' },
  { key: 'wicket_far', w: 9, h: 42, frames: 1, desc: 'Far wicket: the same, flatter and darker so it sits back.' },
  { key: 'wicket_hit', w: 13, h: 44, frames: 2, desc: 'The near board struck (bowled or run out): board jolted back, then wobbling. Also used at the far end, darkened in code.' },
];

export const ENVIRONMENT = [
  { key: 'backdrop', w: 320, h: 180, desc: 'Dusk sky, low sun upper left, hedge line, outfield, the pitch strip and both creases. No wickets or people. Probably drawn by hand rather than generated.' },
];

// Colours the figures are drawn in. Real sprites should keep exactly these
// so the game can palette-swap clothes, hair and skin per player.
export const BASE_PALETTE = {
  shirt: '#e4e8da', shirtLo: '#aeb5a4',
  shorts: '#34425e', shortsLo: '#232c3b',
  skin: '#c08a5e', skinLo: '#94643f',
  hair: '#20282a', shoes: '#f2f2ea',
  bat: '#caa463', batLo: '#8f7139', grip: '#b9412f',
  outline: '#000000',
};

export function framesFor(anim) { return anim.frames * anim.models.length; }

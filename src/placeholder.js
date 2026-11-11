// Placeholder sprites: block figures drawn from a pose per animation frame.
// Each call goes through the manifest, so anything the game draws is on the
// sprite list, and an unknown key or frame throws.

import { ANIM, MODELS, GUARD_BANDS, SWING_GROUPS } from './sprites.js';
import { PXI } from './geometry.js';

export const used = new Set();   // "MODEL:anim" pairs the game has drawn

function rect(ctx, x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}

function line(ctx, x0, y0, x1, y1, t, c) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  ctx.fillStyle = c;
  for (let i = 0; i <= n; i++) {
    const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
    ctx.fillRect(Math.round(x - t / 2), Math.round(y - t / 2), t, t);
  }
}

const norm = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };

// ---------------------------------------------------------------------------
// Poses. Units are fractions of the figure height H. x is towards the facing
// direction (screen right for east and south), y is height above the ground.
// hands: [back/left, front/right]. feet: [dx, lift]. item: held in the front hand.
// ---------------------------------------------------------------------------

const stand = () => ({ feet: [[-0.07, 0], [0.07, 0]], hands: [[-0.15, 0.42], [0.15, 0.42]] });

function runPose(f, n, amp, lift, lean) {
  const p = (f / n) * Math.PI * 2;
  const a = Math.sin(p);
  return {
    lean, bob: lift * 0.25 * Math.abs(Math.cos(p)),
    feet: [[amp * a, lift * Math.max(0, Math.cos(p))], [-amp * a, lift * Math.max(0, -Math.cos(p))]],
    knees: 0.06,
    hands: [[-amp * 0.8 * a, 0.5], [amp * 0.8 * a, 0.5]],
  };
}

function batAt(hx, hy, dx, dy) {
  return { item: 'bat', hand: 1, dir: norm(dx, dy), handAt: [hx, hy] };
}

// guard: the paddle centre sits at the band height, out to the right
function guardPose(bandIn, H) {
  const y = (bandIn * PXI) / H;
  const up = y >= 0.5;
  const dir = up ? norm(0.25, 1) : norm(0.35, -1);
  const reach = 0.2;                           // handle plus half the paddle, in H
  const hx = 0.34 - dir[0] * reach, hy = y - dir[1] * reach;
  return { ...stand(), feet: [[-0.09, 0], [0.09, 0]], hands: [[-0.2, 0.48], [hx, hy]], item: 'bat', dir };
}

const POSES = {
  bat_guard: (f, H) => guardPose(GUARD_BANDS[f], H),
  bat_out: () => ({ ...stand(), headDown: true, hands: [[-0.12, 0.42], [0.18, 0.4]], item: 'bat', dir: norm(0.15, -1) }),
  ns_idle: () => ({ ...stand(), hands: [[-0.15, 0.42], [0.2, 0.42]], item: 'bat', dir: norm(0.05, -1) }),
  ns_backup: () => ({ lean: 0.06, feet: [[-0.1, 0], [0.12, 0]], knees: 0.05, hands: [[-0.12, 0.45], [0.26, 0.42]], item: 'bat', dir: norm(1, -0.6) }),
  run_bat: f => ({ ...runPose(f, 8, 0.2, 0.09, 0.06), item: 'bat', dir: norm(1, 0.35), frontHand: [0.24, 0.55] }),
  ground_bat: f => f === 0
    ? { lean: 0.12, crouch: 0.15, feet: [[-0.22, 0], [0.26, 0]], knees: 0.08, hands: [[-0.2, 0.45], [0.38, 0.32]], item: 'bat', dir: norm(1, -0.25) }
    : { lean: 0.02, crouch: 0.08, feet: [[-0.08, 0], [0.12, 0]], knees: 0.05, hands: [[-0.12, 0.45], [0.18, 0.55]], item: 'bat', dir: norm(0.3, 1) },
  walk_bat: f => ({ ...runPose(f, 6, 0.12, 0.04, 0), item: 'bat', dir: norm(0.2, -1), frontHand: [0.12, 0.42] }),

  bowl_ready: () => ({ ...stand(), feet: [[-0.06, 0], [0.06, 0]], hands: [[0.08, 0.5], [0.12, 0.52]], item: 'ball' }),
  run: f => runPose(f, 8, 0.2, 0.09, 0.07),
  walk: f => runPose(f, 6, 0.12, 0.04, 0),
  walk_ball: f => ({ ...runPose(f, 6, 0.12, 0.04, 0), item: 'ball', frontHand: [0.1, 0.48] }),
  bowl_deliver: f => [
    { feet: [[-0.08, 0], [0.1, 0]], hands: [[-0.08, 0.45], [0.04, 0.42]], item: 'ball' },
    { lean: -0.03, feet: [[-0.14, 0], [0.18, 0]], hands: [[0.15, 0.55], [-0.32, 0.5]], item: 'ball' },
    { lean: 0.08, crouch: 0.1, feet: [[-0.2, 0], [0.22, 0]], knees: 0.08, hands: [[-0.2, 0.5], [0.3, 0.25]] },
    { lean: 0.06, feet: [[-0.12, 0.06], [0.2, 0]], hands: [[-0.22, 0.45], [0.36, 0.8]] },
  ][f],
  field_receive: f => f === 0
    ? { ...stand(), feet: [[-0.1, 0], [0.1, 0]], hands: [[0.24, 0.66], [0.3, 0.62]] }
    : { ...stand(), hands: [[0.12, 0.56], [0.14, 0.54]], item: 'ball' },
  field_break: f => f === 0
    ? { lean: -0.03, feet: [[-0.1, 0], [0.12, 0]], hands: [[-0.15, 0.45], [-0.12, 0.82]], item: 'ball' }
    : { lean: 0.08, feet: [[-0.14, 0], [0.18, 0]], knees: 0.05, hands: [[-0.2, 0.45], [0.42, 0.74]], item: 'ball' },
  celebrate: f => ({ feet: [[-0.08, f ? 0.04 : 0], [0.08, f ? 0.04 : 0]], hands: [[-0.26, f ? 1.08 : 1.14], [0.26, f ? 1.08 : 1.14]] }),

  keep_ready: () => ({ crouch: 0.42, lean: 0.06, feet: [[-0.13, 0], [0.13, 0]], knees: 0.12, hands: [[0.22, 0.3], [0.27, 0.32]] }),
  keep_take: f => ({ crouch: 0.3, lean: 0.05, feet: [[-0.13, 0], [0.13, 0]], knees: 0.1,
    hands: f === 0 ? [[0.3, 0.42], [0.34, 0.45]] : [[0.14, 0.42], [0.16, 0.44]], item: f ? 'ball' : null }),
  keep_return: f => [
    { feet: [[-0.1, 0], [0.1, 0]], hands: [[0.1, 0.45], [-0.22, 0.6]], item: 'ball' },
    { lean: 0.04, feet: [[-0.12, 0], [0.14, 0]], hands: [[-0.1, 0.45], [0.2, 0.6]], item: 'ball' },
    { lean: 0.05, feet: [[-0.12, 0.04], [0.14, 0]], hands: [[-0.15, 0.45], [0.34, 0.85]] },
  ][f],
  keep_pickup: f => f === 0
    ? { crouch: 0.4, lean: 0.22, feet: [[-0.14, 0], [0.16, 0]], knees: 0.12, hands: [[0.1, 0.3], [0.32, 0.04]] }
    : { crouch: 0.2, lean: 0.1, feet: [[-0.12, 0], [0.14, 0]], knees: 0.08, hands: [[0.08, 0.4], [0.22, 0.4]], item: 'ball' },

  ump_idle: () => ({ ...stand(), hands: [[-0.12, 0.45], [0.12, 0.45]] }),
  ump_out: () => ({ ...stand(), hands: [[-0.12, 0.45], [0.1, 1.22]] }),
  ump_wide: () => ({ ...stand(), hands: [[-0.45, 0.8], [0.45, 0.8]] }),
  ump_noball: () => ({ ...stand(), hands: [[-0.12, 0.45], [0.45, 0.8]] }),
  ump_four: f => ({ ...stand(), hands: [[-0.12, 0.45], f ? [-0.2, 0.62] : [0.4, 0.66]] }),
  ump_six: () => ({ ...stand(), hands: [[-0.14, 1.22], [0.14, 1.22]] }),
};

function swingPose(f, groupIdx, H) {
  const at = SWING_GROUPS[groupIdx].at * PXI / H;
  const base = { feet: [[-0.1, 0], [0.11, 0]], knees: 0.03 };
  if (f === 0) return { ...base, hands: [[-0.1, 0.5], [0.24, at]], item: 'bat', dir: norm(1, 0.15) };
  if (f === 1) return { ...base, lean: 0.03, hands: [[-0.08, 0.5], [0.38, Math.min(0.9, at + 0.12)]], item: 'bat', dir: norm(0.6, 0.8) };
  return { ...base, hands: [[-0.12, 0.48], [0.16, 0.86]], item: 'bat', dir: norm(-0.3, 1) };
}

export function poseFor(key, f, H) {
  if (key.startsWith('bat_swing_')) return swingPose(f, SWING_GROUPS.findIndex(g => g.key === key), H);
  if (key === 'run_bat_e' || key === 'run_bat_w') return POSES.run_bat(f);
  if (key === 'ground_bat_e' || key === 'ground_bat_w') return POSES.ground_bat(f);
  if (key === 'walk_bat_e' || key === 'walk_bat_w') return POSES.walk_bat(f);
  if (key === 'run_e' || key === 'run_w') return POSES.run(f);
  if (key === 'walk_e') return POSES.walk_ball(f);
  if (key === 'walk_w') return POSES.walk(f);
  const p = POSES[key];
  if (!p) throw new Error('No placeholder pose for ' + key);
  return p(f, H);
}

// ---------------------------------------------------------------------------

export function defaultLook(model) {
  if (model === 'UMP') return { shirt: '#ece6d2', shirtLo: '#b9b29c', shorts: '#2b2f33', skin: '#d4a07a', hair: '#9a9a92', shoes: '#3a3026', hat: '#ece6d2' };
  return { shirt: '#e4e8da', shirtLo: '#aeb5a4', shorts: '#34425e', skin: '#c08a5e', hair: '#20282a', shoes: '#f2f2ea' };
}

const BAT = '#caa463', BAT_LO = '#8f7139', GRIP = '#b9412f';

// Draw one frame with its feet at (x, ground). flip mirrors west-facing frames.
export function drawChar(ctx, model, key, frame, x, ground, look) {
  const anim = ANIM[key];
  if (!anim) throw new Error('Unknown animation ' + key);
  if (!anim.models.includes(model)) throw new Error(`${key} is not on the list for ${model}`);
  if (frame < 0 || frame >= anim.frames) throw new Error(`${key} has no frame ${frame}`);
  used.add(model + ':' + key);

  const L = look || defaultLook(model);
  const H = MODELS[model].px;
  const p = poseFor(key, frame, H);
  const side = anim.facing !== 'south';
  const s = anim.facing === 'west' ? -1 : 1;
  const X = u => x + s * u * H;
  const Y = v => ground - v * H;

  const crouch = p.crouch || 0, lean = p.lean || 0, bob = p.bob || 0;
  const hipY = 0.5 - 0.22 * crouch + bob, shY = 0.8 - 0.3 * crouch + bob;
  const shX = lean, hipX = 0;
  const lw = Math.max(2, Math.round(H * 0.06));
  const aw = 2;

  // shadow
  rect(ctx, x - H * 0.16, ground, H * 0.32, 2, 'rgba(0,0,0,.3)');

  // legs (back first)
  const hipOff = side ? [0, 0] : [-0.05, 0.05];
  const legs = p.feet.map((ft, i) => {
    const hx = hipX + hipOff[i];
    const fx = ft[0], fy = ft[1];
    const kx = (hx + fx) / 2 + (side ? (p.knees || 0.02) : 0), ky = (hipY + fy) / 2 + 0.02;
    return { hx, fx, fy, kx, ky };
  });
  const drawLeg = (l, dim) => {
    const col = dim ? shade(L.shorts, -0.25) : L.shorts;
    line(ctx, X(l.hx), Y(hipY), X(l.kx), Y(l.ky), lw, col);
    line(ctx, X(l.kx), Y(l.ky), X(l.fx), Y(l.fy + 0.03), lw, dim ? shade(L.skin, -0.2) : L.skin);
    rect(ctx, X(l.fx) - 2, Y(l.fy) - 2, 4, 2, L.shoes);
  };
  const handPts = p.hands.map((h, i) => (i === 1 && p.frontHand) ? p.frontHand : h);
  const drawArm = (i, dim) => {
    const h = (i === 1 && p.handAt) ? p.handAt : handPts[i];
    const sx = shX + (side ? 0 : (i ? 0.1 : -0.1));
    const ex = (sx + h[0]) / 2, ey = (shY + h[1]) / 2;
    line(ctx, X(sx), Y(shY - 0.02), X(ex), Y(ey), aw + 1, dim ? L.shirtLo : L.shirt);
    line(ctx, X(ex), Y(ey), X(h[0]), Y(h[1]), aw, dim ? shade(L.skin, -0.2) : L.skin);
  };

  if (side) { drawLeg(legs[0], true); drawArm(0, true); }

  // torso
  const tw = side ? 0.15 : 0.22;
  const tx = (shX + hipX) / 2;
  rect(ctx, X(tx) - (tw * H) / 2, Y(shY + 0.01), tw * H, (shY - hipY + 0.03) * H, L.shirt);
  rect(ctx, X(tx) - (tw * H) / 2, Y(hipY + 0.06), tw * H, 0.06 * H, L.shirtLo);

  // head
  const hw = Math.max(5, Math.round(0.14 * H)), hh = Math.max(6, Math.round(0.16 * H));
  const hcx = X(shX + (p.headDown ? 0.02 : 0));
  const htop = Y(shY + 0.04 + 0.16 - (p.headDown ? 0.03 : 0));
  rect(ctx, hcx - hw / 2, htop, hw, hh, L.skin);
  if (L.hat) rect(ctx, hcx - hw / 2 - 1, htop - 1, hw + 2, 3, L.hat);
  else if (side) rect(ctx, hcx - hw / 2 - (s < 0 ? -hw / 2 : 0), htop, hw / 2, hh * 0.45, L.hair), rect(ctx, hcx - hw / 2, htop, hw, 2, L.hair);
  else rect(ctx, hcx - hw / 2, htop, hw, Math.max(2, hh * 0.25), L.hair);
  if (!side) rect(ctx, hcx - 2, htop + hh * 0.45, 1, 1, '#000'), rect(ctx, hcx + 1, htop + hh * 0.45, 1, 1, '#000');

  if (side) { drawLeg(legs[1], false); drawArm(1, false); }
  else { drawLeg(legs[0], false); drawLeg(legs[1], false); drawArm(0, false); drawArm(1, false); }

  // held item, in the front (right) hand
  const hand = p.handAt || handPts[1];
  if (p.item === 'bat') {
    const d = p.dir || [0, 1];
    const hl = 0.13, r = Math.max(3, Math.round(0.065 * H));
    const ex = hand[0] + d[0] * hl, ey = hand[1] + d[1] * hl;
    line(ctx, X(hand[0]), Y(hand[1]), X(hand[0] + d[0] * 0.05), Y(hand[1] + d[1] * 0.05), 2, GRIP);
    line(ctx, X(hand[0] + d[0] * 0.05), Y(hand[1] + d[1] * 0.05), X(ex), Y(ey), 2, BAT_LO);
    const cx = X(ex + d[0] * r / H), cy = Y(ey + d[1] * r / H);
    ctx.fillStyle = BAT;
    for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++)
      if (xx * xx + yy * yy <= r * r + 1) ctx.fillRect(Math.round(cx + xx), Math.round(cy + yy), 1, 1);
    rect(ctx, cx + (s > 0 ? r - 1 : -r), cy - r + 2, 1, r * 2 - 3, BAT_LO);
  } else if (p.item === 'ball') {
    rect(ctx, X(hand[0]) - 1, Y(hand[1]) - 1, 3, 3, '#f6f2e8');
    rect(ctx, X(hand[0]), Y(hand[1]), 1, 1, '#b9412f');
  }
}

export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(c + (k < 0 ? c * k : (255 - c) * k))));
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join('');
}

// Which guard band and swing group a bat height maps to.
export function guardFrame(batIn) {
  let best = 0;
  GUARD_BANDS.forEach((b, i) => { if (Math.abs(b - batIn) < Math.abs(GUARD_BANDS[best] - batIn)) best = i; });
  return best;
}
export function swingKey(batIn) { return SWING_GROUPS.find(g => batIn <= g.upTo).key; }

// ---------------------------------------------------------------------------
// Props

export function drawBall(ctx, x, y, frame = 0) {
  used.add('prop:ball');
  rect(ctx, x - 1, y - 2, 3, 1, '#f6f2e8');
  rect(ctx, x - 2, y - 1, 5, 2, '#f6f2e8');
  rect(ctx, x - 2, y + 1, 5, 1, '#cdc5b3');
  rect(ctx, x - 1, y + 2, 3, 1, '#cdc5b3');
  const seams = [[[-2, 0], [2, -1]], [[-1, -1], [1, 1]], [[0, -2], [0, 1]], [[1, -1], [-1, 1]]][frame & 3];
  seams.forEach(([a, b]) => rect(ctx, x + a, y + b, 1, 1, '#b9412f'));
}

export function drawWicket(ctx, x, ground, kind, hitFrame = -1) {
  const far = kind === 'far';
  const key = hitFrame >= 0 ? 'wicket_hit' : (far ? 'wicket_far' : 'wicket_near');
  used.add('prop:' + key);
  const post = far ? '#9a8a62' : '#c9b98f', postLo = '#9a8a62';
  const board = far ? '#b3a684' : '#e7dcc0', boardLo = '#b3a684';
  const top = ground - 56 * PXI, boardBottom = ground - 44 * PXI;
  rect(ctx, x - 1, boardBottom, 3, ground - boardBottom, post);
  if (!far) {
    rect(ctx, x + 1, boardBottom, 1, ground - boardBottom, postLo);
    rect(ctx, x - 2, ground - 24 * PXI, 5, 1, '#b9412f');
  }
  const jolt = hitFrame === 0 ? 3 : hitFrame === 1 ? 1 : 0;
  const tilt = hitFrame === 0 ? 2 : hitFrame === 1 ? -1 : 0;
  rect(ctx, x - 4 + jolt, top + Math.abs(tilt), 9, 9, board);
  if (!far) {
    rect(ctx, x - 4 + jolt, top + Math.abs(tilt), 9, 1, boardLo);
    rect(ctx, x + 3 + jolt, top + Math.abs(tilt), 2, 9, boardLo);
  }
}

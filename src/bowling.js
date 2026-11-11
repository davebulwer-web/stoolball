// Your bowling, and the computer batting against it.
//
// Two bars, as in the brief: a power bar sets the pace (below the lob mark the
// ball has to be walked in), then a marker sweeps the height gauge during the
// run-up and a press lets the ball go at that height.
//
// The batter remembers. She keeps a running expectation of the height and pace
// you have been bowling, weighted towards the last ball, and holds her bat
// there. Bowl what she expects and she middles it however good it was;
// surprise her and her timing goes. A lob is walked in, so it never surprises.

import { BOARD_LO, BOARD_HI, BAT_LO, BAT_HI, ZONE_MID, ZONE_BACK, HEIGHT_TOL, PITCH } from './geometry.js';
import { ballH, LOB_VX } from './physics.js';

export const VX_MIN = 250, VX_MAX = 720;      // 14 to 41mph
export const POWER_PERIOD = 1.1;              // the power bar's sweep, seconds
export const HEIGHT_PERIOD = 1.6;             // the height marker's up-and-back
export const BEATEN = 0.3;                    // below this shot quality she misses it
export const AIM_LO = 20, AIM_HI = 84;        // what the marker covers: 80in a second

const tri = (t, period) => { const u = (t % period) / period; return u < 0.5 ? u * 2 : 2 - u * 2; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const livePower = t => tri(t, POWER_PERIOD);
export const liveAim = t => AIM_LO + tri(t, HEIGHT_PERIOD) * (AIM_HI - AIM_LO);
export const powerVx = p => VX_MIN + p * (VX_MAX - VX_MIN);
export const lobU = () => (LOB_VX - VX_MIN) / (VX_MAX - VX_MIN);

// A batter's head: skill falls down the order; the short ones like it low,
// the tall ones like it at the board.
export function newMind(p, i) {
  const skill = i < 4 ? 0.8 : i < 7 ? 0.72 : 0.62;
  const likes = p.model === 'W62' ? 'low' : p.model === 'M73' ? 'board' : 'none';
  return { skill, likes, memory: p.model === 'M73' ? 0.34 : 0.4, expH: 50, expPace: 600 };
}

function heightBand(h) {
  if (h >= 46 && h <= 58) return 1;
  if (h < 46) return Math.max(0.25, 1 - (46 - h) / 30);
  return Math.max(0.2, 1 - (h - 58) / 24);
}

function traitMult(m, h) {
  if (m.likes === 'low') return h < 46 ? 1.18 : (h > 58 ? 0.78 : 1);
  if (m.likes === 'board') return (h >= 44 && h <= 60) ? 1.22 : 0.8;
  return 1;
}

export function surprise(m, d) {
  const a = ballH(d, d.tBoard);
  let s = Math.min(1, Math.abs(a - m.expH) / 16 * 0.7 + Math.abs(d.vx - m.expPace) / 250 * 0.6);
  if (d.runup === 'walk') s *= 0.25;
  return s;
}

// What she does with this ball: leave it, or swing at time t with the bat at
// batH. The swing goes through the same contact test as yours, so the shot,
// the field and the running all follow from it.
export function plan(m, d, p, wide, rng = Math.random) {
  const a = ballH(d, d.tBoard);
  const sur = surprise(m, d);
  const holdH = clamp(m.expH, BAT_LO, BAT_HI);
  const onBoard = a >= BOARD_LO && a <= BOARD_HI;
  const base = { holdH, surprise: sur, arrival: a };
  if (a > wide) return { ...base, swing: false, why: 'wide' };

  let q = m.skill * heightBand(a) * traitMult(m, a) * (1 - 0.8 * sur);
  q = clamp(q + (rng() * 0.14 - 0.07), 0, 1);
  base.q = q;

  if (q < BEATEN) {
    if (!onBoard && rng() < 0.6) return { ...base, swing: false, why: 'left' };
    // beaten: through it too early, or a long way over or under it
    if (rng() < 0.5) {
      const xw = ZONE_MID - ZONE_BACK - 15;
      return { ...base, swing: true, t: xw / d.vx, batH: holdH, why: 'early' };
    }
    const tz = ZONE_MID / d.vx, hz = ballH(d, tz);
    const batH = hz + 16 <= BAT_HI ? hz + 16 + rng() * 4 : hz - 16 - rng() * 4;
    return { ...base, swing: true, t: tz, batH: clamp(batH, BAT_LO, BAT_HI), why: 'beaten' };
  }

  // She connects. Read well, she goes after it; otherwise she pushes it
  // into a gap or blocks it. Mistime a big shot and it goes up in the air.
  const attack = rng() < clamp((q - BEATEN) * 1.6 + (m.likes === 'board' ? 0.15 : 0), 0.08, 0.75);
  const sq = attack ? q * (0.75 + rng() * 0.3) : rng() < 0.4 ? 0.05 + rng() * 0.1 : 0.15 + rng() * 0.25;
  const zq = clamp(Math.sqrt(sq) * (0.9 + rng() * 0.2), 0.1, 1);
  const hq = clamp(sq / zq, 0.08, 1);
  const under = attack && (q < 0.5 || rng() < (m.likes === 'board' ? 0.45 : 0.2));
  const dh = (1 - hq) * HEIGHT_TOL * 0.95 * (under ? -1 : 1);
  const xw = Math.min(d.vx * d.tBoard - 4, ZONE_MID + (rng() < 0.6 ? -1 : 1) * (1 - zq) * ZONE_BACK);
  const t = xw / d.vx;
  return { ...base, swing: true, t, batH: clamp(ballH(d, t) + dh, BAT_LO, BAT_HI), why: 'hit' };
}

// After the ball, she has learned a bit more about you.
export function remember(m, d) {
  const a = ballH(d, d.tBoard);
  m.expH = m.expH * (1 - m.memory) + a * m.memory;
  m.expPace = m.expPace * (1 - m.memory) + d.vx * m.memory;
}

export function describe(d, wide) {
  const a = Math.round(ballH(d, d.tBoard));
  if (a < 24) return `Going in at ${a}in: under the mark.`;
  if (a > wide) return `Going over at ${a}in: above her reach.`;
  if (a >= BOARD_LO && a <= BOARD_HI) return `${a}in: on the board.`;
  return a < BOARD_LO ? `${a}in: under the board.` : `${a}in: over the board.`;
}

// Running when she's batting. They judge the throw against the quicker of the
// two ends, since they don't know which one you will pick, and some are more
// cautious than others. Called every step while the ball is in the field.
const LEG = (PITCH - 30 - 36) / 240;   // one length, from the ground to safe at the other end

export function run(R, P, RUN, rng = Math.random) {
  if (P.cls.kind !== 'field' || !P.plan || R.locked) return;
  if (!P.ai) P.ai = { caution: -0.25 + rng() * 0.6 };   // some of them chance it
  if (P.t < 0.25) return;
  const safeBy = Math.min(P.plan.tArrive.near, P.plan.tArrive.far) + 0.37 - P.t;
  if (RUN.canStart(R)) {
    if (RUN.START_DELAY + LEG + P.ai.caution < safeBy) RUN.call(R);
    return;
  }
  if (R.active && !R.committed) {
    let left = 0;
    for (const r of R.runners) {
      if (r.state === 'out') continue;
      const e = r.target === 'near' ? PITCH : 0;
      left = Math.max(left, (r.state === 'start' ? r.t : 0) + Math.max(0, Math.abs(e - r.pos) - (RUN.REACH - 6)) / RUN.SPEED);
    }
    if (left + RUN.TURN + LEG + P.ai.caution < safeBy) RUN.call(R);
  }
}

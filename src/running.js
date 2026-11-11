// Running between wickets. Positions are inches from the far wicket (0) to
// the batting wicket (PITCH). A batter is "home" within reach of a wicket.

import { PITCH, STRIKER_POS, NONSTRIKER_POS } from './geometry.js';

export const SPEED = 240;          // in/s, about 6 m/s carrying the bat
export const START_DELAY = 0.25;   // setting off from standing
export const TURN = 0.35;          // touch the board and turn
export const REACH = 36;           // bat on the board from this far out
export const GROUND_HOLD = 0.3;

const endPos = end => (end === 'near' ? PITCH : 0);
const other = end => (end === 'near' ? 'far' : 'near');
export const nearestEnd = pos => (pos > PITCH / 2 ? 'near' : 'far');

export function makeRunners(strikerId, nonStrikerId) {
  return {
    runners: [
      { id: strikerId, pos: STRIKER_POS, end: 'near', target: null, state: 'stand', t: 0, dir: 0 },
      { id: nonStrikerId, pos: NONSTRIKER_POS, end: 'far', target: null, state: 'stand', t: 0, dir: 0 },
    ],
    active: false, committed: false, runs: 0, legVoid: false, locked: false,
  };
}

export function isHome(r, end) {
  return r.state !== 'out' && Math.abs(r.pos - endPos(end)) <= REACH;
}

export function canStart(R) {
  return !R.active && !R.locked && R.runners.every(r => r.state === 'stand' || r.state === 'ground');
}

function beginLeg(R, delay) {
  R.active = true; R.legVoid = false;
  for (const r of R.runners) {
    if (r.state === 'out') continue;
    r.target = other(r.end);
    r.dir = r.target === 'near' ? 1 : -1;
    r.state = 'start'; r.t = delay;
  }
}

// Press: set off, or (while running) call for another.
export function call(R) {
  if (canStart(R)) { beginLeg(R, START_DELAY); return 'go'; }
  if (R.active && !R.committed && !R.locked) { R.committed = true; return 'another'; }
  return null;
}

export function step(R, dt) {
  for (const r of R.runners) {
    if (r.state === 'start') {
      r.t -= dt;
      if (r.t <= 0) { r.state = 'run'; r.pos += r.dir * SPEED * -r.t; }
    } else if (r.state === 'run') {
      r.pos += r.dir * SPEED * dt;
      const e = endPos(r.target);
      if (Math.abs(r.pos - e) <= REACH - 6 || (r.dir > 0 ? r.pos > e : r.pos < e)) {
        r.pos = e - r.dir * (REACH - 6);
        r.state = 'ground'; r.t = GROUND_HOLD; r.end = r.target;
      }
    } else if (r.state === 'ground') {
      r.t -= dt;
      if (r.t <= 0 && !R.active) r.state = 'stand';
    }
  }
  if (R.active) {
    const live = R.runners.filter(r => r.state !== 'out');
    if (live.every(r => r.state === 'ground')) {
      if (!R.legVoid && live.length === 2) R.runs += 1;
      R.active = false;
      if (R.committed && !R.locked && live.length === 2) { R.committed = false; beginLeg(R, TURN); }
      else R.committed = false;
    }
  }
}

// Seconds until runner r is home at `end`, given what it has been told to do.
export function eta(R, r, end) {
  if (r.state === 'out') return Infinity;
  const moving = r.state === 'start' || r.state === 'run';
  if (!moving) {
    if (isHome(r, end)) return 0;
    return Infinity;
  }
  const lead = r.state === 'start' ? r.t : 0;
  const toTarget = lead + Math.max(0, Math.abs(endPos(r.target) - r.pos) - REACH) / SPEED;
  if (r.target === end) return toTarget;
  if (R.committed) return toTarget + TURN + (PITCH - 2 * REACH) / SPEED;
  return Infinity;
}

// Which runner is in danger at `end` (heading there and not yet home).
export function runnerFor(R, end) {
  return R.runners.find(r => r.state !== 'out' && r.target === end &&
    (r.state === 'start' || r.state === 'run') && !isHome(r, end)) || null;
}

// After the ball is gathered, no new legs; a commit not yet acted on is cancelled.
export function lock(R) { R.locked = true; R.committed = false; }

export function settled(R) {
  return !R.active && R.runners.every(r => r.state === 'stand' || r.state === 'out' || r.state === 'ground');
}

// After the ball, who is at which end.
export function ends(R) {
  const res = {};
  for (const r of R.runners) if (r.state !== 'out') res[r.end] = r.id;
  return res;
}

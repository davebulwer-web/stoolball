// The field from above. Inches, origin at the batting wicket; +x runs along
// the line of the pitch away from the bowler (behind the batter), the far
// wicket is at (-PITCH, 0), and y is square of the wicket.
// A plan says where the ball goes, which fielder gets to it and when, so the
// game can time the throw and the field map can show it happening.

import { PITCH } from './geometry.js';
import { BOUNDARY, THROW_WINDUP } from './physics.js';

const deg = d => d * Math.PI / 180;
const at = (a, r) => ({ x: r * Math.cos(deg(a)), y: r * Math.sin(deg(a)) });

// nine fielders (the bowler and keeper are the other two)
export const FIELDERS = [
  at(30, 520), at(75, 420), at(120, 480), at(165, 700),
  at(-30, 520), at(-75, 420), at(-120, 480), at(-165, 700), at(5, 900),
];
export const KEEPER_SPOT = { x: 47, y: 0 };
export const BOWLER_SPOT = { x: -PITCH + 20, y: 0 };
export const FIELDER_SPEED = 230, REACT = 0.3, PICKUP_T = 0.25;

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const lerp = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
const NEAR = { x: 0, y: 0 }, FAR = { x: -PITCH, y: 0 };

function nearestFielder(p) {
  let best = 0;
  FIELDERS.forEach((f, i) => { if (dist(f, p) < dist(FIELDERS[best], p)) best = i; });
  return best;
}

function throwTimes(from, tGather, speed) {
  return {
    near: tGather + THROW_WINDUP + dist(from, NEAR) / speed,
    far: tGather + THROW_WINDUP + dist(from, FAR) / speed,
  };
}

// cls: from classifyShot. shot: from shotFromContact.
export function planShot(cls, shot, rng = Math.random) {
  const speed = 850 + rng() * 150;
  const side = rng() < 0.5 ? -1 : 1;
  const theta = deg((20 + rng() * 150) * side);
  const dir = { x: Math.cos(theta), y: Math.sin(theta) };
  const along = r => ({ x: dir.x * r, y: dir.y * r });

  if (cls.kind === 'field' && cls.dribble) {
    // the keeper runs out and scoops it up himself
    const stop = { x: cls.reach, y: (rng() - 0.5) * 40 };
    const tRoll = 0.3 + cls.reach / 300;
    const tGather = REACT + dist(KEEPER_SPOT, stop) / 200 + 0.4;
    return {
      kind: 'keeper', keeper: true, reach: cls.reach, stop, intercept: stop, tGather, speed: 800, fielder: -1,
      tArrive: { far: tGather + 0.3 + dist(stop, FAR) / 800, near: tGather + dist(stop, NEAR) / 200 },
      ballAt: t => (t < tRoll ? lerp(NEAR, stop, 1 - (1 - t / tRoll) ** 2) : stop),
      chaser: KEEPER_SPOT,
    };
  }

  if (cls.kind === 'field' && !cls.dropped) {
    // along the ground: decelerates to a stop at reach, unless cut off first
    const T = 0.3 + cls.reach / 850;
    const ballTime = s => T * (1 - Math.sqrt(Math.max(0, 1 - s / cls.reach)));
    let fi = 0, sBest = cls.reach, tBest = Infinity;
    const points = [];
    for (let s = 40; s < cls.reach; s += 20) points.push(s);
    points.push(cls.reach);
    for (const s of points) {
      const p = along(s);
      FIELDERS.forEach((f, i) => {
        // a fielder cuts it off only by getting there before (or just as) it passes;
        // once it has stopped, anyone can walk up to it
        const tf = REACT + dist(f, p) / FIELDER_SPEED, tb = ballTime(Math.min(s, cls.reach));
        const stopped = s >= cls.reach - 1e-6;
        if (!stopped && tf > tb + 0.12) return;
        const t = Math.max(tf, stopped ? T : tb);
        if (t < tBest) { tBest = t; fi = i; sBest = Math.min(s, cls.reach); }
      });
    }
    const intercept = along(sBest);
    const tGather = tBest + PICKUP_T;
    return {
      kind: 'ground', reach: cls.reach, theta, intercept, stop: intercept, fielder: fi, tGather, speed,
      tIntercept: tBest, tArrive: throwTimes(intercept, tGather, speed),
      ballAt: t => along(t >= tBest ? sBest : Math.min(sBest, cls.reach * (1 - (1 - t / T) ** 2))),
      chaser: FIELDERS[fi],
    };
  }

  // in the air: caught, dropped, or over the rope
  const carry = Math.min(shot.carry, BOUNDARY + 150);
  const land = along(carry);
  const fi = nearestFielder(land);
  const tLand = Math.max(0.3, shot.hang);
  if (cls.kind === 'field') {
    // dropped: a fumble, then the throw
    const tGather = Math.max(tLand, REACT + dist(FIELDERS[fi], land) / FIELDER_SPEED) + 0.7;
    return {
      kind: 'dropped', reach: carry, theta, intercept: land, stop: land, fielder: fi, tGather, speed,
      tIntercept: tGather - 0.7, tArrive: throwTimes(land, tGather, speed),
      ballAt: t => along(carry * Math.min(1, t / tLand)), chaser: FIELDERS[fi],
    };
  }
  const end = cls.kind === 'caught' ? land : along(Math.max(carry, BOUNDARY + 60));
  const tEnd = cls.tEnd || tLand;
  return {
    kind: cls.kind, reach: carry, theta, intercept: end, stop: end, fielder: fi, tGather: tEnd, speed,
    tIntercept: tEnd, tArrive: { near: Infinity, far: Infinity },
    ballAt: t => lerp(NEAR, end, Math.min(1, t / tEnd)), chaser: FIELDERS[fi],
  };
}

// Where the chasing fielder is at time t.
export function chaserAt(plan, t) {
  const from = plan.chaser, to = plan.intercept;
  const tStart = REACT, tGet = Math.max(tStart + 0.01, plan.tIntercept != null ? plan.tIntercept : plan.tGather - 0.4);
  const runT = dist(from, to) / (plan.keeper ? 200 : FIELDER_SPEED);
  const u = Math.max(0, Math.min(1, (t - tStart) / Math.max(runT, 0.01)));
  return t >= tGet ? to : lerp(from, to, u);
}

export { NEAR as NEAR_WICKET, FAR as FAR_WICKET, dist };

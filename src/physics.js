// Ball flight, contact and shot outcome. Pure functions, inches and seconds.
// Delivery and contact maths are carried over from the one-over prototype.

import { G, H0, DIST, ZONE_MID, ZONE_BACK, HEIGHT_TOL, PITCH } from './geometry.js';

export function makeDelivery(vx, aim) {
  const t = DIST / vx;
  const vy = (aim - H0 + 0.5 * G * t * t) / t;
  return { vx, vy, tBoard: t, tZone: t * ZONE_MID / DIST, runup: vx >= LOB_VX ? 'long' : 'walk', aim };
}

// below this pace a ball is a lob and has to be walked in
export const LOB_VX = 440;

export const ballH = (d, t) => H0 + d.vy * t - 0.5 * G * t * t;
export const ballXW = (d, t) => d.vx * t;

// The swing at time t (since release) with the bat at batH.
export function swingAt(d, t, batH) {
  const xw = ballXW(d, t), h = ballH(d, t);
  const inZone = xw >= ZONE_MID - ZONE_BACK;
  const info = { xw, h, dh: batH - h, inZone, contact: null };
  if (!inZone) return info;
  const zq = 1 - Math.abs(xw - ZONE_MID) / ZONE_BACK;
  const hq = 1 - Math.abs(batH - h) / HEIGHT_TOL;
  if (zq <= 0 || hq <= 0) return info;
  info.contact = { xw, h, zq, hq, dh: batH - h };
  return info;
}

export function shotFromContact(c) {
  const q = c.zq * c.hq;
  let angle = (-c.dh) * 3 + 4;
  angle = Math.max(-4, Math.min(62, angle));
  const exit = 300 + q * 900;
  const rad = angle * Math.PI / 180;
  const vxh = exit * Math.cos(rad), vyh = exit * Math.sin(rad);
  let carry;
  if (vyh <= 0) carry = vxh * 0.55;
  else carry = vxh * ((vyh + Math.sqrt(vyh * vyh + 2 * G * c.h)) / G);
  const hang = vyh <= 0 ? 0.3 : (vyh + Math.sqrt(vyh * vyh + 2 * G * c.h)) / G;
  return { q, angle, vxh, vyh, carry, hang, airborne: angle > 7 };
}

export const BOUNDARY = 1150;   // about 32 yards: a village ground
export const SIX = 1200;
export const CATCH_CHANCE = 0.45;

// What becomes of a shot: six, four, caught, or a ball the field has to chase.
// reach is how far from the batting wicket the ball is stopped, in inches.
export function classifyShot(sh, rng = Math.random) {
  if (sh.airborne) {
    if (sh.carry >= SIX) return { kind: 'six', tEnd: sh.hang };
    if (sh.carry >= BOUNDARY) return { kind: 'four', tEnd: sh.hang + 0.4, oneBounce: true };
    if (rng() < CATCH_CHANCE) return { kind: 'caught', tEnd: sh.hang };
    return { kind: 'field', reach: sh.carry * 1.1, dropped: true };
  }
  if (sh.q < 0.15) return { kind: 'field', reach: 30 + sh.q * 480, dribble: true };
  const reach = sh.carry * 2.6;
  if (reach >= BOUNDARY) return { kind: 'four', tEnd: reach / (sh.vxh * 0.7) };
  return { kind: 'field', reach };
}

// ---------------------------------------------------------------------------
// Fielding. The hit goes away behind the batter (screen right). A fielder off
// screen chases it down and throws to one end or the other.

export const THROW_WINDUP = 0.4, GATHER = 0.15, BREAK = 0.22;

export function fieldingPlan(reach, rng = Math.random) {
  const theta = (20 + rng() * 140) * Math.PI / 180;   // angle off the line of the pitch
  const fx = reach * Math.cos(theta), fy = reach * Math.sin(theta);
  const dNear = reach;
  const dFar = Math.hypot(fx + PITCH, fy);
  const tGather = 0.8 + reach / 700 + rng() * 0.3;
  const speed = 850 + rng() * 150;
  return { reach, tGather, speed,
    tArrive: { near: tGather + THROW_WINDUP + dNear / speed, far: tGather + THROW_WINDUP + dFar / speed } };
}

// The keeper fields a dribble himself: run to it, scoop it, then throw to the
// far end or run it back to his own wicket.
export const KEEPER_RUN = 200, PICKUP = 0.4;
export function keeperPlan(reach, keeperIn) {
  const run = Math.abs(reach - keeperIn) / KEEPER_RUN;
  const tGather = 0.25 + run + PICKUP;
  return { reach, keeper: true, tGather, speed: 800,
    tArrive: { far: tGather + 0.3 + (PITCH + reach) / 800, near: tGather + reach / KEEPER_RUN } };
}

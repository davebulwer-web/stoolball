import test from 'node:test';
import assert from 'node:assert/strict';
import * as RUN from '../src/running.js';
import { makeDelivery, ballH, shotFromContact, classifyShot, fieldingPlan } from '../src/physics.js';
import { ANIMS, MODELS, PLAYERS } from '../src/sprites.js';
import { poseFor, guardFrame, swingKey } from '../src/placeholder.js';
import { BOARD_LO, BOARD_HI, PITCH } from '../src/geometry.js';

const run = (R, secs) => { for (let t = 0; t < secs; t += 1 / 60) RUN.step(R, 1 / 60); };

test('a delivery arrives at the height it was aimed at', () => {
  const d = makeDelivery(690, 50);
  assert.ok(Math.abs(ballH(d, d.tBoard) - 50) < 1e-6);
  assert.equal(makeDelivery(250, 50).runup, 'walk');
});

test('one run takes about two and a half seconds and swaps the ends', () => {
  const R = RUN.makeRunners(0, 1);
  assert.equal(RUN.call(R), 'go');
  run(R, 2.2);
  assert.equal(R.runs, 0);
  run(R, 0.5);
  assert.equal(R.runs, 1);
  run(R, 0.5);
  assert.ok(RUN.settled(R));
  assert.deepEqual(RUN.ends(R), { far: 0, near: 1 });
});

test('calling for another turns them round for a second run', () => {
  const R = RUN.makeRunners(0, 1);
  RUN.call(R); run(R, 0.5);
  assert.equal(RUN.call(R), 'another');
  run(R, 6);
  assert.equal(R.runs, 2);
  assert.deepEqual(RUN.ends(R), { near: 0, far: 1 });
});

test('the batter heading to an end is the one in danger there', () => {
  const R = RUN.makeRunners(0, 1);
  assert.equal(RUN.runnerFor(R, 'far'), null);
  RUN.call(R); run(R, 1);
  assert.equal(RUN.runnerFor(R, 'far').id, 0);
  assert.equal(RUN.runnerFor(R, 'near').id, 1);
  const e = RUN.eta(R, R.runners[0], 'far');
  assert.ok(e > 1 && e < 1.6, String(e));
});

test('locking after the ball is gathered cancels a call not yet acted on', () => {
  const R = RUN.makeRunners(0, 1);
  RUN.call(R); RUN.call(R); RUN.lock(R);
  run(R, 6);
  assert.equal(R.runs, 1);
  assert.equal(RUN.call(R), null);
});

test('a short push is safe for one but a second is a run-out at the near end', () => {
  const rng = () => 0.5;
  const plan = fieldingPlan(500, rng);
  const one = 0.25 + (PITCH - 30 - 36 - 30) / RUN.SPEED;
  assert.ok(plan.tArrive.far > one, 'single is safe');
  assert.ok(plan.tArrive.near < one * 2 + RUN.TURN, 'two is not');
});

test('shot outcomes cover every kind', () => {
  const kinds = new Set();
  for (let dh = -13; dh <= 13; dh += 0.5) for (let zq = 0.05; zq <= 1.001; zq += 0.05) {
    const sh = shotFromContact({ zq, hq: 1 - Math.abs(dh) / 13, dh, h: 50 });
    kinds.add(classifyShot(sh, () => 0.9).kind);
    kinds.add(classifyShot(sh, () => 0.1).kind);
  }
  for (const k of ['six', 'four', 'caught', 'field']) assert.ok(kinds.has(k), k);
});

test('every animation has a pose for every frame, and the list is consistent', () => {
  for (const a of ANIMS) {
    assert.equal(a.frameNotes.length, a.frames, a.key);
    for (const m of a.models) {
      assert.ok(MODELS[m], m);
      for (let f = 0; f < a.frames; f++) assert.ok(poseFor(a.key, f, MODELS[m].px), `${a.key} ${f}`);
    }
  }
  assert.equal(PLAYERS.length, 4);
});

test('the stance at board height is the rest frame', () => {
  const f = guardFrame(50);
  assert.ok(f >= 0);
  assert.equal(swingKey(50), 'bat_swing_mid');
  assert.equal(swingKey(25), 'bat_swing_low');
  assert.equal(swingKey(75), 'bat_swing_high');
  assert.ok(BOARD_LO <= 50 && 50 <= BOARD_HI);
});

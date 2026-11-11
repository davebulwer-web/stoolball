// A batting innings, on placeholder sprites. You bat; the computer bowls,
// keeps wicket and fields. Overs alternate between women and men bowlers.

import * as GEO from './geometry.js';
import {
  W, H, GROUND, PXI, PXX, BW_SX, PITCH, REL_SX, FAR_SX, RUNUP, BOARD_LO, BOARD_HI, NOBALL_H,
  BAT_LO, BAT_HI, ZONE_MID, sy, KEEPER_SX, UMPIRE_SX, STRIKER_POS, NONSTRIKER_POS, BOWLER_FAR_SX, sxFromFar,
} from './geometry.js';
import { makeDelivery, ballH, ballXW, swingAt, shotFromContact, classifyShot, fieldingPlan, keeperPlan, GATHER, BREAK, KEEPER_RUN } from './physics.js';
import * as RUN from './running.js';
import { ANIM, REST_BAND } from './sprites.js';
import { drawChar, drawBall, drawWicket, guardFrame, swingKey } from './placeholder.js';
import { homeSide, awaySide, attack, KEEPER_INDEX } from './teams.js';

const BALLS_PER_OVER = 8;
const KEEPER_IN = (KEEPER_SX - BW_SX) / PXX;          // keeper stands this far behind the wicket, in
const WALK = 34, JOG = 80;                            // px/s on screen
const MARK = { long: FAR_SX - 6, walk: FAR_SX + RUNUP * PXX * 0.45 };
const RUNUP_LEN = { long: 1.25, walk: 1.6 };
const EDGE_R = W + 18, EDGE_L = -18;

export function createGame(ctx, opts = {}) {
  const rng = opts.rng || Math.random;
  const S = { clock: 0, phase: 'idle', t: 0, batH: REST_BAND, listeners: [] };

  const emit = () => S.listeners.forEach(f => f(S));

  // ------------------------------------------------------------------ setup
  function newInnings(overs) {
    const home = homeSide(), away = awaySide();
    Object.assign(S, {
      overs, home, away,
      keeper: away[KEEPER_INDEX],
      attack: attack(away).map(b => ({ ...b, balls: 0, runs: 0, wkts: 0, overRuns: 0, maidens: 0 })),
      cards: home.map(p => ({ p, runs: 0, balls: 0, how: null, fours: 0, sixes: 0, in: false })),
      total: 0, wkts: 0, extras: 0, over: 0, legal: 0, book: [], fow: [],
      striker: 0, nonStriker: 1, nextIn: 2, bowlerIdx: 0,
      walkers: [], ball: null, play: null, result: null, swing: null, msg: null,
      bowler: { x: MARK.long, key: 'bowl_ready', t0: 0 },
      keeperA: { x: KEEPER_SX, key: 'keep_ready', t0: 0 },
      umpire: { key: 'ump_idle', t0: 0 },
      hits: { near: -1, far: -1 }, hitT: { near: 0, far: 0 },
    });
    S.cards[0].in = S.cards[1].in = true;
    S.R = RUN.makeRunners(0, 1);
    hideRunner(0); hideRunner(1);
    S.walkers = [
      { id: 0, x: EDGE_R, to: sxFromFar(STRIKER_POS), key: 'walk_bat_w', in: true },
      { id: 1, x: EDGE_L, to: sxFromFar(NONSTRIKER_POS), key: 'walk_bat_e', in: true },
    ];
    S.d = chooseDelivery();
    setPhase('between');
    S.msg = { text: 'The openers walk out.', sub: `${S.home[0].name} and ${S.home[1].name}. ${currentBowler().p.name} to bowl.` };
  }

  const currentBowler = () => S.attack[S.bowlerIdx];
  const player = id => S.home[id];
  const wideLine = () => player(S.striker).heightIn + 6;

  function setPhase(p) { S.phase = p; S.t = 0; emit(); }
  function hideRunner(id) { const r = S.R.runners.find(r => r.id === id); if (r) r.hidden = true; }

  function chooseDelivery() {
    const st = currentBowler().style;
    const u = rng();
    const kind = u < st.mix[0] ? 'quick' : u < st.mix[0] + st.mix[1] ? 'slower' : 'donkey';
    const base = kind === 'quick' ? st.quick : kind === 'slower' ? st.slower : 250;
    let aim = 50 + (rng() + rng() + rng() - 1.5) * st.spread;
    const v = rng();
    if (v < 0.08) aim = 68 + rng() * 10;       // the odd one up high
    else if (v < 0.14) aim = 18 + rng() * 10;  // and one at the toes
    const d = makeDelivery(base * (0.96 + rng() * 0.08), aim);
    d.kind = kind;
    return d;
  }

  // ------------------------------------------------------------------ input
  function setBat(h) { S.batH = Math.max(BAT_LO, Math.min(BAT_HI, h)); }

  function press() {
    if (S.phase === 'flight') return swing();
    if (S.phase === 'play') {
      const r = RUN.call(S.R);
      if (r === 'go') S.msg = { text: 'Yes! Run!', sub: 'Press again to call for another.' };
      else if (r === 'another') S.msg = { text: 'And another!', sub: 'Committed to turning for the next one.' };
      return r;
    }
    if (S.phase === 'between' && S.t > 0.2) return skipBetween();
    if (S.phase === 'overEnd' && S.t > 0.3) return startOver();
    return null;
  }

  function swing() {
    if (S.swing) return;
    const info = swingAt(S.d, S.t, S.batH);
    S.swing = { t: S.t, clock: S.clock, batH: S.batH, info };
    if (info.contact) startPlay(info.contact);
  }

  // ------------------------------------------------------------------ the ball in play
  function startPlay(c) {
    const shot = shotFromContact(c);
    const cls = classifyShot(shot, rng);
    const xw0 = ballXW(S.d, S.t) - GEO.DIST;     // inches from the batting wicket
    const play = { shot, cls, t: 0, plan: null, end: null, tCatch: null, caught: false, attempt: null, outcome: null };
    S.play = play;
    if (cls.kind === 'field' && cls.dribble) {
      const v0 = 160 + shot.q * 200;
      S.ball = { mode: 'free', xw: xw0, h: c.h, vx: v0, vy: 20, stopAt: cls.reach, spin: 0 };
      play.plan = keeperPlan(cls.reach, KEEPER_IN);
    } else {
      S.ball = { mode: 'free', xw: xw0, h: c.h, vx: shot.vxh, vy: shot.vyh, spin: 0 };
      if (cls.kind === 'field') play.plan = fieldingPlan(cls.reach, rng);
    }
    S.cards[S.striker].balls += isExtra() ? 0 : 1;
    setPhase('play');
    S.msg = { text: cls.kind === 'field' ? (cls.dribble ? 'Dribbled out in front of the keeper.' : 'Hit into the field.') : 'In the air!',
      sub: cls.kind === 'field' ? 'Run? Press to go.' : 'Run while it hangs, if you like.' };
  }

  function arrival() { return ballH(S.d, S.d.tBoard); }
  function isNoBall() { return arrival() < NOBALL_H; }
  function isWide() { return arrival() > wideLine(); }
  function isExtra() { return isNoBall() || isWide(); }

  function chooseThrowEnd(plan, now) {
    let best = null, bestMargin = 0;
    for (const end of ['near', 'far']) {
      const r = RUN.runnerFor(S.R, end);
      if (!r) continue;
      const left = plan.tArrive[end] - now + GATHER + BREAK;
      const margin = RUN.eta(S.R, r, end) - left;
      if (margin > bestMargin) { bestMargin = margin; best = end; }
    }
    return best || (plan.keeper ? 'near' : (S.R.active ? (RUN.runnerFor(S.R, 'near') ? 'near' : 'far') : 'near'));
  }

  function updatePlay(dt) {
    const P = S.play, cls = P.cls;
    P.t += dt;
    RUN.step(S.R, dt);

    if (cls.kind === 'six' || cls.kind === 'four' || cls.kind === 'caught') {
      if (P.t >= cls.tEnd) {
        RUN.lock(S.R);
        const extra = isNoBall() ? 1 : isWide() ? 1 : 0;
        if (cls.kind === 'caught') {
          if (isNoBall()) return dead({ runs: S.R.runs, extras: 1, text: 'Caught, but it was a no ball!', sub: 'Under the mark. Not out.', signals: ['ump_noball'], resetEnds: true });
          return dead({ runs: 0, extras: extra, wicket: { id: S.striker, how: `c fielder b ${currentBowler().p.name}` },
            text: 'Caught.', sub: P.shot.hang > 1.4 ? 'Hung up there for an age. Taken.' : 'Straight down a fielder\'s throat.', signals: ['ump_out'], resetEnds: true });
        }
        const runs = cls.kind === 'six' ? 6 : 4;
        return dead({ runs, boundary: runs, extras: extra, text: runs === 6 ? 'Out of the ground!' : (cls.oneBounce ? 'One bounce into the rope.' : 'Along the ground to the rope.'),
          sub: runs === 6 ? 'Underneath it and timed.' : 'Four.', signals: [...extraSignals(), runs === 6 ? 'ump_six' : 'ump_four'], resetEnds: true });
      }
      return;
    }

    // a ball the fielders have to chase
    const plan = P.plan;
    if (!P.end && P.t >= plan.tGather) {
      P.end = chooseThrowEnd(plan, P.t);
      P.tCatch = plan.tArrive[P.end];
      if (plan.keeper) S.ball = { mode: 'held' };
      else S.ball = { mode: 'hidden' };
      if (!plan.keeper || P.end === 'far') {
        const from = plan.keeper ? { x: BW_SX + plan.reach * PXX, h: 30 } : { x: EDGE_R + 10, h: P.end === 'far' ? 110 : 70 };
        const to = P.end === 'near' ? { x: KEEPER_SX - 4, h: 40 } : { x: BOWLER_FAR_SX + 3, h: 40 };
        const visible = Math.min(P.tCatch - P.t, Math.abs(from.x - to.x) / PXX / plan.speed + (plan.keeper ? 0.3 : 0));
        S.ball = { mode: 'arc', from, to, t0: P.tCatch - visible, dur: visible, apex: P.end === 'far' ? 40 : 10, wait: true };
      }
    }
    if (P.end && !P.caught && P.t >= P.tCatch) {
      P.caught = true;
      RUN.lock(S.R);
      S.ball = { mode: 'held' };
      const r = RUN.runnerFor(S.R, P.end);
      if (r) P.attempt = { id: r.id, at: P.t + GATHER };
    }
    if (P.attempt && !P.outcome && P.t >= P.attempt.at + BREAK) {
      const r = S.R.runners.find(x => x.id === P.attempt.id);
      S.hits[P.end] = 0; S.hitT[P.end] = S.clock;
      if (!RUN.isHome(r, P.end)) {
        r.state = 'out'; S.R.legVoid = true;
        P.outcome = { out: r.id };
      } else P.outcome = { safe: r.id };
    }
    if (P.caught && (!P.attempt || P.outcome) && RUN.settled(S.R) && P.t >= P.tCatch + 0.4) {
      const runs = S.R.runs, extras = isExtra() ? 1 : 0;
      if (P.outcome && P.outcome.out != null) {
        const who = player(P.outcome.out);
        return dead({ runs, extras, wicket: { id: P.outcome.out, how: 'run out' }, runOutEnd: P.end,
          text: `Run out! ${who.name} is short.`, sub: runs ? `${runs} completed before it.` : 'Should have stayed put.', signals: ['ump_out'] });
      }
      const sub = P.outcome && P.outcome.safe != null ? 'Made it by a whisker!'
        : cls.dropped ? 'Dropped it, and they ran.' : (runs ? '' : 'Fielded. No run.');
      return dead({ runs, extras, text: runs === 0 ? 'No run.' : runs === 1 ? 'One run.' : `${runs} runs.`, sub, signals: extraSignals() });
    }
  }

  function extraSignals() { return isNoBall() ? ['ump_noball'] : isWide() ? ['ump_wide'] : []; }

  // ------------------------------------------------------------------ outcome
  function dead(res) {
    S.result = res;
    const card = S.cards[S.striker];
    const legal = !isExtra();
    S.total += res.runs + res.extras;
    S.extras += res.extras;
    if (!S.play) card.balls += legal ? 1 : 0;
    card.runs += res.runs;
    if (res.boundary === 4) card.fours++;
    if (res.boundary === 6) card.sixes++;
    const bw = currentBowler();
    bw.runs += res.runs + res.extras; bw.overRuns += res.runs + res.extras;
    if (legal) { bw.balls++; S.legal++; }
    if (res.wicket) {
      S.wkts++;
      S.cards[res.wicket.id].how = res.wicket.how;
      if (res.wicket.how !== 'run out') bw.wkts++;
      S.fow.push({ score: S.total, wkt: S.wkts, name: player(res.wicket.id).name });
    }
    const sym = res.wicket ? 'W' : isNoBall() ? 'nb' : isWide() ? 'wd' : res.runs === 0 ? '·' : String(res.runs);
    S.book.push({ sym, wicket: !!res.wicket, extra: !legal, boundary: !!res.boundary });
    res.signalT0 = S.clock + 0.5;
    res.duration = Math.max(1.9, 0.5 + res.signals.length * 1.1 + 0.3);
    if (res.wicket) {
      const r = S.R.runners.find(r => r.id === res.wicket.id);
      if (r) r.state = 'out';
    }
    setPhase('dead');
  }

  function afterBall() {
    const res = S.result;
    // who ends up where
    let ends;
    if (res.resetEnds) {
      ends = { near: S.striker, far: S.nonStriker };
    } else {
      ends = {};
      for (const r of S.R.runners) if (r.state !== 'out') ends[RUN.nearestEnd(r.pos)] = r.id;
    }
    if (res.wicket) for (const e of ['near', 'far']) if (ends[e] === res.wicket.id) delete ends[e];
    S.walkers = S.walkers.filter(w => !w.in);
    if (res.wicket) {
      const r = S.R.runners.find(r => r.id === res.wicket.id);
      const x = r ? sxFromFar(r.pos) : sxFromFar(STRIKER_POS);
      const goRight = x > W / 2;
      S.walkers.push({ id: res.wicket.id, x, to: goRight ? EDGE_R : EDGE_L, key: goRight ? 'walk_bat_e' : 'walk_bat_w', in: false });
      // the vacant end: where the out batter was going, or the striker's end
      let vacant = res.runOutEnd || 'near';
      if (ends[vacant] != null) vacant = vacant === 'near' ? 'far' : 'near';
      if (S.wkts >= 10 || S.nextIn >= S.home.length) return endInnings('All out.');
      const id = S.nextIn++;
      S.cards[id].in = true;
      ends[vacant] = id;
      S.walkers.push(vacant === 'near'
        ? { id, x: EDGE_R, to: sxFromFar(STRIKER_POS), key: 'walk_bat_w', in: true }
        : { id, x: EDGE_L, to: sxFromFar(NONSTRIKER_POS), key: 'walk_bat_e', in: true });
    }
    S.striker = ends.near; S.nonStriker = ends.far;
    const overDone = S.legal > 0 && S.legal % BALLS_PER_OVER === 0 && !isExtraLast();
    resetBall();
    if (overDone) {
      const bw = currentBowler();
      if (bw.overRuns === 0) bw.maidens++;
      bw.overRuns = 0;
      S.over++;
      if (S.over >= S.overs) return endInnings('Overs done.');
      setPhase('overEnd');
      S.msg = { text: `End of over ${S.over}.`, sub: `${S.total} for ${S.wkts}. ${S.attack[S.over % S.attack.length].p.name} to bowl from the other end.` };
      return;
    }
    S.d = chooseDelivery();
    setPhase('between');
    S.msg = null;
  }

  function isExtraLast() { const b = S.book[S.book.length - 1]; return b && b.extra; }

  function startOver() {
    // bowling swaps ends, so the batters swap who faces
    [S.striker, S.nonStriker] = [S.nonStriker, S.striker];
    S.bowlerIdx = S.over % S.attack.length;
    S.book = [];
    resetBall();
    S.bowler = { x: MARK.long, key: 'bowl_ready', t0: S.clock };
    S.d = chooseDelivery();
    S.walkers.forEach(w => { if (w.in) w.to = w.id === S.striker ? sxFromFar(STRIKER_POS) : sxFromFar(NONSTRIKER_POS); });
    setPhase('between');
    S.msg = { text: `${currentBowler().p.name} to bowl.`, sub: currentBowler().p.model.startsWith('W') ? 'Her over.' : 'His over.' };
  }

  function resetBall() {
    const hidden = new Set(S.walkers.filter(w => w.in).map(w => w.id));
    S.R = RUN.makeRunners(S.striker, S.nonStriker);
    S.R.runners.forEach(r => { if (hidden.has(r.id)) r.hidden = true; });
    S.swing = null; S.play = null; S.result = null;
    if (!(S.ball && S.ball.mode === 'arc' && S.ball.clock)) S.ball = { mode: 'held' };
    S.hits = { near: -1, far: -1 };
  }

  function endInnings(why) {
    S.endWhy = why;
    setPhase('done');
  }

  function skipBetween() {
    S.walkers.forEach(w => { w.x = w.to; });
    S.bowler.x = MARK[S.d.runup];
    S.ball = { mode: 'held' };
    S.t = 9;
  }

  // ------------------------------------------------------------------ clock
  function update(dtRaw) {
    const dt = Math.min(dtRaw, 0.1);
    S.dt = dt;
    S.clock += dt;
    if (S.phase === 'idle' || S.phase === 'done') return;
    S.t += dt;
    if (opts.onStep) opts.onStep(S, dt);
    if (S.phase === 'idle' || S.phase === 'done') return;
    updateWalkers(dt);
    updateBall(dt);

    if (S.phase === 'between') {
      const mark = MARK[S.d.runup];
      const b = S.bowler;
      if (Math.abs(b.x - mark) > 1) {
        const dir = Math.sign(mark - b.x);
        b.x += dir * Math.min(WALK * dt, Math.abs(mark - b.x));
        setAnim(b, dir > 0 ? 'walk_e' : 'walk_w');
      } else { b.x = mark; setAnim(b, 'bowl_ready'); }
      const ready = Math.abs(b.x - mark) <= 1 && S.walkers.every(w => !w.in || w.x === w.to) && S.ball.mode !== 'arc';
      if (ready && S.t >= 0.7) {
        S.walkers = S.walkers.filter(w => !w.in);
        S.R.runners.forEach(r => { r.hidden = false; });
        setPhase('runup');
        S.msg = S.d.runup === 'long'
          ? { text: 'In off the long run.', sub: 'Could be the quick one, could be the slower ball.' }
          : { text: 'Walking in off a few paces.', sub: 'This one is going up in the air.' };
      }
    } else if (S.phase === 'runup') {
      const len = RUNUP_LEN[S.d.runup];
      const from = MARK[S.d.runup], u = Math.min(1, S.t / len);
      S.bowler.x = from + (REL_SX - from) * u;
      if (S.t > len - 0.2) setAnim(S.bowler, 'bowl_deliver', S.t > len - 0.1 ? 1 : 0);
      else setAnim(S.bowler, S.d.runup === 'long' ? 'run_e' : 'walk_e');
      if (S.t >= len) {
        setPhase('flight');
        S.bowler.deliverAt = S.clock;
        S.ball = { mode: 'delivery' };
        S.msg = { text: 'Watch it out of the hand.', sub: 'Bat to the height, then press.' };
      }
    } else if (S.phase === 'flight') {
      bowlerFollowThrough();
      if (S.t >= S.d.tBoard && !S.swing?.info.contact) {
        // past the bat: bowled, or on to the keeper
        const a = arrival();
        if (!isExtra() && a >= BOARD_LO && a <= BOARD_HI) {
          if (rng() < 0.12) {
            S.ball = { mode: 'free', xw: 0, h: a - 20, vx: -60, vy: 40 };
            return dead({ runs: 0, extras: 0, text: 'Struck on the thigh.', sub: 'Body before wicket. Appealed. Turned down, as ever.', signals: [] });
          }
          S.hits.near = 0; S.hitT.near = S.clock;
          S.ball = { mode: 'free', xw: 0, h: a, vx: -40, vy: 30 };
          return dead({ runs: 0, extras: 0, wicket: { id: S.striker, how: `b ${currentBowler().p.name}` }, text: 'Bowled!', sub: 'Clean onto the board.', signals: ['ump_out'] });
        }
        S.ball = { mode: 'free', xw: 0, h: a, vx: S.d.vx, vy: S.d.vy - GEO.G * S.d.tBoard, toKeeper: true };
        S.phase = 'keeper';
      }
    } else if (S.phase === 'keeper') {
      bowlerFollowThrough();
      if (S.ball.mode === 'held') {
        const sub = S.swing ? (S.swing.info.inZone ? (S.swing.info.dh > 0 ? 'Over the top of it.' : 'Underneath it.') : 'Through the shot too early.') : 'Left alone.';
        const a = arrival();
        const where = a < BOARD_LO ? ' Under the board.' : a > BOARD_HI ? ' Over the board.' : '';
        return dead({ runs: 0, extras: isExtra() ? 1 : 0, text: isNoBall() ? 'No ball.' : isWide() ? 'Wide.' : (S.swing ? 'Swung and missed.' : 'Left alone.'),
          sub: isExtra() ? 'One run, and bowled again.' : sub + where, signals: extraSignals(), keeperTook: true });
      }
    } else if (S.phase === 'play') {
      bowlerFollowThrough();
      updatePlay(dt);
    } else if (S.phase === 'dead') {
      if (S.result.keeperTook || (S.play && S.play.end === 'near')) keeperReturn();
      if (S.t >= S.result.duration) afterBall();
    }
  }

  function bowlerFollowThrough() {
    const b = S.bowler, since = S.clock - b.deliverAt;
    if (S.phase === 'play' && since > 0.3 && S.play.cls.kind !== 'caught') {
      // get to the far wicket for a throw
      if (b.x - BOWLER_FAR_SX > 1) { b.x -= Math.min(JOG * S.dt, b.x - BOWLER_FAR_SX); setAnim(b, 'run_w'); return; }
      b.x = BOWLER_FAR_SX;
      const P = S.play;
      if (P.end === 'far' && P.caught) {
        if (P.attempt && P.t >= P.attempt.at) setAnim(b, 'field_break', P.t > P.attempt.at + BREAK / 2 ? 1 : 0);
        else setAnim(b, 'field_receive', 1);
      } else setAnim(b, 'field_receive', 0);
      return;
    }
    if (since < 0.25) setAnim(b, 'bowl_deliver', since < 0.12 ? 2 : 3);
    else if (S.phase !== 'play') setAnim(b, 'field_receive', 0);
  }

  function keeperReturn() {
    const R = S.result;
    if (R.returned) return;
    if (S.t >= 0.7) {
      R.returned = true;
      R.returnAt = S.clock;
      S.ball = { mode: 'arc', from: { x: KEEPER_SX - 4, h: 50 }, to: { x: S.bowler.x + 4, h: 40 }, t0: S.clock + 0.2, dur: 0.9, apex: 40, clock: true };
    }
  }

  function setAnim(a, key, frame) {
    if (a.key !== key) { a.key = key; a.t0 = S.clock; }
    a.frame = frame;
  }

  function updateWalkers(dt) {
    for (const w of S.walkers) {
      const dir = Math.sign(w.to - w.x);
      w.x += dir * Math.min(WALK * dt, Math.abs(w.to - w.x));
      if (w.t0 == null) w.t0 = S.clock;
    }
    S.walkers = S.walkers.filter(w => w.in || w.x !== w.to);
  }

  function updateBall(dt) {
    const b = S.ball;
    if (!b) return;
    if (b.mode === 'free') {
      b.spin = (b.spin || 0) + dt * 20;
      b.xw += b.vx * dt;
      if (b.stopAt != null) {
        b.h = Math.max(0, b.h + b.vy * dt); b.vy -= GEO.G * dt;
        if (b.h === 0) b.vy = 0;
        if (b.xw >= b.stopAt) { b.xw = b.stopAt; b.vx = 0; }
      } else {
        b.h += b.vy * dt; b.vy -= GEO.G * dt;
        if (b.h <= 0) {
          b.h = 0;
          if (Math.abs(b.vy) > 40) { b.vy = -b.vy * 0.35; b.vx *= 0.7; } else { b.vy = 0; b.vx *= Math.pow(0.2, dt); }
        }
      }
      if (b.toKeeper && b.xw >= KEEPER_IN) S.ball = { mode: 'held', keeperTook: S.clock };
    } else if (b.mode === 'arc') {
      const now = b.clock ? S.clock : S.play ? S.play.t : 0;
      if (b.clock && now >= b.t0 + b.dur) S.ball = { mode: 'held' };
    }
  }

  // ------------------------------------------------------------------ render
  function render() {
    drawBackdrop(ctx);
    const sinceHit = e => S.hits[e] >= 0 ? Math.floor((S.clock - S.hitT[e]) / 0.12) : -1;
    const hf = e => { const f = sinceHit(e); return f >= 0 && f < 6 ? (f < 2 ? 0 : 1) : -1; };
    drawWicket(ctx, FAR_SX, GROUND, 'far', hf('far'));
    if (S.phase === 'idle') return;

    // umpire
    const sig = currentSignal();
    drawActor(S.umpire, 'UMP', sig || 'ump_idle', UMPIRE_SX, null);

    // far end first
    S.R.runners.filter(r => !r.hidden && sxFromFar(r.pos) < W / 2).forEach(r => drawBatter(r));
    drawBowler();
    drawKeeper();
    drawWicket(ctx, BW_SX, GROUND, 'near', hf('near'));
    S.R.runners.filter(r => !r.hidden && sxFromFar(r.pos) >= W / 2).forEach(r => drawBatter(r));
    for (const w of S.walkers) {
      const f = Math.floor((S.clock - (w.t0 || 0)) * ANIM[w.key].fps) % ANIM[w.key].frames;
      drawChar(ctx, player(w.id).model, w.key, w.x === w.to ? 0 : f, w.x, GROUND, player(w.id).look);
    }

    drawTheBall();
    drawGauge();
  }

  function frameOf(a) {
    const an = ANIM[a.key];
    if (a.frame != null) return a.frame;
    if (!an.fps) return 0;
    const f = Math.floor((S.clock - a.t0) * an.fps);
    return an.loop ? f % an.frames : Math.min(an.frames - 1, f);
  }

  function drawActor(a, model, key, x, look) {
    if (a.key !== key) { a.key = key; a.t0 = S.clock; a.frame = null; }
    drawChar(ctx, model, key, frameOf(a), x, GROUND, look);
  }

  function currentSignal() {
    const R = S.result;
    if (S.phase !== 'dead' || !R || !R.signals.length) return null;
    const i = Math.floor((S.clock - R.signalT0) / 1.1);
    return i >= 0 && i < R.signals.length ? R.signals[i] : null;
  }

  function drawBatter(r) {
    const p = player(r.id), x = sxFromFar(r.pos);
    const a = r.vis || (r.vis = { key: null, t0: 0 });
    let key, frame = null;
    if (r.state === 'out') { key = 'bat_out'; frame = 0; }
    else if (r.state === 'run' || r.state === 'start') key = r.dir > 0 ? 'run_bat_e' : 'run_bat_w';
    else if (r.state === 'ground') { key = r.dir > 0 ? 'ground_bat_e' : 'ground_bat_w'; frame = r.t > RUN.GROUND_HOLD / 2 ? 0 : 1; }
    else if (r.end === 'near') {
      const sw = S.swing;
      const since = sw ? S.clock - sw.clock : 99;
      if (sw && since < 0.45 && ['flight', 'keeper', 'play', 'dead'].includes(S.phase)) {
        key = swingKey(sw.batH); frame = Math.min(2, Math.floor(since * ANIM[key].fps));
      } else { key = 'bat_guard'; frame = guardFrame(S.batH); }
    } else {
      key = (S.phase === 'runup' || S.phase === 'flight') ? 'ns_backup' : 'ns_idle';
    }
    if (a.key !== key) { a.key = key; a.t0 = S.clock; }
    a.frame = frame;
    drawChar(ctx, p.model, key, frameOf(a), x, GROUND, p.look);
  }

  function drawBowler() {
    const b = S.bowler, p = currentBowler().p;
    let key = b.key;
    if (S.phase === 'dead' && S.result.wicket && S.t > 0.3) { key = 'celebrate'; b.frame = null; }
    if (b.key !== key) { b.key = key; b.t0 = S.clock; }
    drawChar(ctx, p.model, key, frameOf(b), b.x, GROUND, p.look);
  }

  function drawKeeper() {
    const k = S.keeperA, p = S.keeper;
    let key = 'keep_ready', frame = null, x = KEEPER_SX;
    const P = S.play;
    if (S.phase === 'keeper' || (S.phase === 'dead' && S.result.keeperTook)) {
      const took = S.ball.keeperTook != null || S.ball.mode !== 'free';
      key = 'keep_take'; frame = took ? 1 : 0;
      const R = S.result;
      if (R && R.returnAt != null) {
        const since = S.clock - R.returnAt;
        if (since < 0.34) { key = 'keep_return'; frame = Math.min(2, Math.floor(since * 9)); }
        else key = 'keep_ready', frame = null;
      }
    } else if (P && (S.phase === 'play' || S.phase === 'dead') && P.plan) {
      if (P.plan.keeper) {
        // run to the ball, scoop it, then throw to the far end or run it back
        const ballX = BW_SX + P.plan.reach * PXX;
        const tPick = P.plan.tGather - 0.4;
        if (P.t < 0.25) { key = 'keep_ready'; }
        else if (P.t < tPick) {
          const u = (P.t - 0.25) / (tPick - 0.25);
          x = KEEPER_SX + (ballX - KEEPER_SX) * u; key = ballX >= KEEPER_SX ? 'run_e' : 'run_w';
        } else if (P.t < P.plan.tGather) { x = ballX; key = 'keep_pickup'; frame = P.t < tPick + 0.2 ? 0 : 1; }
        else if (P.end === 'near') {
          const back = BW_SX + 8;
          const u = Math.min(1, (P.t - P.plan.tGather) / Math.max(0.01, P.tCatch - P.plan.tGather));
          x = ballX + (back - ballX) * u;
          if (u < 1) key = back < ballX ? 'run_w' : 'run_e';
          else if (P.attempt) { key = 'field_break'; frame = P.t > P.attempt.at + BREAK / 2 ? 1 : 0; }
          else { key = 'field_receive'; frame = 1; }
        } else {
          x = ballX;
          const since = P.t - P.plan.tGather;
          if (since < 0.34) { key = 'keep_return'; frame = Math.min(2, Math.floor(since * 9)); }
          else key = 'keep_ready';
        }
        k.x = x;
      } else {
        x = KEEPER_SX;
        if (P.end === 'near' && P.caught) {
          if (P.attempt && P.t >= P.attempt.at) { key = 'field_break'; frame = P.t > P.attempt.at + BREAK / 2 ? 1 : 0; }
          else { key = 'field_receive'; frame = 1; }
        } else { key = 'field_receive'; frame = 0; }
      }
      if (S.phase === 'dead' && S.result.wicket && S.t > 0.3) { key = 'celebrate'; frame = null; }
    } else if (S.phase === 'dead' && S.result.wicket && S.t > 0.3) key = 'celebrate';
    if (S.phase === 'dead' && S.play && S.play.plan && S.play.plan.keeper) x = k.x;
    if (k.key !== key) { k.key = key; k.t0 = S.clock; }
    k.frame = frame;
    drawChar(ctx, p.model, key, frameOf(k), x, GROUND, p.look);
  }

  function drawTheBall() {
    const b = S.ball;
    if (!b) return;
    const spin = Math.floor(S.clock * 16) & 3;
    if (b.mode === 'delivery') {
      if (S.swing?.info.contact) return;
      const t = Math.min(S.t, S.d.tBoard);
      drawBall(ctx, Math.round(REL_SX + ballXW(S.d, t) * PXX), Math.round(sy(ballH(S.d, t))), spin);
    } else if (b.mode === 'free') {
      const x = BW_SX + b.xw * PXX, y = sy(b.h);
      if (x > -10 && x < W + 10 && y > -10) drawBall(ctx, Math.round(x), Math.round(y), b.vx ? spin : 0);
    } else if (b.mode === 'arc') {
      const now = b.clock ? S.clock : S.play ? S.play.t : 0;
      const u = (now - b.t0) / b.dur;
      if (u < 0 || u > 1) return;
      const x = b.from.x + (b.to.x - b.from.x) * u;
      const h = b.from.h + (b.to.h - b.from.h) * u + b.apex * 4 * u * (1 - u);
      drawBall(ctx, Math.round(x), Math.round(sy(h)), spin);
    }
  }

  function drawGauge() {
    const gx = 304, gw = 12;
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    const yTop = sy(BAT_HI), yBot = sy(BAT_LO);
    px(gx - 1, yTop - 1, gw + 2, yBot - yTop + 2, '#141c1e');
    px(gx, sy(wideLine()), gw, sy(NOBALL_H) - sy(wideLine()), '#2f4248');
    px(gx, sy(BOARD_HI), gw, sy(BOARD_LO) - sy(BOARD_HI), '#e7dcc0');
    px(gx, yTop, gw, sy(wideLine()) - yTop, '#5e2a20');
    px(gx, sy(NOBALL_H), gw, yBot - sy(NOBALL_H), '#5e2a20');
    const by = sy(S.batH);
    px(gx - 4, by - 1, 4, 3, '#caa463');
    px(gx, by, gw, 1, '#caa463');
    if (S.phase === 'flight' || S.phase === 'runup') {
      ctx.fillStyle = 'rgba(232,177,75,.45)';
      for (let x = 150; x < 246; x += 7) ctx.fillRect(x, Math.round(by), 4, 1);
    }
  }

  // ------------------------------------------------------------------ tick
  function tick(dt) {
    let left = Math.min(dt, 2);
    while (left > 1e-6) { const step = Math.min(left, 1 / 60); update(step); left -= step; }
    render();
  }

  return { S, newInnings, press, setBat, tick, render, wideLine, currentBowler, chooseThrowEnd };
}

// ---------------------------------------------------------------------------

const C = {
  sky0: '#2b3f4a', sky1: '#3d5560', sky2: '#55707a', sun: '#e8b14b',
  hedge: '#1f2f22', hedgeHi: '#2a3d2b', grass: '#4e7044', grassHi: '#5c8050', grassLo: '#3e5a36', grassFg: '#355030',
  strip: '#6b7f52', crease: '#d8e0cc',
};

export function drawBackdrop(ctx) {
  const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  px(0, 0, W, 56, C.sky0); px(0, 56, W, 30, C.sky1); px(0, 86, W, 26, C.sky2);
  px(14, 44, 10, 10, C.sun);
  px(0, 112, W, 8, C.hedge); px(0, 112, W, 2, C.hedgeHi);
  px(0, 120, W, H - 120, C.grass); px(0, 120, W, 2, C.grassHi);
  px(0, GROUND + 16, W, H, C.grassFg);
  px(FAR_SX - 8, GROUND - 1, (BW_SX + 28) - (FAR_SX - 8), 3, C.strip);
  px(FAR_SX - 8, GROUND + 2, (BW_SX + 28) - (FAR_SX - 8), 1, C.grassLo);
  px(REL_SX, GROUND - 3, 2, 7, C.crease);
  px(FAR_SX, GROUND - 3, 2, 7, C.crease);
  px(BW_SX - 8, GROUND - 2, 2, 5, C.crease);
}

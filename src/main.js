import { createGame } from './game.js';
import { W, H, GROUND, PXI, BAT_LO, BAT_HI, ZONE_MID } from './geometry.js';
import { ballH, ballXW } from './physics.js';
import { ANIMS, MODELS, PROPS, CANVAS, framesFor } from './sprites.js';
import { drawChar, drawBall, drawWicket, used } from './placeholder.js';
import { loadArt } from './art.js';
import * as RUN from './running.js';
import { homeSide, awaySide, SIDE_NAMES } from './teams.js';
import { liveAim } from './bowling.js';

const params = new URLSearchParams(location.search);
const AUTO = params.has('auto');
const SPEED = Number(params.get('speed')) || 1;

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const game = createGame(ctx, { onStep: () => { if (AUTO) autoPlay(); } });
const S = game.S;
let overs = Number(params.get('overs')) || 4;
let mode = ['bat', 'bowl', 'match'].includes(params.get('mode')) ? params.get('mode') : 'bat';
let match = null;   // a full match: both innings, and the toss

const $ = id => document.getElementById(id);
function show(id) {
  for (const s of ['setup', 'match', 'card', 'sheet']) $(s).hidden = s !== id;
  document.body.classList.toggle('playing', id === 'match');
  if (id === 'match') fit();
}

// ---------------------------------------------------------------- setup
const LENGTHS = [
  { n: 2, name: '2 overs', note: 'A quick look. 16 balls.' },
  { n: 4, name: '4 overs', note: 'Both women and both men bowl once.' },
  { n: 12, name: '12 overs', note: 'A proper Tuesday evening innings.' },
];
const MODES = [
  { id: 'bat', name: 'Bat', note: 'Bat an innings. They bowl, keep and field.' },
  { id: 'bowl', name: 'Bowl', note: 'Bowl an innings at them. You set pace and height, and pick the end for each throw.' },
  { id: 'match', name: 'Full match', note: 'Toss up, then both innings: set a total or chase one.' },
];
const HOW_BAT = `<h3>HOW TO BAT</h3><ol>
  <li>Move the pointer <b>up and down</b> over the pitch to raise and lower the bat. Up/Down arrows work too. Facing, it rests at <b>board height</b>.</li>
  <li><b>Press</b> (click, tap, Space) to swing at that height. One swing per ball.</li>
  <li>Once it is hit into the field, <b>press to run</b>. Press again while running to <b>call for another</b>. The throw comes in to whichever end you are in trouble at.</li>
  <li>The <b>field map</b> top right shows it from above: fielders in red, the one chasing in pink, your batters in amber, the ball in white. The wicket the throw is going to flashes.</li>
  <li>Short of your ground when the board is hit, and you are <b>run out</b>. Overs alternate between women and men bowlers.</li></ol>`;
const HOW_BOWL = `<h3>HOW TO BOWL</h3><ol>
  <li><b>Two presses, two bars.</b> First the power bar along the bottom sets your pace. Left of the white mark is a <b>lob</b>: you walk it in, so the batter sees it coming.</li>
  <li>Then you run in and a blue marker <b>sweeps up and down the gauge</b> on the right. Press again to let it go at that height.</li>
  <li>Only <b>44 to 56in</b> hits the board. Under the red mark (24in) is a no ball; above the batter's reach is a wide.</li>
  <li>The tan tick on the gauge is where <b>the batter is holding the bat</b>: what they expect from you. Bowl there and they middle it. They remember your last few balls, so <b>vary it</b>.</li>
  <li>When they hit it into the field, <b>press to switch the throw</b> between the keeper's end and your end. The end it is going to flashes on the field map. Hit the board before they are home and it is a <b>run out</b>.</li></ol>`;
function paintSetup() {
  const mEl = $('modes'); mEl.innerHTML = '';
  for (const m of MODES) {
    const b = document.createElement('button');
    b.className = 'choice'; b.type = 'button';
    b.setAttribute('aria-pressed', String(m.id === mode));
    b.innerHTML = `<b>${m.name}</b><span>${m.note}</span>`;
    b.onclick = () => { mode = m.id; paintSetup(); };
    mEl.appendChild(b);
  }
  $('how').innerHTML = mode === 'bowl' ? HOW_BOWL : mode === 'bat' ? HOW_BAT : HOW_BAT + HOW_BOWL;
  const el = $('lengths'); el.innerHTML = '';
  for (const l of LENGTHS) {
    const b = document.createElement('button');
    b.className = 'choice'; b.type = 'button';
    b.setAttribute('aria-pressed', String(l.n === overs));
    b.innerHTML = `<b>${l.name}</b><span>${l.note}</span>`;
    b.onclick = () => { overs = l.n; paintSetup(); };
    el.appendChild(b);
  }
}
function start() {
  match = null;
  if (mode === 'match') {
    const home = homeSide(), away = awaySide();
    const first = Math.random() < 0.5 ? 'bat' : 'bowl';
    match = { home, away, first, innings: [], toss: Math.random() < 0.5 ? 'you' : 'they' };
    return startInnings(first, null);
  }
  startInnings(mode, null);
}
function startInnings(human, target) {
  const sides = match ? { batting: human === 'bat' ? match.home : match.away, fielding: human === 'bat' ? match.away : match.home } : {};
  game.newInnings(overs, { human, target, ...sides });
  if (match && !match.innings.length) {
    const won = match.toss === 'you' ? 'You won the toss' : `${SIDE_NAMES.away} won the toss`;
    const chose = (match.toss === 'you') === (human === 'bat') ? 'bat' : 'bowl';
    S.msg = { text: `${won} and chose to ${chose}.`, sub: S.msg.sub };
  } else if (target) {
    S.msg = { text: `${target} to win off ${overs} overs.`, sub: S.msg.sub };
  }
  $('btn-quit').textContent = human === 'bat' ? 'Declare' : 'End innings';
  show('match'); paintBook();
}
$('btn-start').onclick = start;
$('btn-sheet').onclick = () => { paintSheet(); show('sheet'); };
$('btn-sheet-back').onclick = () => show('setup');
$('btn-card').onclick = () => { paintCard(); show('card'); };
$('btn-back').onclick = () => {
  if (S.phase !== 'done') return show('match');
  if (match && match.innings.length === 1) return startInnings(S.human === 'bat' ? 'bowl' : 'bat', S.total + 1);
  show('setup'); S.phase = 'idle'; match = null;
};
$('btn-quit').onclick = () => { S.endWhy = 'Declared.'; S.phase = 'done'; };

// ---------------------------------------------------------------- input
function pointerH(e) {
  const r = canvas.getBoundingClientRect();
  const y = (e.clientY - r.top) / r.height * H;
  return (GROUND - y) / PXI;
}
canvas.addEventListener('pointermove', e => game.setBat(pointerH(e)));   // ignored while you bowl
canvas.addEventListener('pointerdown', e => { e.preventDefault(); if (S.phase === 'flight' || S.phase === 'runup') game.setBat(pointerH(e)); game.press(); });
$('btn-act').onclick = () => game.press();
window.addEventListener('keydown', e => {
  if ($('match').hidden) return;
  if (e.code === 'ArrowUp' || e.code === 'ArrowDown') { e.preventDefault(); game.setBat(S.batH + (e.code === 'ArrowUp' ? 4 : -4)); }
  if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyR') { e.preventDefault(); game.press(); }
  if (e.code === 'KeyF') { e.preventDefault(); toggleFull(); }
});

// Fill the window with the pitch at a whole number of device pixels per game
// pixel, so every pixel of the art stays square and sharp. The game itself
// still draws at W x H; only the canvas's displayed size changes.
function fit() {
  if ($('match').hidden) return;
  const dpr = devicePixelRatio || 1, stage = $('stage');
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  const availW = stage.clientWidth - 16;
  const otherH = document.querySelector('.wrap').offsetHeight - H;   // everything that isn't the pitch
  const availH = innerHeight - otherH;
  const s = Math.max(1, Math.floor(Math.min(availW / W, availH / H) * dpr + 1e-6));
  canvas.style.width = W * s / dpr + 'px'; canvas.style.height = H * s / dpr + 'px';
}
addEventListener('resize', fit);
document.addEventListener('fullscreenchange', fit);
// The scoreboard, commentary and over strip can change height as they fill in.
const refit = new ResizeObserver(fit);
for (const el of $('match').children) if (el.id !== 'stage') refit.observe(el);
function toggleFull() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}
$('btn-full').onclick = toggleFull;

// ---------------------------------------------------------------- HUD
let lastHud = '', lastCall = '', lastAct = '', lastBook = '';
function paint() {
  if (S.phase === 'idle') return;
  const c = S.cards[S.striker], n = S.cards[S.nonStriker], bw = game.currentBowler();
  const overStr = `${Math.floor(S.legal / 8)}.${S.legal % 8}`;
  const hud = `<span><b>${S.total}/${S.wkts}</b></span><span>OVERS <b>${overStr}</b>/${S.overs}</span>` +
    `<span>${c.p.name} <b>${c.runs}*</b> (${c.balls})</span><span>${n.p.name} <b>${n.runs}</b></span>` +
    `<span>BOWLER <b>${bw.p.name}</b></span><span>WIDE OVER <b>${game.wideLine()}in</b></span>` +
    (S.human === 'bowl' ? `<span>PACE <b>${S.power != null && S.phase !== 'aim' ? Math.round(S.pace / 17.6) + 'mph' : '-'}</b></span>` : '') +
    (S.target ? `<span>NEED <b>${Math.max(0, S.target - S.total)}</b></span>` : '');
  if (hud !== lastHud) { $('hud').innerHTML = hud; lastHud = hud; }
  const r = S.result;
  const m = S.phase === 'dead' && r ? { text: r.text, sub: r.sub } : S.msg;
  const call = m ? `${m.text}<br><span>${m.sub || '&nbsp;'}</span>` : '&nbsp;<br>&nbsp;';
  if (call !== lastCall) { $('call').innerHTML = call; lastCall = call; }
  const bowlAct = { aim: 'Set pace', runup: S.aimH == null ? 'Release' : '...',
    play: S.play && !S.play.end ? (S.throwTo === 'near' ? "Throw: keeper's end" : 'Throw: your end') : '...' };
  const act = S.human === 'bowl' && bowlAct[S.phase] ? bowlAct[S.phase] : { runup: 'Wait', flight: 'Swing', play: RUN.canStart(S.R) ? 'Run!' : (S.R.active && !S.R.committed && !S.R.locked ? 'Another!' : '...'),
    between: 'Ready', overEnd: 'Next over', dead: '...', keeper: '...', done: '...' }[S.phase] || '...';
  if (act !== lastAct) { $('btn-act').textContent = act; lastAct = act; }
  const bk = JSON.stringify(S.book);
  if (bk !== lastBook) { paintBook(); lastBook = bk; }
  if (S.phase === 'done' && $('card').hidden && !S.shownCard) { recordInnings(); paintCard(); show('card'); }
}

function recordInnings() {
  if (S.shownCard) return;
  S.shownCard = true;
  if (match) match.innings.push({ human: S.human, total: S.total, wkts: S.wkts, legal: S.legal, why: S.endWhy, target: S.target });
}

function paintBook() {
  const el = $('balls'); el.innerHTML = '';
  for (const b of S.book || []) {
    const d = document.createElement('div');
    d.className = 'bx' + (b.wicket ? ' w' : b.extra ? ' extra' : b.sym === '·' ? ' dot' : b.boundary ? ' boundary' : '');
    d.textContent = b.sym; el.appendChild(d);
  }
}

function paintCard() {
  const done = S.phase === 'done';
  const side = S.human === 'bat' ? SIDE_NAMES.home : SIDE_NAMES.away;
  $('card-title').textContent = done ? `${side} innings closed. ${S.endWhy || ''}` : `${side} batting`;
  $('card-figs').textContent = `${S.total} for ${S.wkts} off ${Math.floor(S.legal / 8)}.${S.legal % 8} overs`;
  $('card-bat').innerHTML = '<tr><th>BATTER</th><th>HOW OUT</th><th>R</th><th>B</th><th>4s</th><th>6s</th></tr>' +
    S.cards.map(c => `<tr><td>${c.p.name}</td><td>${c.how || (c.in ? 'not out' : '')}</td><td>${c.in ? c.runs : ''}</td><td>${c.in ? c.balls : ''}</td><td>${c.in ? c.fours : ''}</td><td>${c.in ? c.sixes : ''}</td></tr>`).join('');
  $('card-extra').textContent = `Extras ${S.extras}. ` + (S.fow.length ? 'Fall of wickets: ' + S.fow.map(f => `${f.wkt}-${f.score} (${f.name})`).join(', ') + '.' : '');
  $('card-bowl').innerHTML = '<tr><th>BOWLER</th><th>O</th><th>M</th><th>R</th><th>W</th></tr>' +
    S.attack.filter(b => b.balls).map(b => `<tr><td>${b.p.name}</td><td>${Math.floor(b.balls / 8)}.${b.balls % 8}</td><td>${b.maidens}</td><td>${b.runs}</td><td>${b.wkts}</td></tr>`).join('');
  $('btn-back').textContent = !done ? 'Back' : match && match.innings.length === 1 ? 'Second innings' : 'New game';
  if (done && match) {
    const r = matchResult();
    $('card-extra').innerHTML = (r ? `<b>${r}</b> ` : `<b>${S.total + 1} to win.</b> `) + $('card-extra').textContent;
  }
}

function matchResult() {
  if (!match || match.innings.length < 2) return null;
  const [a, b] = match.innings;
  const youFirst = a.human === 'bat';
  const first = youFirst ? SIDE_NAMES.home : SIDE_NAMES.away, second = youFirst ? SIDE_NAMES.away : SIDE_NAMES.home;
  if (b.total > a.total) return `${second} won by ${10 - b.wkts} wicket${10 - b.wkts === 1 ? '' : 's'}.`;
  if (b.total === a.total) return 'A tie.';
  return `${first} won by ${a.total - b.total} run${a.total - b.total === 1 ? '' : 's'}.`;
}

// ---------------------------------------------------------------- sprite sheet
function paintSheet() {
  const body = $('sheet-body'); body.innerHTML = '';
  let total = 0;
  let group = null, gEl = null;
  for (const a of ANIMS) {
    if (a.group !== group) {
      group = a.group;
      gEl = document.createElement('div'); gEl.className = 'sheet-group';
      gEl.innerHTML = `<h3>${group.toUpperCase()}</h3>`; body.appendChild(gEl);
    }
    total += framesFor(a);
    const div = document.createElement('div'); div.className = 'sheet-anim';
    div.innerHTML = `<div class="name">${a.key} · ${a.frames} frame${a.frames > 1 ? 's' : ''} · facing ${a.facing}${a.fps ? ` · ${a.fps}fps` : ''}</div><div class="meta">${a.desc} Models: ${a.models.join(', ')}.</div>`;
    const cw = CANVAS.w, ch = CANVAS.h;
    const cv = document.createElement('canvas');
    cv.width = cw * a.frames; cv.height = ch * a.models.length;
    cv.style.width = cv.width * 2 + 'px'; cv.style.height = cv.height * 2 + 'px';
    const c2 = cv.getContext('2d');
    a.models.forEach((m, row) => {
      for (let f = 0; f < a.frames; f++) {
        c2.fillStyle = (f + row) % 2 ? '#2a3a3f' : '#31444a';
        c2.fillRect(f * cw, row * ch, cw, ch);
        drawChar(c2, m, a.key, f, f * cw + CANVAS.anchorX, row * ch + CANVAS.anchorY);
      }
    });
    div.appendChild(cv); gEl.appendChild(div);
  }
  const props = document.createElement('div'); props.className = 'sheet-group';
  props.innerHTML = '<h3>PROPS</h3>';
  const cv = document.createElement('canvas'); cv.width = 120; cv.height = 50; cv.style.width = '240px'; cv.style.height = '100px';
  const c2 = cv.getContext('2d'); c2.fillStyle = '#31444a'; c2.fillRect(0, 0, 120, 50);
  for (let f = 0; f < 4; f++) drawBall(c2, 8 + f * 9, 10, f);
  drawWicket(c2, 55, 48, 'near'); drawWicket(c2, 70, 48, 'far'); drawWicket(c2, 88, 48, 'near', 0); drawWicket(c2, 106, 48, 'near', 1);
  props.appendChild(cv); body.appendChild(props);
  $('sheet-sum').textContent = `${ANIMS.length} animations, ${total} character frames across ${Object.keys(MODELS).length} figures, plus ${PROPS.reduce((n, p) => n + p.frames, 0)} prop frames and the backdrop. Full list with sizes in docs/sprite-list.md.`;
}

// ---------------------------------------------------------------- auto play (for testing the list)
const auto = { ball: null };
function autoPlay() {
  if (S.phase === 'between' && S.t > 0.3 && Math.random() < 0.3) game.press();
  if (S.phase === 'overEnd' && S.t > 0.5) game.press();
  if (S.human === 'bowl') {
    if (S.phase === 'aim') { if (auto.aimAt == null) auto.aimAt = 0.2 + Math.random() * 1.2; if (S.t >= auto.aimAt) { auto.aimAt = null; game.press(); } }
    if (S.phase === 'runup' && S.aimH == null) {
      if (auto.want == null) auto.want = Math.random() < 0.7 ? 44 + Math.random() * 12 : 22 + Math.random() * 56;
      if (Math.abs(liveAim(S.t) - auto.want) < 2) { auto.want = null; game.press(); }
    }
    if (S.phase === 'play' && S.play.t > 0.3 && !S.play.end && auto.play !== S.play) { auto.play = S.play; if (Math.random() < 0.5) game.press(); }
    return;
  }
  if (S.phase === 'runup' || S.phase === 'flight') {
    if (auto.ball !== S.d) {
      const t = S.d.tZone;
      auto.ball = S.d;
      const big = Math.random() < 0.15;   // now and then, get under one and go big
      auto.h = ballH(S.d, t) + (big ? -4 - Math.random() * 2 : (Math.random() - 0.5) * 18);
      auto.x = ZONE_MID + (big ? 0 : (Math.random() - 0.5) * 70);
      auto.run = Math.random(); auto.another = Math.random();
    }
    game.setBat(auto.h);
    if (S.phase === 'flight' && ballXW(S.d, S.t) >= auto.x) game.press();
  }
  if (S.phase === 'play') {
    if (S.play.t > 0.2 && auto.run < (S.play.cls.reach > 500 ? 0.9 : 0.3) && RUN.canStart(S.R)) { auto.run = 1; game.press(); }
    if (S.R.active && auto.another < (S.play.cls.reach > 1000 ? 0.6 : 0.15)) { auto.another = 1; game.press(); }
  }
}

// ---------------------------------------------------------------- loop
let last = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = last ? (now - last) / 1000 : 0; last = now;
  if (S.phase === 'idle') return;
  if (AUTO && S.phase === 'done') {
    // autopilot alternates batting and bowling innings so every frame gets drawn
    const n = (S.innings || 0) + 1;
    recordInnings();
    if (match) { if (match.innings.length === 1) startInnings(S.human === 'bat' ? 'bowl' : 'bat', S.total + 1); else { window.__results = [...(window.__results || []), matchResult()]; start(); } }
    else startInnings(params.has('mode') ? mode : (n % 2 ? 'bowl' : 'bat'), null);
    S.innings = n;
  }
  game.tick(Math.min(dt, 0.1) * SPEED);
  paint();
}

window.__stoolball = { S, used, game };
loadArt();
paintSetup();
show('setup');
if (AUTO) start();
requestAnimationFrame(frame);

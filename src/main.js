import { createGame } from './game.js';
import { W, H, GROUND, PXI, BAT_LO, BAT_HI, ZONE_MID } from './geometry.js';
import { ballH, ballXW } from './physics.js';
import { ANIMS, MODELS, PROPS, CANVAS, framesFor } from './sprites.js';
import { drawChar, drawBall, drawWicket, used } from './placeholder.js';
import * as RUN from './running.js';

const params = new URLSearchParams(location.search);
const AUTO = params.has('auto');
const SPEED = Number(params.get('speed')) || 1;

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const game = createGame(ctx, { onStep: () => { if (AUTO) autoPlay(); } });
const S = game.S;
let overs = Number(params.get('overs')) || 4;

const $ = id => document.getElementById(id);
function show(id) { for (const s of ['setup', 'match', 'card', 'sheet']) $(s).hidden = s !== id; if (id === 'match') fit(); }

// ---------------------------------------------------------------- setup
const LENGTHS = [
  { n: 2, name: '2 overs', note: 'A quick look. 16 balls.' },
  { n: 4, name: '4 overs', note: 'Both women and both men bowl once.' },
  { n: 12, name: '12 overs', note: 'A proper Tuesday evening innings.' },
];
function paintSetup() {
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
function start() { game.newInnings(overs); show('match'); paintBook(); }
$('btn-start').onclick = start;
$('btn-sheet').onclick = () => { paintSheet(); show('sheet'); };
$('btn-sheet-back').onclick = () => show('setup');
$('btn-card').onclick = () => { paintCard(); show('card'); };
$('btn-back').onclick = () => { if (S.phase === 'done') { show('setup'); S.phase = 'idle'; } else show('match'); };
$('btn-quit').onclick = () => { S.endWhy = 'Declared.'; S.phase = 'done'; };

// ---------------------------------------------------------------- input
function pointerH(e) {
  const r = canvas.getBoundingClientRect();
  const y = (e.clientY - r.top) / r.height * H;
  return (GROUND - y) / PXI;
}
canvas.addEventListener('pointermove', e => game.setBat(pointerH(e)));
canvas.addEventListener('pointerdown', e => { e.preventDefault(); if (S.phase === 'flight' || S.phase === 'runup') game.setBat(pointerH(e)); game.press(); });
$('btn-act').onclick = () => game.press();
window.addEventListener('keydown', e => {
  if ($('match').hidden) return;
  if (e.code === 'ArrowUp' || e.code === 'ArrowDown') { e.preventDefault(); game.setBat(S.batH + (e.code === 'ArrowUp' ? 4 : -4)); }
  if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyR') { e.preventDefault(); game.press(); }
});

function fit() {
  const avail = $('stage').clientWidth - 18;
  const s = Math.max(1, Math.floor(Math.min(avail / W, Math.min(innerHeight * 0.6, 520) / H) * 2) / 2);
  canvas.style.width = W * s + 'px'; canvas.style.height = H * s + 'px';
}
addEventListener('resize', fit);

// ---------------------------------------------------------------- HUD
let lastHud = '', lastCall = '', lastAct = '', lastBook = '';
function paint() {
  if (S.phase === 'idle') return;
  const c = S.cards[S.striker], n = S.cards[S.nonStriker], bw = game.currentBowler();
  const overStr = `${Math.floor(S.legal / 8)}.${S.legal % 8}`;
  const hud = `<span><b>${S.total}/${S.wkts}</b></span><span>OVERS <b>${overStr}</b>/${S.overs}</span>` +
    `<span>${c.p.name} <b>${c.runs}*</b> (${c.balls})</span><span>${n.p.name} <b>${n.runs}</b></span>` +
    `<span>BOWLER <b>${bw.p.name}</b></span><span>WIDE OVER <b>${game.wideLine()}in</b></span>`;
  if (hud !== lastHud) { $('hud').innerHTML = hud; lastHud = hud; }
  const r = S.result;
  const m = S.phase === 'dead' && r ? { text: r.text, sub: r.sub } : S.msg;
  const call = m ? `${m.text}<br><span>${m.sub || '&nbsp;'}</span>` : '&nbsp;<br>&nbsp;';
  if (call !== lastCall) { $('call').innerHTML = call; lastCall = call; }
  const act = { runup: 'Wait', flight: 'Swing', play: RUN.canStart(S.R) ? 'Run!' : (S.R.active && !S.R.committed && !S.R.locked ? 'Another!' : '...'),
    between: 'Ready', overEnd: 'Next over', dead: '...', keeper: '...', done: '...' }[S.phase] || '...';
  if (act !== lastAct) { $('btn-act').textContent = act; lastAct = act; }
  const bk = JSON.stringify(S.book);
  if (bk !== lastBook) { paintBook(); lastBook = bk; }
  if (S.phase === 'done' && $('card').hidden && !S.shownCard) { S.shownCard = true; paintCard(); show('card'); }
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
  $('card-title').textContent = done ? `Innings closed. ${S.endWhy || ''}` : 'Scorecard so far';
  $('card-figs').textContent = `${S.total} for ${S.wkts} off ${Math.floor(S.legal / 8)}.${S.legal % 8} overs`;
  $('card-bat').innerHTML = '<tr><th>BATTER</th><th>HOW OUT</th><th>R</th><th>B</th><th>4s</th><th>6s</th></tr>' +
    S.cards.map(c => `<tr><td>${c.p.name}</td><td>${c.how || (c.in ? 'not out' : '')}</td><td>${c.in ? c.runs : ''}</td><td>${c.in ? c.balls : ''}</td><td>${c.in ? c.fours : ''}</td><td>${c.in ? c.sixes : ''}</td></tr>`).join('');
  $('card-extra').textContent = `Extras ${S.extras}. ` + (S.fow.length ? 'Fall of wickets: ' + S.fow.map(f => `${f.wkt}-${f.score} (${f.name})`).join(', ') + '.' : '');
  $('card-bowl').innerHTML = '<tr><th>BOWLER</th><th>O</th><th>M</th><th>R</th><th>W</th></tr>' +
    S.attack.filter(b => b.balls).map(b => `<tr><td>${b.p.name}</td><td>${Math.floor(b.balls / 8)}.${b.balls % 8}</td><td>${b.maidens}</td><td>${b.runs}</td><td>${b.wkts}</td></tr>`).join('');
  $('btn-back').textContent = done ? 'New innings' : 'Back';
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
  if (AUTO && S.phase === 'done') { S.innings = (S.innings || 0) + 1; S.shownCard = false; game.newInnings(overs); show('match'); }
  game.tick(Math.min(dt, 0.1) * SPEED);
  paint();
}

window.__stoolball = { S, used, game };
paintSetup();
show('setup');
if (AUTO) start();
requestAnimationFrame(frame);

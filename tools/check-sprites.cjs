// Plays innings on autopilot in a headless browser and checks that every
// animation on the sprite list was drawn for every model it lists, and that
// nothing was drawn that isn't on the list (drawChar throws on that).
// Usage: python3 -m http.server 8765 &  node tools/check-sprites.cjs [seconds]
const { chromium } = require('playwright');
(async () => {
  const secs = Number(process.argv[2]) || 90;
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/?auto&speed=8&overs=12');
  await p.waitForTimeout(secs * 1000);
  const r = await p.evaluate(async () => {
    const { ANIMS, PROPS } = await import('./src/sprites.js');
    const used = window.__stoolball.used, S = window.__stoolball.S;
    const want = [];
    for (const a of ANIMS) for (const m of a.models) want.push(m + ':' + a.key);
    for (const pr of PROPS) want.push('prop:' + pr.key);
    return { missing: want.filter(k => !used.has(k)), extra: [...used].filter(k => !want.includes(k)), innings: S.innings || 0, want: want.length };
  });
  await b.close();
  console.log(`${r.want} model/animation pairs on the list; ${r.innings} innings played.`);
  console.log('Never drawn in play:', r.missing.length ? r.missing.join(', ') : 'none');
  console.log('Drawn but not on the list:', r.extra.length ? r.extra.join(', ') : 'none');
  console.log('Page errors:', errs.length ? errs.slice(0, 5).join(' | ') : 'none');
  process.exit(r.missing.length || r.extra.length || errs.length ? 1 : 0);
})();

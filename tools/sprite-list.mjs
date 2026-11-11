// Writes docs/sprite-list.md from the manifest in src/sprites.js.
// Usage: node tools/sprite-list.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { ANIMS, MODELS, PROPS, ENVIRONMENT, CANVAS, BASE_PALETTE, GUARD_BANDS, REST_BAND, framesFor } from '../src/sprites.js';

const out = [];
const w = s => out.push(s);
const total = ANIMS.reduce((n, a) => n + framesFor(a), 0);
const sideFrames = ANIMS.filter(a => a.facing === 'west').reduce((n, a) => n + framesFor(a), 0);
const propFrames = PROPS.reduce((n, p) => n + p.frames, 0);

w('# Sprite list for the batch run');
w('');
w('Generated from `src/sprites.js` by `node tools/sprite-list.mjs`. Do not edit by hand: change the manifest and regenerate.');
w('');
w('Every animation here is drawn during a placeholder innings, and nothing is drawn that is not here: `tools/check-sprites.cjs` plays innings on autopilot and fails if either is untrue.');
w('');
w('## Totals');
w('');
w(`- **${total} character frames**: ${ANIMS.length} animations across ${Object.keys(MODELS).length} figures (4 player bodies and the umpire).`);
w(`- **${propFrames} prop frames** (ball, wickets) and **1 backdrop**.`);
w(`- ${sideFrames} of the character frames are west-facing copies of east-facing ones. Mirroring in code would save them, but would put the light on the upper right, so the list draws them separately. That is the first thing to cut if the budget is tight.`);
w('- At one generation per frame (pose guide as init_image, as the test settled) the run is about ' + (total + propFrames) + ' generations before retries, against roughly 695 left.');
w('');
w('## Conventions for every character frame');
w('');
w(`- Canvas **${CANVAS.w}x${CANVAS.h}**, transparent, feet on the anchor at **(${CANVAS.anchorX}, ${CANVAS.anchorY})** (bottom centre). No ground patch, no shadow: the game draws the shadow.`);
w('- Flat side-on camera, no top-down tilt. Figures are drawn at **0.75 px per inch** in both directions, so normal proportions.');
w('- Facing: **south** = chest-on to us, which in this camera is side-on to the bowler. **east** = facing screen right (towards the batting wicket). **west** = facing screen left.');
w('- Light from the **upper left**, in every frame including west-facing ones.');
w('- Casual summer clothes, no pads, gloves, helmets or uniform. The bat is a stoolball bat: a round flat wooden paddle on a long handle with a red grip.');
w('- Palette: keep these exact figure colours so the game can recolour clothes, hair and skin per player. Paint the red grip and stitching afterwards (red in color_image bleeds into skin).');
w('');
w('| Part | Colour | Shadow |');
w('|---|---|---|');
w(`| Shirt | \`${BASE_PALETTE.shirt}\` | \`${BASE_PALETTE.shirtLo}\` |`);
w(`| Shorts | \`${BASE_PALETTE.shorts}\` | \`${BASE_PALETTE.shortsLo}\` |`);
w(`| Skin | \`${BASE_PALETTE.skin}\` | \`${BASE_PALETTE.skinLo}\` |`);
w(`| Hair | \`${BASE_PALETTE.hair}\` | |`);
w(`| Trainers | \`${BASE_PALETTE.shoes}\` | |`);
w(`| Bat | \`${BASE_PALETTE.bat}\` | \`${BASE_PALETTE.batLo}\` |`);
w(`| Grip (paint after) | \`${BASE_PALETTE.grip}\` | |`);
w('');
w('## Figures');
w('');
w('| Figure | Height | Figure height on canvas | Used for |');
w('|---|---|---|---|');
for (const [k, m] of Object.entries(MODELS)) {
  const uses = m.kind === 'umpire' ? 'the umpire, standing behind the far wicket' : 'batters, bowlers and fielders (each player recoloured)' + (k === 'M67' ? '; also the keeper' : '');
  w(`| ${k} | ${m.label} | ${m.px}px | ${uses} |`);
}
w('');
w('Eleven players a side are made from the four player bodies by recolouring. The opposition attack uses all four bodies (overs alternate woman, man), so every body needs the bowling set as well as the batting set.');
w('');
w(`The stance is drawn at ${GUARD_BANDS.length} bat heights (${GUARD_BANDS.join(', ')}in). **${REST_BAND}in is the normal stance when facing**: the bat held out beside the wicket at board height. The others are the player raising or lowering it.`);
w('');

let group = null;
for (const a of ANIMS) {
  if (a.group !== group) { group = a.group; w(`## ${group}`); w(''); }
  w(`### \`${a.key}\``);
  w('');
  w(a.desc);
  w('');
  w(`- Facing **${a.facing}**, ${a.frames} frame${a.frames > 1 ? 's' : ''}${a.fps ? `, ${a.fps} fps${a.loop ? ', loops' : ''}` : ' (held)'}${a.holds !== 'none' ? `, holding the ${a.holds}` : ''}.`);
  w(`- Figures: ${a.models.join(', ')} (${framesFor(a)} frames).`);
  w('- Frames:');
  a.frameNotes.forEach((n, i) => w(`  ${i + 1}. ${n}`));
  w('');
}

w('## Props');
w('');
w('| Prop | Size | Frames | Notes |');
w('|---|---|---|---|');
for (const p of PROPS) w(`| \`${p.key}\` | ${p.w}x${p.h} | ${p.frames} | ${p.desc} |`);
w('');
w('## Environment');
w('');
w('| Piece | Size | Notes |');
w('|---|---|---|');
for (const e of ENVIRONMENT) w(`| \`${e.key}\` | ${e.w}x${e.h} | ${e.desc} |`);
w('');
w('## Frame count by figure');
w('');
w('| Figure | Frames |');
w('|---|---|');
for (const k of Object.keys(MODELS)) {
  const n = ANIMS.filter(a => a.models.includes(k)).reduce((s, a) => s + a.frames, 0);
  w(`| ${k} | ${n} |`);
}
w(`| **Total** | **${total}** |`);
w('');

mkdirSync(new URL('../docs/', import.meta.url), { recursive: true });
writeFileSync(new URL('../docs/sprite-list.md', import.meta.url), out.join('\n'));
console.log(`docs/sprite-list.md: ${ANIMS.length} animations, ${total} character frames, ${propFrames} prop frames.`);

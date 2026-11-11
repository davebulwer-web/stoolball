// Generated sprites (Pixellab batch). One sheet per figure: a row per
// animation, a 64x64 cell per frame, feet on the anchor (32, 63).
// Clothes, skin and hair are palette-swapped per player from the base colours
// the sheets are drawn in (see BASE_PALETTE in sprites.js).

import { BASE_PALETTE } from './sprites.js';

const ROOT = 'assets/sprites/';
const HAS_DOM = typeof document !== 'undefined' && typeof Image !== 'undefined';

let index = null;
const sheets = {};          // model -> HTMLImageElement
const pixels = {};          // model -> ImageData of the base sheet
const tinted = new Map();   // model|look -> canvas

export function artReady(model) { return !!(index && pixels[model]); }

export function loadArt() {
  if (!HAS_DOM) return Promise.resolve(false);
  return fetch(ROOT + 'index.json').then(r => r.ok ? r.json() : null).then(ix => {
    if (!ix) return false;
    return Promise.all(Object.keys(ix.models).map(m => new Promise(res => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        pixels[m] = g.getImageData(0, 0, c.width, c.height);
        sheets[m] = c; res();
      };
      img.onerror = () => res();
      img.src = ROOT + m + '.png';
    }))).then(() => { index = ix; return true; });
  }).catch(() => false);
}

const rgb = hex => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const darken = (hex, k) => '#' + rgb(hex).map(c => Math.round(c * (1 - k)).toString(16).padStart(2, '0')).join('');

// base colour -> the look's colour for that part
function swaps(look) {
  const B = BASE_PALETTE;
  return [
    [B.shirt, look.shirt], [B.shirtLo, look.shirtLo || darken(look.shirt, 0.25)],
    [B.shorts, look.shorts], [B.shortsLo, darken(look.shorts, 0.33)],
    [B.skin, look.skin], [B.skinLo, darken(look.skin, 0.23)],
    [B.hair, look.hair], [B.shoes, look.shoes], [B.shoesLo, darken(look.shoes, 0.22)],
  ].filter(([a, b]) => b && a.toLowerCase() !== b.toLowerCase());
}

function sheetFor(model, look) {
  if (!look) return sheets[model];
  const key = model + '|' + JSON.stringify(look);
  let c = tinted.get(key);
  if (c) return c;
  const src = pixels[model];
  const map = new Map(swaps(look).map(([a, b]) => [rgb(a).join(','), rgb(b)]));
  const out = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
  const d = out.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const to = map.get(d[i] + ',' + d[i + 1] + ',' + d[i + 2]);
    if (to) { d[i] = to[0]; d[i + 1] = to[1]; d[i + 2] = to[2]; }
  }
  c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  c.getContext('2d').putImageData(out, 0, 0);
  tinted.set(key, c);
  return c;
}

// Draw one frame with its feet at (x, ground). Returns false if the art isn't loaded.
export function drawArt(ctx, model, key, frame, x, ground, look) {
  if (!artReady(model)) return false;
  const a = index.models[model][key];
  if (!a) return false;
  const cell = index.cell, [ax, ay] = index.anchor;
  ctx.drawImage(sheetFor(model, look), frame * cell, a.row * cell, cell, cell,
    Math.round(x - ax), Math.round(ground - 1 - ay), cell, cell);
  return true;
}

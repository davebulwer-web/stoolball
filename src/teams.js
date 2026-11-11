// Two village sides. Players are one of four body models; clothes, hair and
// skin are per player, so the real sprites get palette-swapped the same way.

const SHIRTS = ['#e4e8da', '#d9c79a', '#a9c2d6', '#c99a9a', '#b7c9a1', '#e0b37a', '#d6d0e6', '#9fb3a6', '#e8d6c0', '#c4c4c4', '#d8a8b8'];
const SHORTS = ['#34425e', '#4a4237', '#2f3b33', '#5a4a6a', '#3a3a3a', '#55607a', '#6a5440'];
const SKIN = ['#c08a5e', '#e0b48e', '#8a5a3a', '#d8a47c', '#f0c8a8', '#6e4630'];
const HAIR = ['#20282a', '#6b4a2b', '#c9a35a', '#3a2a20', '#8a8a82', '#a0522d'];

function lighten(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.round(c * (1 - k));
  return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join('');
}

function player(name, model, i, seed) {
  const pick = (arr, k) => arr[(i * 7 + seed * 3 + k) % arr.length];
  const shirt = pick(SHIRTS, 0);
  return {
    name, model,
    heightIn: { W62: 62, W67: 67, M67: 67, M73: 73 }[model],
    look: { shirt, shirtLo: lighten(shirt, 0.25), shorts: pick(SHORTS, 1), skin: pick(SKIN, 2), hair: pick(HAIR, 3), shoes: '#f2f2ea' },
  };
}

// batting orders alternate women and men, as in a mixed league side
export function homeSide() {
  const list = [
    ['Jo Pelling', 'W67'], ['Mark Tester', 'M73'], ['Sue Ditton', 'W62'], ['Rob Akehurst', 'M67'],
    ['Kate Brooker', 'W67'], ['Phil Wenham', 'M67'], ['Ann Funnell', 'W62'], ['Dan Hoad', 'M73'],
    ['Liz Hemsley', 'W67'], ['Tom Medhurst', 'M67'], ['Pat Gearing', 'W62'],
  ];
  return list.map(([n, m], i) => player(n, m, i, 1));
}

export function awaySide() {
  const list = [
    ['Gill Rapson', 'W67'], ['Steve Divall', 'M73'], ['Mo Haffenden', 'W62'], ['Ian Pankhurst', 'M67'],
    ['Viv Tullett', 'W67'], ['Keith Ayling', 'M67'], ['Bev Stenning', 'W62'], ['Alan Chatfield', 'M73'],
    ['Jan Warnett', 'W67'], ['Colin Uwins', 'M67'], ['Di Botting', 'W62'],
  ];
  return list.map(([n, m], i) => player(n, m, i, 4));
}

// Bowling attack: overs alternate between a woman and a man.
// Pace is in in/s along the pitch (17.6 in/s = 1 mph).
export function attack(side) {
  return [
    { p: side[0], style: { quick: 640, slower: 500, mix: [0.55, 0.3, 0.15], spread: 12 } },
    { p: side[1], style: { quick: 720, slower: 540, mix: [0.65, 0.25, 0.1], spread: 14 } },
    { p: side[2], style: { quick: 610, slower: 470, mix: [0.45, 0.35, 0.2], spread: 10 } },
    { p: side[3], style: { quick: 690, slower: 520, mix: [0.6, 0.3, 0.1], spread: 12 } },
  ];
}

export const KEEPER_INDEX = 5;   // Keith Ayling, M67, keeps wicket
export const UMPIRE = { name: 'Umpire', model: 'UMP', look: null };

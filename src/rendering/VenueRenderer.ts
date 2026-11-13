import { isInRoom, type CrowdSimulation } from '../simulation/CrowdSimulation';
import { CHARADES_START, CHARADES_END } from '../simulation/night';
import type { Guest, Point, Rect, StationId } from '../simulation/types';
import { STATIONS, VENUE } from '../simulation/venue';
import { containsPoint, stationBounds } from './stationGeometry';
import { drawPartyLights, type VibeSettings } from './PartyLights';

const C = { cream: '#e3d2af', gold: '#b39361', dim: '#8d8069', wall: '#b49b73', wood: '#47372d', floor: '#292724' };
type ViewOptions = { mode: 'venue' | 'live' | 'heatmap'; showCounts: boolean; showStationTitles?: boolean; selected: StationId | null; hovered?: StationId | null; time: number; alpha?: number; smooth: Map<number, Point & { angle?: number }>; reducedMotion: boolean; vibes?: VibeSettings; lightTime?: number };
function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); } }
function line(ctx: CanvasRenderingContext2D, points: number[], color: string, width = 1) { ctx.beginPath(); ctx.moveTo(points[0], points[1]); for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); }
function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, stroke?: string) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); } }
function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size = 10, color = C.cream, serif = false) { ctx.fillStyle = color; ctx.font = `${serif ? '500' : '500'} ${size}px ${serif ? '"Cormorant Garamond", Georgia' : '"DM Sans", sans-serif'}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y); }
function badge(ctx: CanvasRenderingContext2D, n: number, x: number, y: number) { circle(ctx, x, y, 10, '#22201d', C.gold); label(ctx, String(n).padStart(2, '0'), x, y + .2, 8, C.cream); }
function plant(ctx: CanvasRenderingContext2D, x: number, y: number, size = 1) { ctx.save(); ctx.translate(x, y); ctx.scale(size, size); circle(ctx, 0, 0, 12, '#4f4735', '#817051'); for (let i = 0; i < 7; i++) { ctx.rotate(Math.PI * 2 / 7); ctx.beginPath(); ctx.ellipse(0, -10, 4, 13, .2, 0, Math.PI * 2); ctx.fillStyle = i % 2 ? '#64715c' : '#788166'; ctx.fill(); line(ctx, [0, 0, 1, -20], '#424c3f', .6); } ctx.restore(); }
function candle(ctx: CanvasRenderingContext2D, x: number, y: number) { circle(ctx, x, y, 7, '#61503a', '#a28756'); circle(ctx, x, y, 3.6, '#d5c3a0'); ctx.beginPath(); ctx.ellipse(x, y, 1.4, 2.8, .3, 0, Math.PI * 2); ctx.fillStyle = '#e7b46d'; ctx.fill(); }
function sofa(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  round(ctx, x, y, w, 76, 12, '#938875', '#82745f');
  round(ctx, x + 5, y + 5, w - 10, 19, 7, '#b9ad96', '#90816b');
  for (let i = 0; i < 3; i++) { round(ctx, x + 13 + i * (w - 26) / 3, y + 28, (w - 29) / 3, 35, 5, '#c6baa2', '#9d8e76'); circle(ctx, x + 12 + (i + .5) * (w - 26) / 3, y + 46, 1.3, '#968772'); }
  round(ctx, x + 4, y + 19, 10, 48, 4, '#afa28a', '#90816b'); round(ctx, x + w - 14, y + 19, 10, 48, 4, '#afa28a', '#90816b');
}
function platter(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) { round(ctx, x, y, w, h, 9, '#b5a17d', '#dbc9a3'); round(ctx, x + 4, y + 4, w - 8, h - 8, 6, '#6b5b43', '#897452'); }
function glass(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) { circle(ctx, x, y, 9, '#c0b79e', '#e8d9b5'); circle(ctx, x, y, 6.5, color); line(ctx, [x - 5, y + 5, x + 6, y - 7], '#d3c2a5', 1); circle(ctx, x + 4, y - 5, 3, '#c2bc72'); }
function skull(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) { ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.beginPath(); ctx.ellipse(0, -2, 12, 12, 0, 0, Math.PI * 2); ctx.fillStyle = C.cream; ctx.fill(); round(ctx, -7, 4, 14, 11, 2, C.cream); circle(ctx, -5, -2, 3.5, '#292724'); circle(ctx, 5, -2, 3.5, '#292724'); line(ctx, [-3, 10, -3, 16], '#292724'); line(ctx, [3, 10, 3, 16], '#292724'); ctx.restore(); }
function ornament(ctx: CanvasRenderingContext2D, x: number, y: number, direction: number) { ctx.save(); ctx.translate(x, y); ctx.rotate(direction); line(ctx, [0, 35, 0, 0, 35, 0], C.gold, 1); line(ctx, [5, 25, 5, 5, 25, 5], '#79664b', .7); ctx.beginPath(); ctx.moveTo(0, 22); ctx.bezierCurveTo(21, 22, 21, 7, 11, 10); ctx.bezierCurveTo(6, 14, 14, 18, 17, 13); ctx.strokeStyle = '#9d8259'; ctx.stroke(); circle(ctx, 0, 0, 2, C.gold); ctx.restore(); }
function roomPath(ctx: CanvasRenderingContext2D) {
  const room = VENUE.boundary, cutout = VENUE.obstacles.find(obstacle => obstacle.id === 'outside-lower-left')!;
  ctx.beginPath(); ctx.moveTo(room.x, room.y);
  ctx.lineTo(room.x + room.w, room.y); ctx.lineTo(room.x + room.w, room.y + room.h);
  ctx.lineTo(cutout.x + cutout.w, room.y + room.h); ctx.lineTo(cutout.x + cutout.w, cutout.y);
  ctx.lineTo(room.x, cutout.y); ctx.closePath();
}
function houseWall(ctx: CanvasRenderingContext2D, wall: Rect) {
  round(ctx, wall.x + 3, wall.y - 4, wall.w, wall.h + 8, 1, '#15131090');
  round(ctx, wall.x, wall.y, wall.w, wall.h, 1, '#84715a', '#d2bc95');
  line(ctx, [wall.x + 2, wall.y + wall.h - 2, wall.x + wall.w - 2, wall.y + wall.h - 2], '#4b4034', 2);
  if (wall.w > wall.h) {
    line(ctx, [wall.x + 2, wall.y + 3, wall.x + wall.w - 2, wall.y + 3], '#decaab', 3);
    for (let x = wall.x + 42; x < wall.x + wall.w - 8; x += 42) line(ctx, [x, wall.y + 5, x, wall.y + wall.h - 3], '#aa9475', .8);
  } else {
    line(ctx, [wall.x + 3, wall.y + 2, wall.x + 3, wall.y + wall.h - 2], '#decaab', 3);
    for (let y = wall.y + 30; y < wall.y + wall.h - 8; y += 30) line(ctx, [wall.x + 5, y, wall.x + wall.w - 2, y], '#aa9475', .8);
  }
}

export function drawVenue(ctx: CanvasRenderingContext2D, sim: CrowdSimulation, options: ViewOptions) {
  const room = VENUE.boundary, patio = VENUE.patio;
  const foodFraction = (id: StationId) => {
    if (options.mode === 'venue') return 1;
    const stock = sim.supply(id);
    return stock.initial ? stock.remaining / stock.initial : 0;
  };
  const foodItems = (id: StationId, pieces: number) => Math.ceil(foodFraction(id) * pieces);
  ctx.clearRect(0, 0, VENUE.width, VENUE.height);
  roomPath(ctx); ctx.fillStyle = C.floor; ctx.fill();
  ctx.save(); roomPath(ctx); ctx.clip();
  // Quiet parquet engraving; deterministic, purely decorative.
  for (let row = 0; row < 30; row++) for (let col = 0; col < 9; col++) {
    const x = col * 132 + (row % 2 ? -65 : 0), y = row * 28;
    ctx.fillStyle = (row + col) % 4 === 0 ? '#2c2925' : '#292724'; ctx.fillRect(x, y, 131, 27);
    line(ctx, [x + 4, y + 14, x + 125, y + 14], '#302c27', .6);
  }
  round(ctx, patio.x, patio.y, patio.w, patio.h, 0, '#202622');
  ctx.save(); ctx.beginPath(); ctx.rect(patio.x, patio.y, patio.w, patio.h); ctx.clip();
  for (let y = -50; y < 620; y += 25) line(ctx, [20, y, 105, y + 85], '#343c31', 1);
  ctx.restore();
  line(ctx, [105, 25, 105, patio.y + patio.h], '#a18b68', 3);
  plant(ctx, 61, 64, .9); plant(ctx, 61, patio.y + patio.h - 45, .9);
  ctx.save(); ctx.translate(62, patio.y + patio.h / 2); ctx.rotate(-Math.PI / 2); label(ctx, 'P A T I O', 0, 0, 13); label(ctx, 'ACCESS UNCONFIRMED', 0, 20, 7.5, '#a3a693'); ctx.restore();
  circle(ctx, 62, patio.y + patio.h - 130, 10, '#282e27', '#7c866e'); label(ctx, '?', 62, patio.y + patio.h - 130, 13, '#c6c3a3', true);

  // The host confirmed this area was unavailable, not a party service space.
  const kitchen = VENUE.obstacles.find(obstacle => obstacle.id === 'kitchen')!;
  const counter = VENUE.obstacles.find(obstacle => obstacle.id === 'counter')!;
  round(ctx, kitchen.x, kitchen.y, kitchen.w, kitchen.h, 0, '#1e1d1d');
  label(ctx, 'NO ACCESS', kitchen.x + kitchen.w / 2, kitchen.y + kitchen.h / 2, 9, '#776f63');
  line(ctx, [kitchen.x, kitchen.y, kitchen.x, kitchen.y + kitchen.h, kitchen.x + kitchen.w, kitchen.y + kitchen.h], '#766750', 2);
  round(ctx, counter.x, counter.y, counter.w, counter.h, 4, '#36312b', '#817058');
  const bar = VENUE.obstacles.find(obstacle => obstacle.id === 'bar')!;
  const pizza = VENUE.obstacles.find(obstacle => obstacle.id === 'pizza')!;
  // One connected L-shaped slab: drinks extend right of the vertical pizza section.
  const horizontal = bar, vertical = pizza;
  for (const inset of [0, 6]) {
    ctx.beginPath(); ctx.moveTo(vertical.x + inset, vertical.y + inset);
    ctx.lineTo(vertical.x + vertical.w - inset, vertical.y + inset);
    ctx.lineTo(vertical.x + vertical.w - inset, horizontal.y + inset);
    ctx.lineTo(horizontal.x + horizontal.w - inset, horizontal.y + inset);
    ctx.lineTo(horizontal.x + horizontal.w - inset, horizontal.y + horizontal.h - inset);
    ctx.lineTo(horizontal.x + inset, horizontal.y + horizontal.h - inset);
    ctx.closePath();
    ctx.fillStyle = inset ? '#3e4139' : '#665241'; ctx.fill();
    ctx.strokeStyle = inset ? '#7e7a62' : '#b4a076'; ctx.lineWidth = 1; ctx.stroke();
  }
  glass(ctx, bar.x + bar.w * .25, bar.y + 37, '#787ba5'); glass(ctx, bar.x + bar.w * .75, bar.y + 37, '#9386ad');
  const barMenu = sim.stations.find(station => station.id === 'bar')!.menu!;
  if (options.showStationTitles) barMenu.forEach((drink, index) => {
    // Each drink label sits with its glass on the horizontal slab.
    const x = bar.x + bar.w * (.25 + index * .5), y = bar.y + 10;
    const lines: string[] = [''];
    ctx.font = '500 10px "Cormorant Garamond", Georgia';
    for (const word of drink.name.toUpperCase().split(' ')) {
      const candidate = `${lines.at(-1)} ${word}`.trim();
      if (lines.at(-1) && ctx.measureText(candidate).width > bar.w / 2 - 12) lines.push(word);
      else lines[lines.length - 1] = candidate;
    }
    lines.forEach((text, lineIndex) => label(ctx, text, x, y + lineIndex * 10, 10, C.cream, true));
  });
  badge(ctx, 8, bar.x - 12, bar.y + 15);

  if (options.showStationTitles) {
    round(ctx, pizza.x + 5, pizza.y + 5, pizza.w - 10, 41, 2, '#30251f', '#a58455');
    STATIONS.find(station => station.id === 'pizza')!.name.toUpperCase().split(' ').forEach((word, index) => label(ctx, word, pizza.x + pizza.w / 2, pizza.y + 14 + index * 12, 10, '#edcf9c', true));
  }
  for (const offset of [70, 115]) {
    const x = pizza.x + pizza.w / 2, y = pizza.y + offset;
    circle(ctx, x, y, 15, '#b2a080', '#d4c39f');
    for (let slice = 0; slice < 6; slice++) {
      if (slice + (offset === 115 ? 6 : 0) >= foodItems('pizza', 12)) continue;
      const angle = slice * Math.PI / 3;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, 13, angle, angle + Math.PI / 3); ctx.closePath(); ctx.fillStyle = '#d8b571'; ctx.fill(); ctx.strokeStyle = '#b78249'; ctx.lineWidth = 1.2; ctx.stroke();
      line(ctx, [x, y, x + Math.cos(angle) * 12, y + Math.sin(angle) * 12], '#a37648', .6);
      circle(ctx, x + Math.cos(angle + .5) * 7, y + Math.sin(angle + .5) * 7, 2, slice % 2 ? '#71815b' : '#a95e46');
    }
  }
  badge(ctx, STATIONS.findIndex(station => station.id === 'pizza') + 1, pizza.x - 23, pizza.y + 40);
  sofa(ctx, 324, 38, 177); sofa(ctx, 510, 38, 156);
  plant(ctx, 292, 40, .65); candle(ctx, 688, 72);

  // Draw the corrected L-shaped food pair from the same footprints used by routing.
  const puri = VENUE.obstacles.find(obstacle => obstacle.id === 'puri')!;
  const chaat = VENUE.obstacles.find(obstacle => obstacle.id === 'chaat')!;
  ctx.save(); ctx.translate(puri.x, puri.y);
  round(ctx, 0, 0, puri.w, puri.h, 6, '#705035', '#b29568');
  round(ctx, 6, 5, puri.w - 13, puri.h - 10, 4, '#4d3d2e', '#8b704d');
  for (let i = 0; i < foodItems('puri', 8); i++) {
    const x = 26 + Math.floor(i / 2) * 26 + (i % 2 ? 10 : 0), y = i % 2 ? 30 : 18;
    circle(ctx, x, y, 6.5, '#c49556', '#e1ba7d'); circle(ctx, x, y, 2, '#695135');
  }
  circle(ctx, puri.w - 55, 23, 13, '#aaa48a', '#d3c5a4'); circle(ctx, puri.w - 55, 23, 10, '#68745c');
  circle(ctx, puri.w - 26, 17, 5, '#c1ac87'); circle(ctx, puri.w - 26, 32, 5, '#c1ac87');
  if (options.showStationTitles) {
    round(ctx, puri.w / 2 - 53, puri.h / 2 - 12, 106, 24, 2, '#32271f', '#a88852');
    label(ctx, STATIONS.find(station => station.id === 'puri')!.name.toUpperCase(), puri.w / 2, puri.h / 2, 9, '#e5c89a');
  }
  ctx.restore();
  ctx.save(); ctx.translate(chaat.x, chaat.y);
  round(ctx, 0, 0, chaat.w, chaat.h, 6, '#65513d', '#ad926d');
  for (let y = 25; y < chaat.h - 11; y += 40) {
    const x = chaat.w / 2;
    circle(ctx, x, y, 14, '#bcb39b', '#ded0b1');
    if ((y - 25) / 40 >= foodItems('chaat', 4)) continue;
    circle(ctx, x, y, 10, '#be9a63');
    for (let k = 0; k < 6; k++) { const a = k * 2.4; circle(ctx, x + Math.cos(a) * 6, y + Math.sin(a) * 6, 2.5, k % 2 ? '#d6cbb3' : '#738064'); }
  }
  ctx.restore();
  badge(ctx, 1, puri.x + puri.w / 2, puri.y - 18);
  badge(ctx, 2, chaat.x + chaat.w / 2, chaat.y + chaat.h + 18);
  if (options.showStationTitles) {
    const [chaatFirst, ...chaatRest] = STATIONS.find(station => station.id === 'chaat')!.name.split(' ');
    label(ctx, chaatFirst, chaat.x + chaat.w + 68, chaat.y + 58, 19, C.cream, true);
    label(ctx, chaatRest.join(' '), chaat.x + chaat.w + 68, chaat.y + 78, 18, C.cream, true);
  }

  // One continuous serving table, with three serving positions.
  const table = VENUE.obstacles.find(obstacle => obstacle.id === 'table')!;
  const foodWall = VENUE.obstacles.find(obstacle => obstacle.id === 'food-wall')!;
  houseWall(ctx, foodWall);
  ctx.save(); ctx.translate(table.x - 262, table.y - 467);
  round(ctx, 262, 467, 278, 125, 8, '#574536', '#b39a73'); round(ctx, 270, 475, 262, 109, 4, '#695640', '#937c5a');
  for (let x = 279; x < 535; x += 12) line(ctx, [x, 480, x, 580], '#715d46', .5);
  platter(ctx, 283, 483, 96, 49); platter(ctx, 423, 483, 96, 49);
  for (let i = 0; i < foodItems('demons', 6); i++) { const x = 299 + i % 3 * 28, y = 497 + Math.floor(i / 3) * 22; circle(ctx, x, y, 8, '#96574b'); circle(ctx, x, y, 5.8, '#d6d1ac'); circle(ctx, x, y, 2.8, '#5a6750'); circle(ctx, x, y, 1.3, '#272723'); }
  circle(ctx, 449, 508, 18, '#6b5b43', '#e1caa1');
  ctx.save(); ctx.beginPath(); ctx.arc(449, 508, 18 * Math.sqrt(foodFraction('hummus')), 0, Math.PI * 2); ctx.clip();
  circle(ctx, 449, 508, 17, '#d3b88a'); ctx.beginPath(); ctx.arc(449, 508, 12, 0, Math.PI * 1.7); ctx.strokeStyle = '#b2915a'; ctx.lineWidth = 2; ctx.stroke(); circle(ctx, 449, 508, 3.5, '#797947'); ctx.restore();
  for (let i = 0; i < foodItems('hummus', 4); i++) { ctx.beginPath(); ctx.moveTo(475 + i * 8, 495); ctx.lineTo(470 + i * 8, 521); ctx.lineTo(488 + i * 8, 517); ctx.closePath(); ctx.fillStyle = i % 2 ? '#cfb580' : '#bfa06c'; ctx.fill(); ctx.strokeStyle = '#8c744c'; ctx.stroke(); }
  platter(ctx, 340, 551, 122, 25); for (let i = 0; i < foodItems('dessert', 5); i++) { round(ctx, 348 + i * 22, 556, 16, 15, 2, '#cfa46a'); circle(ctx, 356 + i * 22, 562, 2, '#74805b'); }
  if (options.showStationTitles) {
    label(ctx, STATIONS.find(station => station.id === 'demons')!.name.toUpperCase(), 333, 542, 8.5); label(ctx, STATIONS.find(station => station.id === 'hummus')!.name.toUpperCase(), 471, 542, 8.5); label(ctx, STATIONS.find(station => station.id === 'dessert')!.name.toUpperCase(), 401, 585, 8.2);
  }
  badge(ctx, 4, 275, 478); badge(ctx, 3, 527, 478); badge(ctx, 5, 325, 564); candle(ctx, 399, 506);
  ctx.restore();

  // A three-sided house alcove, reached through the opening to the right of the food wall.
  const nookLeft = VENUE.obstacles.find(obstacle => obstacle.id === 'nook-left')!;
  const nookRight = VENUE.obstacles.find(obstacle => obstacle.id === 'nook-right')!;
  const nookBack = VENUE.obstacles.find(obstacle => obstacle.id === 'nook-back')!;
  round(ctx, nookLeft.x + nookLeft.w, foodWall.y + foodWall.h, nookRight.x - nookLeft.x - nookLeft.w, nookBack.y - foodWall.y - foodWall.h, 0, '#201d1e');
  houseWall(ctx, nookLeft); houseWall(ctx, nookRight); houseWall(ctx, nookBack);
  const booth = VENUE.obstacles.find(obstacle => obstacle.id === 'booth-left')!;
  const boothRight = VENUE.obstacles.find(obstacle => obstacle.id === 'booth-right')!;
  const boothBack = VENUE.obstacles.find(obstacle => obstacle.id === 'booth-back')!;
  const boothWidth = boothRight.x + boothRight.w - booth.x;
  ctx.save(); ctx.translate(booth.x, booth.y);
  round(ctx, 0, 0, boothWidth, booth.h, 3, '#3e3032', '#aa8c66');
  round(ctx, 13, 5, boothWidth - 26, booth.h - 23, 2, '#4b403a', '#8d7862');
  for (let y = 12; y < booth.h - 20; y += 12) line(ctx, [18, y, boothWidth - 18, y], '#776653', .65);
  for (let x = 18; x < boothWidth - 18; x += 38) line(ctx, [x, 8, x, booth.h - 23], '#6c5d4e', .65);
  round(ctx, 4, 4, 8, booth.h - 8, 1, '#74484c'); round(ctx, boothWidth - 12, 4, 8, booth.h - 8, 1, '#74484c');
  round(ctx, 19, boothBack.y - booth.y + 1, boothWidth - 38, 16, 1, '#282024', '#9a7c54');
  label(ctx, STATIONS.find(station => station.id === 'photo')!.name.toUpperCase(), boothWidth / 2, boothBack.y - booth.y + 9, 8.5, '#dbc69e');
  round(ctx, 96, 2, 69, 18, 1, '#25211e', '#ad9875'); label(ctx, 'GUILTY OF 30', boothWidth / 2, 11, 8, '#c4b28e');
  line(ctx, [boothWidth / 2, 28, boothWidth / 2 - 12, 42, boothWidth / 2, 28, boothWidth / 2 + 12, 42], '#c2ad86', 1.5);
  round(ctx, boothWidth / 2 - 10, 21, 21, 14, 3, '#262728', '#a5967b'); circle(ctx, boothWidth / 2, 28, 4, '#697775', '#b5aa8a');
  candle(ctx, 25, booth.h - 30); candle(ctx, boothWidth - 25, booth.h - 30); badge(ctx, 6, -9, 14);
  ctx.restore();
  const restroom = VENUE.obstacles.find(obstacle => obstacle.id === 'restroom')!;
  round(ctx, restroom.x, restroom.y, restroom.w, restroom.h, 0, '#33312b', '#aa9573'); label(ctx, 'RESTROOM', restroom.x + restroom.w / 2, restroom.y + restroom.h / 2, 10, '#c6b99c');
  line(ctx, [restroom.x + 1, restroom.y + 3, restroom.x + 1, restroom.y + 31], '#33312b', 4);
  ctx.setLineDash([3, 4]); line(ctx, [restroom.x + 1, restroom.y + 3, restroom.x - 16, restroom.y + 3, restroom.x - 16, restroom.y + 30, restroom.x + 1, restroom.y + 30], '#ab956f', .7); ctx.setLineDash([]);
  label(ctx, '?', restroom.x - 16, restroom.y + 17, 12, '#c6ac76');
  plant(ctx, 831, 469, .9);

  if (sim.settings.charades !== 'off') {
    const p = sim.stations.find(s => s.id === 'charades')!.point;
    ctx.beginPath(); ctx.arc(p.x, p.y, 74, 0, Math.PI * 2); ctx.setLineDash([3, 6]); ctx.strokeStyle = '#796b4d'; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = .15; skull(ctx, p.x, p.y - 26, .8); ctx.globalAlpha = 1;
    label(ctx, 'Act your age…', p.x, p.y + 1, 22, '#c5b48d', true); label(ctx, 'or don’t!', p.x, p.y + 24, 22, '#c5b48d', true);
    label(ctx, sim.elapsed >= CHARADES_END ? 'CHARADES · FINISHED' : sim.elapsed >= CHARADES_START ? 'CHARADES · GAME ON' : 'CHARADES · 10:00–10:45 PM', p.x, p.y + 47, 6.8, '#a4916c'); badge(ctx, 7, p.x, p.y - 74);
  }
  // Boundary with the entrance intentionally open on the lower right.
  roomPath(ctx); ctx.strokeStyle = C.wall; ctx.lineWidth = 3; ctx.stroke();
  const entry = VENUE.entry;
  line(ctx, [room.x + room.w, entry.y - 28, room.x + room.w, entry.y + 32], C.floor, 7);
  line(ctx, [entry.x, entry.y, entry.x + 22, entry.y], '#c3b08c', 1.4); line(ctx, [entry.x + 5, entry.y - 5, entry.x, entry.y, entry.x + 5, entry.y + 5], '#c3b08c', 1.4);
  label(ctx, 'ENTRANCE', entry.x - 36, entry.y + 43, 8, '#c9b795');
  ctx.restore();
  ornament(ctx, 5, 9, 0); ornament(ctx, VENUE.width - 5, 9, Math.PI / 2); ornament(ctx, VENUE.width - 5, VENUE.height - 9, Math.PI); ornament(ctx, 5, VENUE.height - 9, -Math.PI / 2);

  if (options.vibes && options.mode !== 'heatmap') drawPartyLights(ctx, options.vibes, options.lightTime ?? options.time, options.reducedMotion);

  if (options.mode !== 'venue') {
    if (options.mode === 'heatmap') drawHeatmap(ctx, sim);
    if (options.mode === 'heatmap') for (const h of sim.hotspots) { ctx.beginPath(); ctx.arc(h.point.x, h.point.y, 72, 0, Math.PI * 2); ctx.strokeStyle = h.severity === 'high' ? '#e27c6b' : '#d5a75d'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]); }
    for (const g of sim.guests) if (isInRoom(g)) drawGuest(ctx, g, options, sim.elapsed);
    if (options.showCounts) for (const s of sim.stations) {
      if (s.id === 'charades' && sim.settings.charades === 'off') continue;
      const count = sim.guests.filter(g => g.station === s.id && g.state === 'serving').length;
      round(ctx, s.point.x - 13, s.point.y - 39, 26, 18, 9, '#171619', '#a68b5c'); label(ctx, String(count), s.point.x, s.point.y - 30, 9);
    }
  }
  if (options.selected) {
    const bounds = stationBounds(sim.stations.find(s => s.id === options.selected)!);
    ctx.save(); ctx.beginPath(); ctx.rect(-10000, -10000, 20000, 20000);
    ctx.roundRect(bounds.x - 8, bounds.y - 8, bounds.w + 16, bounds.h + 16, 10);
    ctx.fillStyle = 'rgba(17,16,20,.48)'; ctx.fill('evenodd');
    round(ctx, bounds.x - 8, bounds.y - 8, bounds.w + 16, bounds.h + 16, 10, 'rgba(196,154,87,.035)', '#c49a57');
    ctx.restore();
  }
  if (options.hovered && options.hovered !== options.selected) {
    const bounds = stationBounds(sim.stations.find(s => s.id === options.hovered)!);
    round(ctx, bounds.x - 4, bounds.y - 4, bounds.w + 8, bounds.h + 8, 7, 'rgba(196,154,87,.08)', '#b39361');
  }
}
function drawGuest(ctx: CanvasRenderingContext2D, g: Guest, options: ViewOptions, elapsed: number) {
  let p = options.smooth.get(g.id);
  if (!p || options.reducedMotion) p = { ...g.position };
  else { const alpha = options.alpha ?? 1; p.x = g.previousPosition.x + (g.position.x - g.previousPosition.x) * alpha; p.y = g.previousPosition.y + (g.position.y - g.previousPosition.y) * alpha; }
  const previousAngle = p.angle ?? g.angle;
  const delta = Math.atan2(Math.sin(g.angle - previousAngle), Math.cos(g.angle - previousAngle));
  p.angle = options.reducedMotion ? g.angle : previousAngle + delta * .18;
  options.smooth.set(g.id, p);
  const idle = !g.path.length && !options.reducedMotion ? Math.sin(options.time / 1300 + g.id * 3) * .045 : 0;
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle + Math.PI / 2 + idle);
  ctx.scale(1.55, 1.55);
  if (g.plateUntil > elapsed) { circle(ctx, -7, 3, 3.2, '#d8c9ab', '#95836a'); circle(ctx, -7, 3, 1.7, '#b58953'); }
  if (g.drinkUntil > elapsed) { round(ctx, 5, 1, 3.5, 5, .8, '#a2b8c5', '#d8dbc9'); line(ctx, [7, -1, 7, 3], '#e3cf9e', .6); }
  ctx.beginPath(); ctx.ellipse(0, 1, 6.4, 4, 0, 0, Math.PI * 2); ctx.fillStyle = g.clothing; ctx.fill(); ctx.strokeStyle = '#201b18'; ctx.lineWidth = .7; ctx.stroke();
  circle(ctx, 0, -2.5, 3.8, '#ceb399');
  ctx.beginPath(); ctx.arc(0, -3.1, 3.7, Math.PI, Math.PI * 2); ctx.fillStyle = g.hair; ctx.fill();
  ctx.restore();
}
function drawHeatmap(ctx: CanvasRenderingContext2D, sim: CrowdSimulation) {
  const size = 30, guests = sim.guests.filter(isInRoom);
  const room = VENUE.boundary;
  for (let x = VENUE.patio.x + VENUE.patio.w; x + size < room.x + room.w; x += size) for (let y = room.y + 3; y + size < room.y + room.h; y += size) {
    if (!sim.navigation.valid({ x: x + size / 2, y: y + size / 2 })) continue;
    const n = guests.filter(g => Math.hypot(g.position.x - x - size / 2, g.position.y - y - size / 2) < 55).length;
    if (!n) continue;
    ctx.fillStyle = n >= 8 ? 'rgba(212,69,62,.48)' : n >= 5 ? 'rgba(233,131,55,.39)' : n >= 3 ? 'rgba(224,198,91,.27)' : 'rgba(95,145,145,.13)';
    ctx.fillRect(x, y, size, size);
  }
}
export function stationAt(point: Point, sim: CrowdSimulation): StationId | null {
  let best: StationId | null = null, dist = 64;
  for (const s of sim.stations) { if (s.id === 'charades' && sim.settings.charades === 'off') continue; const d = Math.hypot(point.x - s.point.x, point.y - s.point.y); if (d < dist) { dist = d; best = s.id; } }
  for (const o of VENUE.obstacles) if (containsPoint(o, point)) { if (o.id === 'table') return point.y > o.y + o.h * .65 ? 'dessert' : point.x < o.x + o.w / 2 ? 'demons' : 'hummus'; if (o.id.startsWith('booth-')) return 'photo'; if (STATIONS.some(s => s.id === o.id)) return o.id as StationId; }
  return best ?? sim.stations.find(s => !(s.id === 'charades' && sim.settings.charades === 'off') && containsPoint(stationBounds(s), point))?.id ?? null;
}

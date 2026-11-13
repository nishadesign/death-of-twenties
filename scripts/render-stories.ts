import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { CrowdSimulation } from '../src/simulation/CrowdSimulation';
import { INITIAL_SETTINGS } from '../src/simulation/venue';
import { drawVenue } from '../src/rendering/VenueRenderer';
import { baseScale, OVERVIEW, worldToScreen } from '../src/rendering/camera';

GlobalFonts.registerFromPath('node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff2', 'Cormorant Garamond');
GlobalFonts.registerFromPath('node_modules/@fontsource/dm-sans/files/dm-sans-latin-500-normal.woff2', 'DM Sans');
const sim = new CrowdSimulation(INITIAL_SETTINGS);
while (sim.elapsed < 720) sim.tick();
const viewport = { width: 640, height: 420 };
const sheet = createCanvas(1280, Math.ceil(sim.stations.length / 2) * 450), sheetCtx = sheet.getContext('2d');
sheetCtx.fillStyle = '#111014'; sheetCtx.fillRect(0, 0, sheet.width, sheet.height);
mkdirSync('test-results', { recursive: true });
for (const [index, station] of sim.stations.entries()) {
  const canvas = createCanvas(viewport.width, viewport.height), ctx = canvas.getContext('2d');
  const camera = OVERVIEW, scale = baseScale(viewport) * camera.zoom, origin = worldToScreen({ x: 0, y: 0 }, camera, viewport);
  ctx.fillStyle = '#19181a'; ctx.fillRect(0, 0, viewport.width, viewport.height);
  ctx.translate(origin.x, origin.y); ctx.scale(scale, scale);
  drawVenue(ctx as unknown as CanvasRenderingContext2D, sim, { mode: 'live', selected: station.id, showCounts: false, time: 0, smooth: new Map(), reducedMotion: true });
  writeFileSync(`test-results/selected-${station.id}.png`, canvas.toBuffer('image/png'));
  const x = index % 2 * 640, y = Math.floor(index / 2) * 450;
  sheetCtx.drawImage(canvas, x, y + 30); sheetCtx.fillStyle = '#f4e7cf'; sheetCtx.font = '16px "DM Sans"'; sheetCtx.fillText(station.name, x + 18, y + 21);
}
writeFileSync('test-results/selected-contact-sheet.png', sheet.toBuffer('image/png'));
console.log(`Rendered ${sim.stations.length} selected stations without camera movement offline.`);

import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { CrowdSimulation } from '../src/simulation/CrowdSimulation';
import { INITIAL_SETTINGS, VENUE } from '../src/simulation/venue';
import { drawVenue } from '../src/rendering/VenueRenderer';
import { DEFAULT_VIBES } from '../src/rendering/PartyLights';

// Offline rendering of our Canvas module. No browser or network access.
GlobalFonts.registerFromPath('node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff2', 'Cormorant Garamond');
GlobalFonts.registerFromPath('node_modules/@fontsource/dm-sans/files/dm-sans-latin-500-normal.woff2', 'DM Sans');
const sim = new CrowdSimulation(INITIAL_SETTINGS);
const start = performance.now();
while (sim.elapsed < 720) sim.tick();
mkdirSync('test-results', { recursive: true });
const views = [
  ...(['venue', 'live', 'heatmap'] as const).map(mode => ({ name: mode, mode, lightTime: 0, lights: false, showStationTitles: false })),
  { name: 'vibes', mode: 'live' as const, lightTime: 6000, lights: true, showStationTitles: false },
  { name: 'vibes-rotation', mode: 'live' as const, lightTime: 16000, lights: true, showStationTitles: false },
  { name: 'station-titles', mode: 'venue' as const, lightTime: 0, lights: false, showStationTitles: true },
];
for (const { name, mode, lightTime, lights, showStationTitles } of views) {
  const scale = 1.6, canvas = createCanvas(VENUE.width * scale, VENUE.height * scale), ctx = canvas.getContext('2d');
  ctx.fillStyle = '#19181a'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.scale(scale, scale);
  drawVenue(ctx as unknown as CanvasRenderingContext2D, sim, { mode, showCounts: false, showStationTitles, selected: null, time: 0, smooth: new Map(), reducedMotion: !lights, vibes: { ...DEFAULT_VIBES, enabled: lights }, lightTime });
  writeFileSync(`test-results/venue-${name}.png`, canvas.toBuffer('image/png'));
}
console.log(JSON.stringify({ previewComputationMs: Math.round(performance.now() - start), metrics: sim.metrics() }, null, 2));

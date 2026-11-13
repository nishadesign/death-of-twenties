import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { CrowdSimulation } from '../src/simulation/CrowdSimulation';
import { INITIAL_SETTINGS, VENUE } from '../src/simulation/venue';
import { drawVenue } from '../src/rendering/VenueRenderer';
import { DEFAULT_VIBES } from '../src/rendering/PartyLights';
import { partyTime } from '../src/simulation/night';

// Offline Canvas snapshots of the same evening; no browser or network access.
GlobalFonts.registerFromPath('node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff2', 'Cormorant Garamond');
GlobalFonts.registerFromPath('node_modules/@fontsource/dm-sans/files/dm-sans-latin-500-normal.woff2', 'DM Sans');
mkdirSync('test-results', { recursive: true });
const simulation = new CrowdSimulation(INITIAL_SETTINGS);
for (const [name, elapsed] of [['1930', 0], ['2100', 5400], ['2215', 9900], ['2330', 14400]] as const) {
  while (simulation.elapsed < elapsed) simulation.tick();
  const scale = 1.6, canvas = createCanvas(VENUE.width * scale, VENUE.height * scale), context = canvas.getContext('2d');
  context.scale(scale, scale);
  drawVenue(context as unknown as CanvasRenderingContext2D, simulation, { mode: 'live', selected: null, showCounts: false, time: 0, smooth: new Map(), reducedMotion: true, vibes: DEFAULT_VIBES });
  writeFileSync(`test-results/night-${name}.png`, canvas.toBuffer('image/png'));
  const metrics = simulation.metrics();
  console.log(JSON.stringify({ clock: partyTime(elapsed), inRoom: metrics.total, arrived: metrics.arrived, home: metrics.departed, drinks: metrics.drinks, food: metrics.food, charades: metrics.playing }));
}

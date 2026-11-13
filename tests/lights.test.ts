import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas } from '@napi-rs/canvas';
import { drawPartyLights, DEFAULT_VIBES, LIGHT_CORNERS, lightPosition, type VibeSettings } from '../src/rendering/PartyLights';
import { drawVenue } from '../src/rendering/VenueRenderer';
import { CrowdSimulation } from '../src/simulation/CrowdSimulation';
import { INITIAL_SETTINGS, VENUE } from '../src/simulation/venue';

function lightFrame(settings: VibeSettings, time: number, reducedMotion = false) {
  const canvas = createCanvas(1000, 750), context = canvas.getContext('2d');
  drawPartyLights(context as unknown as CanvasRenderingContext2D, settings, time, reducedMotion);
  return canvas.toBuffer('image/png');
}

test('corner lights move gently, stay static for reduced motion, and disappear at zero brightness', () => {
  const first = lightFrame(DEFAULT_VIBES, 0);
  assert.equal(first.equals(lightFrame(DEFAULT_VIBES, 6000)), false);
  assert.equal(lightFrame(DEFAULT_VIBES, 0, true).equals(lightFrame(DEFAULT_VIBES, 6000, true)), true);
  const off = lightFrame({ ...DEFAULT_VIBES, enabled: false }, 0);
  assert.equal(off.equals(first), false);
  assert.equal(off.equals(lightFrame({ ...DEFAULT_VIBES, intensity: 0 }, 0)), true);
});

test('the lower glow fixture sits in the left corner beside the food-table wall', () => {
  assert.deepEqual(LIGHT_CORNERS, ['upper-right', 'lower-left']);
  const point = lightPosition('lower-left');
  const wall = VENUE.obstacles.find(obstacle => obstacle.id === 'food-wall')!;
  assert(point.x > VENUE.patio.x + VENUE.patio.w && point.x < VENUE.patio.x + VENUE.patio.w + 30);
  assert(point.y < wall.y && point.y > wall.y - 25);
});

test('party lighting never changes the density heatmap or guest state', () => {
  const simulation = new CrowdSimulation(INITIAL_SETTINGS);
  for (let step = 0; step < 200; step++) simulation.tick();
  const before = JSON.stringify(simulation.guests), elapsed = simulation.elapsed;
  const frame = (enabled: boolean) => {
    const canvas = createCanvas(1000, 750), context = canvas.getContext('2d');
    drawVenue(context as unknown as CanvasRenderingContext2D, simulation, {
      mode: 'heatmap', showCounts: false, selected: null, time: 0,
      smooth: new Map(), reducedMotion: true, vibes: { ...DEFAULT_VIBES, enabled }, lightTime: 6000,
    });
    return canvas.toBuffer('image/png');
  };
  assert.equal(frame(true).equals(frame(false)), true);
  assert.equal(JSON.stringify(simulation.guests), before);
  assert.equal(simulation.elapsed, elapsed);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { OVERVIEW, worldToScreen, screenToWorld } from '../src/rendering/camera';
import { stationBounds, stationMarker } from '../src/rendering/stationGeometry';
import { stationAt } from '../src/rendering/VenueRenderer';
import { STATIONS, VENUE, INITIAL_SETTINGS } from '../src/simulation/venue';
import { CrowdSimulation } from '../src/simulation/CrowdSimulation';
import { getStationStory, getStoryImages } from '../src/stories/manifest';
import StationGallery from '../src/components/StationGallery';

test('station hit-testing projection remains accurate at manual camera positions and viewport sizes', () => {
  const sim = new CrowdSimulation(INITIAL_SETTINGS);
  for (const station of STATIONS) {
    const bounds = stationBounds(station);
    const targets = [{ x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 }, stationMarker(station)];
    for (const viewport of [{ width: 800, height: 500 }, { width: 360, height: 220 }]) {
      for (const camera of [OVERVIEW, { zoom: 1.6, center: { x: 430, y: 290 } }]) {
        for (const target of targets) {
          const screen = worldToScreen(target, camera, viewport);
          const point = screenToWorld(screen, camera, viewport);
          assert.equal(stationAt(point, sim), station.id, `${station.id} surface and badge remain clickable`);
        }
      }
    }
  }
});

test('station picking excludes empty tabletop, approach floor, walls and neighboring sections', () => {
  const sim = new CrowdSimulation(INITIAL_SETTINGS);
  const table = VENUE.obstacles.find(obstacle => obstacle.id === 'table')!;
  for (const [dx, dy] of [[135, 42], [30, 90], [245, 100], [135, 74]]) {
    assert.equal(stationAt({ x: table.x + dx, y: table.y + dy }, sim), null, 'empty tabletop does not open a story');
  }
  for (const station of sim.stations.filter(station => !['photo', 'charades'].includes(station.id))) {
    assert.equal(stationAt(station.point, sim), null, `${station.id} guest approach is not a story target`);
  }
  for (const point of [{ x: 110, y: 90 }, { x: 200, y: 150 }, { x: 330, y: 70 }, { x: 700, y: 170 }, { x: 800, y: 270 }, { x: 420, y: 585 }, { x: 450, y: 520 }]) {
    assert.equal(stationAt(point, sim), null, 'nearby floor and furniture stay unselected');
  }
  assert.equal(stationAt({ x: 740, y: 195 }, sim), 'pizza');
  assert.equal(stationAt({ x: 740, y: 215 }, sim), 'bar');
  assert.equal(stationAt({ x: 150, y: 105 }, sim), 'puri');
  assert.equal(stationAt({ x: 150, y: 125 }, sim), 'chaat');
  const charades = sim.stations.find(station => station.id === 'charades')!;
  assert.equal(stationAt({ x: charades.point.x + 65, y: charades.point.y + 65 }, sim), null, 'charades uses its circular footprint');
  sim.setCharades('off');
  assert.equal(stationAt(charades.point, sim), null);
  assert.equal(stationAt(stationMarker(charades), sim), null);
});

test('station highlighting follows moved charades, and the booth backdrop and all shared-table stations are clickable', () => {
  const sim = new CrowdSimulation(INITIAL_SETTINGS);
  sim.setCharades('lower');
  const bounds = stationBounds(sim.stations.find(station => station.id === 'charades')!);
  assert.deepEqual({ x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 }, VENUE.charades.lower);
  const back = VENUE.obstacles.find(obstacle => obstacle.id === 'booth-back')!;
  const table = VENUE.obstacles.find(obstacle => obstacle.id === 'table')!;
  assert.equal(stationAt({ x: back.x + back.w - 6, y: back.y + 9 }, sim), 'photo');
  assert.equal(stationAt({ x: table.x + 48, y: table.y + 43 }, sim), 'demons');
  assert.equal(stationAt({ x: table.x + 228, y: table.y + 43 }, sim), 'hummus');
  assert.equal(stationAt({ x: table.x + 138, y: table.y + 103 }, sim), 'dessert');
});

test('every station has a compact gallery or one quiet empty state using supplied assets', () => {
  for (const station of STATIONS) {
    const story = getStationStory(station), images = getStoryImages(story);
    assert.equal(story.stationId, station.id);
    for (const image of images) if (image.src?.startsWith('/')) assert.ok(existsSync(resolve('public', image.src.slice(1))), `Missing asset: ${image.src}`);
    assert.equal(new Set(images.map(image => image.id)).size, images.length);
    const gallery = renderToStaticMarkup(createElement(StationGallery, { story, onOpen: () => {} }));
    if (images.every(image => image.src === null)) {
      assert.match(gallery, /No photos added yet/); assert.doesNotMatch(gallery, /<img/);
    } else {
      assert.equal((gallery.match(/<img /g) || []).length, 1);
      assert.match(gallery, /At the party/);
      assert.doesNotMatch(gallery, /Image not yet supplied/);
    }
    if (station.id === 'hummus') assert.match(gallery, /Inspiration/);
    assert.doesNotMatch(gallery, /<figcaption|design-process|story-source-note|story-reference/);
  }
});

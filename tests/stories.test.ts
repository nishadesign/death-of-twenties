import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { OVERVIEW, worldToScreen, screenToWorld } from '../src/rendering/camera';
import { stationBounds, containsPoint } from '../src/rendering/stationGeometry';
import { stationAt } from '../src/rendering/VenueRenderer';
import { STATIONS, VENUE, INITIAL_SETTINGS } from '../src/simulation/venue';
import { CrowdSimulation } from '../src/simulation/CrowdSimulation';
import { getStationStory, getStoryImages } from '../src/stories/manifest';
import PlannedBuiltComparison, { comparableImages } from '../src/components/PlannedBuiltComparison';
import DesignProcessTimeline from '../src/components/DesignProcessTimeline';

test('station hit-testing projection remains accurate at manual camera positions and viewport sizes', () => {
  for (const station of STATIONS) {
    assert.ok(containsPoint(stationBounds(station), station.point));
    for (const viewport of [{ width: 800, height: 500 }, { width: 360, height: 220 }]) {
      for (const camera of [OVERVIEW, { zoom: 1.6, center: { x: 430, y: 290 } }]) {
        const screen = worldToScreen(station.point, camera, viewport);
        const point = screenToWorld(screen, camera, viewport);
        assert.ok(Math.abs(point.x - station.point.x) < .00001);
        assert.ok(Math.abs(point.y - station.point.y) < .00001);
      }
    }
  }
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

test('every station has available assets or truthful placeholders and only documented process stages', () => {
  for (const station of STATIONS) {
    const story = getStationStory(station), images = getStoryImages(story);
    assert.equal(story.stationId, station.id);
    for (const image of images) if (image.src?.startsWith('/')) assert.ok(existsSync(resolve('public', image.src.slice(1))), `Missing asset: ${image.src}`);
    assert.equal(new Set(images.map(image => image.id)).size, images.length);
    const comparison = renderToStaticMarkup(createElement(PlannedBuiltComparison, { story, onOpen: () => {} }));
    assert.match(comparison, /Planned/); assert.match(comparison, /Built/);
    if (images.every(image => image.src === null)) { assert.match(comparison, /Image not yet supplied/); assert.doesNotMatch(comparison, /<img/); }
    const process = renderToStaticMarkup(createElement(DesignProcessTimeline, { story, onOpen: () => {} }));
    if (story.intention || story.plannedImages.some(image => image.src)) assert.match(process, /<h4>Imagine/);
    else assert.doesNotMatch(process, /<h4>Imagine/);
    if (story.builtImages.some(image => image.src)) assert.match(process, /<h4>Build/);
    else assert.doesNotMatch(process, /<h4>Build/);
    if (station.id === 'photo') {
      assert.match(process, /Change the drapes to black drapes/);
      assert.match(process, /<h4>Iterate/);
      assert.match(process, /Image not yet supplied/);
    } else assert.doesNotMatch(process, /<h4>Iterate/);
    assert.doesNotMatch(process, /<h4>Reflect/);
    if (images.every(image => !image.src) && !story.iterations.length) assert.equal(process, '');
    assert.equal(comparableImages(story), null);
  }
  const story = structuredClone(getStationStory(STATIONS[0]));
  story.plannedImages[0].src = '/test-concept.jpg'; story.builtImages[0].src = '/test-built.jpg';
  assert.equal(comparableImages(story), null, 'unrelated images do not get a slider automatically');
  story.comparison = { plannedId: story.plannedImages[0].id, builtId: story.builtImages[0].id };
  assert.ok(comparableImages(story));
});

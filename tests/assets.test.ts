import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { assetUrl } from '../src/assets';
import { STATIONS } from '../src/simulation/venue';
import { getStationStory, getStoryImages, VENUE_REFERENCE } from '../src/stories/manifest';

test('images and the home link stay inside the GitHub Pages project path', () => {
  const base = '/death-of-twenties/';
  assert.equal(assetUrl('', base), base);
  assert.equal(assetUrl('/venue-sketch.jpeg', base), `${base}venue-sketch.jpeg`);
  assert.equal(assetUrl('/stories/puri-banner.png', '/'), '/stories/puri-banner.png');
  const images = [VENUE_REFERENCE, ...STATIONS.flatMap(station => getStoryImages(getStationStory(station)))];
  for (const image of images) if (image.src) {
    const deployed = new URL(assetUrl(image.src, base), 'https://nishadesign.github.io');
    assert(deployed.pathname.startsWith(base));
    assert(existsSync(resolve('public', deployed.pathname.slice(base.length))), `Missing deployed asset ${deployed.pathname}`);
  }
});

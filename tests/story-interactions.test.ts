import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createCanvas, type Canvas } from '@napi-rs/canvas';
import { act, createElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../src/App';
import StationGallery from '../src/components/StationGallery';
import { getStationStory } from '../src/stories/manifest';
import { STATIONS } from '../src/simulation/venue';
import { useParty } from '../src/store';
import { createHash } from 'node:crypto';
import { OVERVIEW, worldToScreen } from '../src/rendering/camera';
import { stationBounds } from '../src/rendering/stationGeometry';
import { CHECKLIST_STORAGE_KEY } from '../src/components/ChecklistProgress';

// DOM-level interaction checks only: no browser, server or network requests.
function environment(mobile = false) {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'https://party.test/' });
  const win = dom.window;
  const frames = new Map<number, FrameRequestCallback>(); let frameId = 0;
  const previous = new Map<string, PropertyDescriptor | undefined>();
  const globals: Record<string, unknown> = {
    window: win, document: win.document, HTMLElement: win.HTMLElement, HTMLCanvasElement: win.HTMLCanvasElement,
    IS_REACT_ACT_ENVIRONMENT: true, devicePixelRatio: 1,
    requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: (id: number) => frames.delete(id),
    matchMedia: (query: string) => ({ matches: query.includes('max-width') && mobile, media: query, addEventListener() {}, removeEventListener() {} }),
    ResizeObserver: class { observe() {} disconnect() {} },
  };
  for (const [key, value] of Object.entries(globals)) { previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key)); Object.defineProperty(globalThis, key, { value, configurable: true, writable: true }); }
  win.HTMLElement.prototype.scrollTo = () => {};
  win.HTMLElement.prototype.getBoundingClientRect = () => ({ width: mobile ? 390 : 800, height: mobile ? 240 : 500, left: 0, top: 0, x: 0, y: 0, right: 800, bottom: 500, toJSON() {} });
  const canvases = new WeakMap<HTMLCanvasElement, Canvas>();
  Object.defineProperty(win.HTMLCanvasElement.prototype, 'getContext', { value: function(this: HTMLCanvasElement) { let canvas = canvases.get(this); if (!canvas) { canvas = createCanvas(800, 500); canvases.set(this, canvas); } return canvas.getContext('2d'); } });
  const captured = new WeakMap<Element, number>();
  win.Element.prototype.setPointerCapture = function(id) { captured.set(this, id); };
  win.Element.prototype.hasPointerCapture = function(id) { return captured.get(this) === id; };
  win.Element.prototype.releasePointerCapture = function() { captured.delete(this); };
  win.HTMLDialogElement.prototype.showModal = function() { this.open = true; (this.querySelector('[autofocus],button') as HTMLElement)?.focus(); };
  win.HTMLDialogElement.prototype.close = function() { this.open = false; };
  const root = createRoot(win.document.getElementById('root')!);
  const flush = async (now = performance.now()) => { await act(async () => { const queued = [...frames.values()]; frames.clear(); queued.forEach(callback => callback(now)); }); };
  const click = async (selector: string) => { const button = win.document.querySelector<HTMLButtonElement>(selector); assert.ok(button, selector); await act(async () => { button.focus(); button.click(); }); };
  return { dom, root, flush, click, cleanup: async () => { await act(async () => root.unmount()); win.close(); for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); } } };
}

test('Vibes controls switch and pause the lights independently of guest playback', async () => {
  const env = environment(), previous = useParty.getState();
  try {
    useParty.getState().setMode('venue');
    useParty.getState().setRunning(false);
    useParty.getState().setVibes({ enabled: true, rotating: true, intensity: .65 });
    const simulation = useParty.getState().simulation, elapsed = simulation.elapsed;
    const guests = JSON.stringify(simulation.guests);
    await act(async () => env.root.render(createElement(App)));
    let time = performance.now();
    const frame = async () => {
      await env.flush(time += 100);
      const context = document.querySelector('canvas')!.getContext('2d')!;
      return createHash('sha256').update(context.getImageData(0, 0, 800, 500).data).digest('hex');
    };
    assert.notEqual(await frame(), await frame(), 'lights rotate while guests are paused');
    await env.click('.vibes-rotation');
    assert.match(document.querySelector('.vibes-rotation')!.textContent!, /Resume rotation/);
    assert.equal(await frame(), await frame(), 'pausing rotation holds the current light position');
    await env.click('.vibes-rotation');
    assert.notEqual(await frame(), await frame());
    await env.click('[role="switch"][aria-label="Corner lights"]');
    assert.equal(document.querySelector('[aria-label="Corner lights"]')!.getAttribute('aria-checked'), 'false');
    assert.equal(document.querySelector<HTMLInputElement>('#vibes-glow')!.disabled, true);
    assert.equal(await frame(), await frame());
    await env.click('[aria-label="Corner lights"]');
    assert.equal(document.querySelector<HTMLInputElement>('#vibes-glow')!.disabled, false);
    assert.notEqual(await frame(), await frame());
    assert.equal(useParty.getState().simulation, simulation);
    assert.equal(simulation.elapsed, elapsed);
    assert.equal(JSON.stringify(simulation.guests), guests);
    assert.equal(useParty.getState().running, false);
  } finally { await env.cleanup(); useParty.setState(previous); }
});

test('all nine stories open over the unchanged venue, preserve playback and camera, and return keyboard focus', async () => {
  const env = environment();
  try {
    useParty.getState().reset(2030, { count: 25 }); useParty.getState().select(null);
    const simulation = useParty.getState().simulation;
    for (let i = 0; i < 100; i++) simulation.tick();
    useParty.getState().publish(); useParty.getState().setMode('heatmap');
    const before = JSON.stringify(simulation.guests), elapsed = simulation.elapsed;
    await act(async () => env.root.render(createElement(StrictMode, null, createElement(App))));
    await env.flush();
    // Set a non-default camera so a story cannot accidentally reset zoom or pan.
    await env.click('[aria-label="Zoom in"]');
    const canvas = document.querySelector('canvas')!;
    await act(async () => {
      for (const [type, x, y] of [['pointerdown', 300, 250], ['pointermove', 340, 270], ['pointerup', 340, 270]] as const) {
        canvas.dispatchEvent(new env.dom.window.MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y }));
      }
    });
    await env.flush();
    const sidebar = document.querySelector('.side-panel'), workspace = document.querySelector('.workspace');
    const cameraSnapshot = () => [...document.querySelectorAll<HTMLElement>('.canvas-story-button')].map(button => button.style.transform);
    const beforeCamera = cameraSnapshot(), beforeZoom = document.querySelector('.zoom-controls>span')?.textContent;
    assert.equal(beforeZoom, '120%');
    for (const station of STATIONS) {
      await env.click(`.station-row[data-station-id="${station.id}"]`);
      assert.ok(document.querySelector<HTMLDialogElement>('.station-story-modal')?.open);
      assert.equal(document.querySelector('.side-panel'), sidebar);
      assert.equal(document.querySelector('.workspace'), workspace);
      assert.equal(workspace?.className, 'workspace');
      await env.flush(performance.now() + 1000);
      assert.deepEqual(cameraSnapshot(), beforeCamera);
      assert.equal(document.querySelector('.zoom-controls>span')?.textContent, beforeZoom);
      assert.equal(document.querySelector('.story-heading h2')?.textContent, station.name);
      assert.equal(document.activeElement, document.querySelector('.story-heading h2'));
      assert.equal(document.querySelectorAll('.view-tabs button').length, 3);
      await env.click('[aria-label="Close station story"]'); await env.flush();
      assert.equal(document.querySelector('.station-story-modal'), null);
      assert.equal(document.activeElement, document.querySelector(`.station-row[data-station-id="${station.id}"]`));
      assert.deepEqual(cameraSnapshot(), beforeCamera);
    }
    await env.click('.canvas-story-button[data-station-id="photo"]');
    await env.click('[aria-label^="Next Station"]'); assert.equal(useParty.getState().selected, 'charades');
    await env.click('[aria-label^="Previous Station"]'); assert.equal(useParty.getState().selected, 'photo');
    assert.equal(document.querySelector('.design-process, .story-source-note, .story-reference, .planned-built'), null);
    assert.equal(document.querySelectorAll('.station-story-modal img').length, 2, 'Before shows the two supplied booth designs');
    assert.equal(document.querySelector('#station-before-tab')?.getAttribute('aria-selected'), 'true');
    assert.ok(document.querySelector('.station-checklist'));
    await env.click('#station-after-tab');
    assert.equal(document.querySelectorAll('.station-story-modal img').length, 8, 'After shows only party photo tiles');
    assert.equal(document.querySelector('.station-checklist'), null);
    await env.click('[aria-label="Next gallery image"]');
    await env.click('[aria-label^="Next Station"]');
    assert.match(document.querySelector('.station-gallery-empty')!.textContent!, /No before images added yet/);
    await env.click('[aria-label^="Previous Station"]');
    assert.equal(document.querySelector('.gallery-navigation>span')?.textContent, '1 / 2', 'a new station opens on Before at the first tile');
    assert.equal(document.querySelector('#station-before-tab')?.getAttribute('tabindex'), '0');
    await act(async () => document.querySelector('#station-before-tab')!.dispatchEvent(new env.dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
    assert.equal(document.activeElement?.id, 'station-after-tab');
    assert.equal(document.querySelector('#station-after-tab')?.getAttribute('aria-selected'), 'true');
    await act(async () => document.querySelector('#station-after-tab')!.dispatchEvent(new env.dom.window.KeyboardEvent('keydown', { key: 'Home', bubbles: true })));
    assert.equal(document.activeElement?.id, 'station-before-tab');
    await env.flush(performance.now() + 1000);
    assert.deepEqual(cameraSnapshot(), beforeCamera);
    await act(async () => document.querySelector('.station-story-modal')!.dispatchEvent(new env.dom.window.Event('cancel', { bubbles: true, cancelable: true })));
    assert.equal(useParty.getState().selected, null);
    await env.click('.canvas-story-button[data-station-id="photo"]');
    await act(async () => {
      const dialog = document.querySelector('.station-story-modal')!;
      dialog.dispatchEvent(new env.dom.window.MouseEvent('pointerdown', { bubbles: true }));
      dialog.dispatchEvent(new env.dom.window.MouseEvent('click', { bubbles: true }));
    });
    assert.equal(useParty.getState().selected, null, 'backdrop click closes the story');
    assert.equal(useParty.getState().simulation, simulation);
    assert.equal(simulation.elapsed, elapsed); assert.equal(JSON.stringify(simulation.guests), before);
    assert.equal(useParty.getState().settings.count, 25); assert.equal(useParty.getState().running, false); assert.equal(useParty.getState().mode, 'heatmap');
  } finally { await env.cleanup(); }
});

test('canvas clicks focus a story, playback continues, and nested image dismissal leaves the story open', async () => {
  const env = environment(true);
  try {
    useParty.getState().reset(40, { count: 30 }); useParty.getState().select(null); useParty.getState().setRunning(true);
    const simulation = useParty.getState().simulation;
    await act(async () => env.root.render(createElement(App))); await env.flush();
    const canvas = document.querySelector('canvas')!;
    const pointer = async (point: { x: number; y: number }, types: string[]) => {
      const screen = worldToScreen(point, OVERVIEW, { width: 390, height: 240 });
      await act(async () => {
        for (const type of types) canvas.dispatchEvent(new env.dom.window.MouseEvent(type, { bubbles: true, clientX: screen.x, clientY: screen.y, button: 0 }));
      });
    };
    await pointer({ x: 377, y: 427 }, ['pointermove', 'pointerdown', 'pointerup']);
    assert.equal(useParty.getState().selected, null, 'the gap between food trays does not open a story');
    assert.equal(document.querySelector('[role="tooltip"]'), null);
    const tray = stationBounds(simulation.stations.find(station => station.id === 'demons')!);
    const trayCenter = { x: tray.x + tray.w / 2, y: tray.y + tray.h / 2 };
    await pointer(trayCenter, ['pointermove']);
    assert.equal(document.querySelector('[role="tooltip"] strong')?.textContent, 'Side Eye');
    assert.doesNotMatch(document.querySelector('[role="tooltip"]')!.textContent!, /Explore the Story|Caprese/);
    assert.equal(canvas.getAttribute('aria-describedby'), document.querySelector('[role="tooltip"]')?.id);
    assert.equal(canvas.style.cursor, 'pointer');
    await act(async () => env.dom.window.dispatchEvent(new env.dom.window.KeyboardEvent('keydown', { key: 'Escape' })));
    assert.equal(document.querySelector('[role="tooltip"]'), null, 'Escape dismisses the name card');
    await pointer(trayCenter, ['pointermove']);
    await act(async () => canvas.dispatchEvent(new env.dom.window.MouseEvent('pointerout', { bubbles: true })));
    assert.equal(document.querySelector('[role="tooltip"]'), null, 'leaving a station dismisses the name card');
    const photoMarker = document.querySelector<HTMLButtonElement>('.canvas-story-button[data-station-id="photo"]')!;
    await act(async () => photoMarker.focus());
    assert.equal(document.querySelector('[role="tooltip"] strong')?.textContent, 'Department of Questionable Choices');
    assert.equal(photoMarker.getAttribute('aria-describedby'), document.querySelector('[role="tooltip"]')?.id);
    await act(async () => photoMarker.blur());
    assert.equal(document.querySelector('[role="tooltip"]'), null);
    await pointer(trayCenter, ['pointermove']);
    await pointer(trayCenter, ['pointerdown', 'pointerup']);
    assert.equal(useParty.getState().selected, 'demons', 'clicking a tray opens only that station');
    assert.equal(document.querySelector('[role="tooltip"]'), null, 'the name card clears when a story opens');
    await env.click('[aria-label="Close station story"]');
    await pointer(simulation.stations.find(station => station.id === 'photo')!.point, ['pointerdown', 'pointerup']);
    assert.equal(useParty.getState().selected, 'photo');
    assert.equal(document.body.style.overflow, 'hidden');
    await env.flush(performance.now() + 700);
    assert.ok(simulation.elapsed > 0); assert.equal(useParty.getState().running, true);
    const photoButton = document.querySelector<HTMLButtonElement>('.station-gallery .story-image-open')!;
    await env.click('.station-gallery .story-image-open');
    assert.ok(document.querySelector<HTMLDialogElement>('.image-lightbox')?.open);
    await act(async () => document.querySelector('.image-lightbox')!.dispatchEvent(new env.dom.window.Event('cancel', { bubbles: true, cancelable: true })));
    assert.equal(document.querySelector('.image-lightbox'), null); assert.equal(useParty.getState().selected, 'photo');
    assert.equal(document.activeElement, photoButton);
    await env.click('[aria-label="Close station story"]');
    assert.equal(document.body.style.overflow, '');
    assert.equal(useParty.getState().simulation, simulation); assert.equal(useParty.getState().running, true);
    assert.equal(useParty.getState().settings.count, 30);
  } finally { await env.cleanup(); }
});

test('the tile carousel navigates supplied images, skips missing assets and handles broken images', async () => {
  const env = environment();
  try {
    const story = getStationStory(STATIONS[0]);
    story.plannedImages = [{ id: 'missing', src: null, alt: 'Missing moodboard' }, { id: 'p1', src: '/test-1.jpg', alt: 'Test concept 1' }, { id: 'p2', src: '/test-2.jpg', alt: 'Test concept 2' }];
    story.builtImages = [{ id: 'b1', src: '/test-built.jpg', alt: 'Test built image' }];
    let opened = '';
    await act(async () => env.root.render(createElement(StationGallery, { key: 'after', images: story.builtImages, phase: 'After', onOpen: image => { opened = image.id; } })));
    await env.click('[aria-label="Enlarge Test built image"]'); assert.equal(opened, 'b1');
    assert.equal(document.querySelector('.gallery-navigation'), null, 'one image needs no paging controls');
    await act(async () => env.root.render(createElement(StationGallery, { key: 'before', images: story.plannedImages, phase: 'Before', onOpen: image => { opened = image.id; } })));
    await env.click('[aria-label="Enlarge Test concept 1"]'); assert.equal(opened, 'p1');
    assert.equal(document.querySelector('.gallery-navigation>span')?.textContent, '1 / 2');
    await env.click('[aria-label="Next gallery image"]');
    assert.ok(document.querySelector('[aria-label="Enlarge Test concept 2"]'));
    assert.equal(document.querySelector<HTMLInputElement>('[aria-label="Next gallery image"]')!.disabled, true, 'the last tile stops forward navigation');
    await env.click('[aria-label="Previous gallery image"]');
    assert.equal(document.querySelector('.gallery-navigation>span')?.textContent, '1 / 2');
    assert.equal(document.querySelectorAll('img').length, 2);
    assert.equal(document.querySelectorAll('[aria-roledescription="slide"]').length, 2);
    const rail = document.querySelector<HTMLElement>('.gallery-rail')!;
    Object.defineProperty(rail, 'clientWidth', { value: 600, configurable: true });
    document.querySelectorAll<HTMLElement>('.gallery-tile').forEach((tile, i) => {
      Object.defineProperty(tile, 'offsetLeft', { value: i * 372, configurable: true });
      Object.defineProperty(tile, 'offsetWidth', { value: 360, configurable: true });
    });
    await act(async () => { rail.scrollLeft = 132; rail.dispatchEvent(new env.dom.window.Event('scroll')); });
    assert.equal(document.querySelector('.gallery-navigation>span')?.textContent, '2 / 2', 'swiping the rail updates the active tile');
    await act(async () => rail.dispatchEvent(new env.dom.window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })));
    assert.equal(document.querySelector('.gallery-navigation>span')?.textContent, '1 / 2');
    assert.equal(document.activeElement, document.querySelector('[aria-label="Enlarge Test concept 1"]'));
    assert.equal(document.querySelector('figcaption'), null, 'long captions stay in the full image viewer');
    await act(async () => document.querySelector('img')!.dispatchEvent(new env.dom.window.Event('error')));
    assert.match(document.body.textContent!, /Image unavailable/);
    assert.equal(document.querySelector('[aria-label="Enlarge Test concept 1"]'), null);
    await env.click('[aria-label="Enlarge Test concept 2"]'); assert.equal(opened, 'p2', 'a failed tile does not break the others');
  } finally { await env.cleanup(); }
});


test('the party controls, insights and assumptions expose no waiting or queue UI', async () => {
  const env = environment(), previous = useParty.getState();
  try {
    useParty.getState().reset(2030); useParty.getState().select(null);
    await act(async () => env.root.render(createElement(App)));
    assert.equal(document.querySelector('.pulse-section, .night-consumption'), null);
    assert.doesNotMatch(document.querySelector('.side-panel')!.textContent!, /THE PULSE|THE NIGHT SO FAR/);
    const simulation = useParty.getState().simulation;
    const stationsToggle = document.querySelector<HTMLButtonElement>('.stations-collapse-toggle')!;
    const stationsContent = document.getElementById(stationsToggle.getAttribute('aria-controls')!)!;
    assert.equal(stationsToggle.getAttribute('aria-expanded'), 'true');
    await env.click('.stations-collapse-toggle');
    assert.equal(stationsToggle.getAttribute('aria-expanded'), 'false');
    assert.equal(stationsContent.hidden, true);
    await act(async () => useParty.getState().publish());
    await env.click('.canvas-story-button[data-station-id="puri"]');
    assert.equal(useParty.getState().selected, 'puri', 'canvas stories work while the station list is collapsed');
    await env.click('[aria-label="Close station story"]');
    assert.equal(stationsContent.hidden, true, 'browsing a station preserves the collapsed state');
    await env.click('.stations-collapse-toggle');
    assert.equal(stationsToggle.getAttribute('aria-expanded'), 'true');
    assert.equal(stationsContent.hidden, false);
    assert.equal(useParty.getState().simulation, simulation);
    const check = () => {
      assert.doesNotMatch(document.body.textContent!, /waiting|queue|avg\. cumulative wait|AT \/ WAIT/i);
      for (const row of document.querySelectorAll('.station-row')) assert.doesNotMatch(row.getAttribute('aria-label')!, /wait|queue/i);
    };
    check();
    await env.click('.run-summary-link'); check();
    await env.click('.modal .modal-close');
    await env.click('.help-button'); check();
    assert.equal(document.querySelectorAll('.station-row').length, 9);
  } finally { await env.cleanup(); useParty.setState(previous); }
});

test('the evening clock and timeline replay arrivals, charades and the empty starting room', async () => {
  const env = environment(), previous = useParty.getState();
  try {
    useParty.getState().reset(2030, { duration: 14400, count: 30, arrival: 'staggered', arrivalMinutes: 90, charades: 'center' });
    useParty.getState().select(null); useParty.getState().setSpeed(240);
    await act(async () => env.root.render(createElement(App)));
    assert.equal(document.querySelector('.time-value')?.textContent, '7:30 PM');
    assert.equal(document.querySelector('.speed-control [aria-pressed="true"]')?.textContent, '60s');
    await env.click('[aria-label="Jump to 9:00 PM: Most guests here"]');
    assert.equal(document.querySelector('.time-value')?.textContent, '9:00 PM');
    assert(useParty.getState().metrics.arrived >= 24);
    for (const seconds of [45, 90, 60]) {
      await env.click(`[aria-label="Play the full night in ${seconds} seconds"]`);
      assert.equal(useParty.getState().speed, 14400 / seconds);
      assert.equal(useParty.getState().metrics.elapsed, 5400, 'changing playback length preserves the moment');
    }
    assert(useParty.getState().metrics.drinks > 0 && useParty.getState().metrics.food > 0);
    assert.equal(useParty.getState().running, false);
    await env.click('[aria-label="Jump to 10:00 PM: Charades"]');
    assert.equal(document.querySelector('.night-timeline-heading strong')?.textContent, 'Charades');
    assert(useParty.getState().metrics.playing > 0);
    await env.click('[aria-label="Jump to 7:30 PM: Doors open"]');
    assert.equal(useParty.getState().metrics.total, 0);
    assert.equal(useParty.getState().metrics.food, 0);
    assert.equal(document.querySelector('.time-value')?.textContent, '7:30 PM');
  } finally { await env.cleanup(); useParty.setState(previous); }
});

test('Random mix and Shuffle arrivals create fresh couples-and-singles plans', async () => {
  const env = environment(), previous = useParty.getState();
  try {
    useParty.getState().reset(2030, { count: 30, duration: 14400, arrival: 'staggered' });
    useParty.getState().select(null);
    await act(async () => env.root.render(createElement(App)));
    const select = document.querySelector<HTMLSelectElement>('[aria-label="Arrival pattern"]')!;
    assert.equal(select.querySelector('option[value="random"]')?.textContent, 'Random mix');
    await act(async () => { select.value = 'random'; select.dispatchEvent(new env.dom.window.Event('change', { bubbles: true })); });
    assert.equal(useParty.getState().settings.arrival, 'random');
    assert.notEqual(useParty.getState().settings.seed, 2030);
    assert.match(document.querySelector('.arrival-mix p')!.textContent!, /\d+ couples · \d+ single friends/);
    const first = JSON.stringify(useParty.getState().simulation.guests.map(g => [g.group, g.arrival]));
    const seed = useParty.getState().settings.seed;
    await env.click('.arrival-mix button');
    assert.notEqual(useParty.getState().settings.seed, seed);
    assert.notEqual(JSON.stringify(useParty.getState().simulation.guests.map(g => [g.group, g.arrival])), first);
    assert.equal(useParty.getState().settings.arrival, 'random');
    assert.equal(useParty.getState().metrics.elapsed, 0);
  } finally { await env.cleanup(); useParty.setState(previous); }
});

test('preparation checkmarks persist across stations, resets and a fresh app mount', async () => {
  const env = environment(), previous = useParty.getState();
  try {
    useParty.getState().reset(2030); useParty.getState().select(null);
    await act(async () => env.root.render(createElement(App)));
    await env.click('.station-row[data-station-id="puri"]');
    const before = useParty.getState().simulation;
    assert.equal(document.querySelector('#station-before-tab')?.getAttribute('aria-selected'), 'true');
    assert.ok(document.querySelector('.station-gallery')!.compareDocumentPosition(document.querySelector('.station-checklist')!) & env.dom.window.Node.DOCUMENT_POSITION_FOLLOWING, 'the checklist follows the Before carousel');
    assert.equal(document.querySelectorAll('.station-checklist input[type="checkbox"]').length, 16);
    assert.equal(document.querySelector<HTMLDetailsElement>('.station-checklist')!.open, false);
    await env.click('.checklist-heading');
    assert.equal(document.querySelector<HTMLDetailsElement>('.station-checklist')!.open, true);
    await env.click('input[value="puri-shells"]');
    assert.equal(document.querySelector('.checklist-progress')?.textContent, '1 / 16 done');
    await env.click('.checklist-heading');
    assert.equal(document.querySelector<HTMLDetailsElement>('.station-checklist')!.open, false);
    assert.equal(document.querySelector('.checklist-progress')?.textContent, '1 / 16 done');
    assert.deepEqual(JSON.parse(env.dom.window.localStorage.getItem(CHECKLIST_STORAGE_KEY)!), ['puri-shells']);
    await env.click('#station-after-tab');
    assert.equal(document.querySelector('.station-checklist'), null);
    assert.equal(document.querySelectorAll('.gallery-tile').length, 3);
    await env.click('#station-before-tab');
    assert.equal(document.querySelector<HTMLInputElement>('input[value="puri-shells"]')!.checked, true, 'changing tabs preserves checkmarks');
    await env.click('[aria-label="Close station story"]');
    await env.click('.station-row[data-station-id="bar"]');
    assert.equal(document.querySelectorAll('.checklist-group').length, 2);
    assert.equal(document.querySelectorAll('.station-checklist input').length, 25);
    assert.equal(document.querySelector<HTMLInputElement>('input[value="margarita-tequila"]')!.checked, false);
    await env.click('.checklist-heading');
    await env.click('input[value="margarita-tequila"]');
    await env.click('input[value="last-drop-gin"]');
    assert.equal(document.querySelector('.checklist-progress')?.textContent, '2 / 25 done');
    assert.equal(useParty.getState().simulation, before, 'checking supplies does not change the simulation');
    await env.click('[aria-label="Close station story"]');
    await env.click('[aria-label="Reset simulation"]');
    await env.click('.station-row[data-station-id="puri"]');
    assert.equal(document.querySelector<HTMLInputElement>('input[value="puri-shells"]')!.checked, true);
    // A fresh provider mount reads local storage, just as a page reload would.
    await act(async () => env.root.render(null));
    await act(async () => env.root.render(createElement(App)));
    assert.equal(document.querySelector<HTMLInputElement>('input[value="puri-shells"]')!.checked, true);
    assert.match(document.querySelector('.checklist-save-note')!.textContent!, /Saved in this browser/);
    await env.click('.checklist-heading');
    await env.click('input[value="puri-shells"]');
    assert.deepEqual(JSON.parse(env.dom.window.localStorage.getItem(CHECKLIST_STORAGE_KEY)!), ['margarita-tequila', 'last-drop-gin']);
    await env.click('[aria-label="Close station story"]');
    await env.click('.station-row[data-station-id="charades"]');
    assert.equal(document.querySelector('.station-checklist'), null, 'no invented Charades checklist');
  } finally { await env.cleanup(); useParty.setState(previous); }
});

test('checklists remain usable for the current visit when browser storage is blocked', async () => {
  const env = environment(), previous = useParty.getState();
  try {
    Object.defineProperty(env.dom.window, 'localStorage', { configurable: true, get() { throw new Error('Storage unavailable'); } });
    useParty.getState().reset(2030); useParty.getState().select(null);
    await act(async () => env.root.render(createElement(App)));
    await env.click('.station-row[data-station-id="pizza"]');
    await env.click('.checklist-heading');
    await env.click('input[value="final-supper-pizzas"]');
    assert.equal(document.querySelector('.checklist-progress')?.textContent, '1 / 8 done');
    assert.match(document.querySelector('.checklist-save-note')!.textContent!, /this visit only/);
    await env.click('[aria-label="Close station story"]');
    await env.click('.station-row[data-station-id="pizza"]');
    assert.equal(document.querySelector<HTMLInputElement>('input[value="final-supper-pizzas"]')!.checked, true);
  } finally { await env.cleanup(); useParty.setState(previous); }
});

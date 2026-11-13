import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CrowdSimulation } from '../src/simulation/CrowdSimulation';
import { INITIAL_SETTINGS, MAX_GUESTS, STATIONS, VENUE } from '../src/simulation/venue';
import { distance, PathfindingEngine } from '../src/simulation/pathfinding';

test('the venue has all nine confirmed stations and every access point is walkable', () => {
  assert.deepEqual(STATIONS.map(s => s.id).sort(), ['bar', 'chaat', 'charades', 'demons', 'dessert', 'hummus', 'photo', 'pizza', 'puri']);
  for (const spacing of [9, 11, 14]) { const nav = new PathfindingEngine(Math.max(5, spacing * .48)); for (const station of STATIONS) assert(nav.valid(station.point), `${station.id}, spacing ${spacing}`); }
});

test('the food pair is perpendicular, with pani puri beside the sofa and both approaches in open space', () => {
  const puri = VENUE.obstacles.find(obstacle => obstacle.id === 'puri')!;
  const chaat = VENUE.obstacles.find(obstacle => obstacle.id === 'chaat')!;
  const sofa = VENUE.obstacles.find(obstacle => obstacle.id === 'sofa-left')!;
  assert(puri.w > puri.h && chaat.h > chaat.w, 'counters have perpendicular long axes');
  assert(puri.x + puri.w / 2 > chaat.x + chaat.w / 2, 'pani puri is on the right');
  assert(chaat.y >= puri.y + puri.h, 'chaat extends down the left arm of the L');
  assert(sofa.x >= puri.x + puri.w && sofa.x - (puri.x + puri.w) < 20, 'pani puri is beside the sofa');
  assert(puri.y < sofa.y + sofa.h && puri.y + puri.h > sofa.y, 'pani puri is aligned beside the sofa');
  const nav = new PathfindingEngine(14 * .48);
  for (const station of STATIONS.filter(station => ['puri', 'chaat'].includes(station.id))) {
    for (const point of [station.point]) assert(nav.valid(point), `${station.id} approach overlaps furniture`);
  }
});

test('the wall behind the shared food table blocks crossings while its serving sides remain accessible', () => {
  const wall = VENUE.obstacles.find(obstacle => obstacle.id === 'food-wall')!;
  const table = VENUE.obstacles.find(obstacle => obstacle.id === 'table')!;
  assert.equal(wall.y, table.y + table.h, 'the table sits flush against the wall with no gap');
  assert(wall.x <= table.x && wall.x + wall.w >= table.x + table.w, 'wall spans the shared table');
  for (const spacing of [9, 11, 14]) {
    const navigation = new PathfindingEngine(Math.max(5, spacing * .48));
    const center = { x: wall.x + wall.w / 2, y: wall.y + wall.h / 2 };
    assert(!navigation.valid(center));
    assert(!navigation.clear({ x: 129, y: wall.y - 20 }, { x: 129, y: wall.y + wall.h + 20 }), 'guests cannot cut through the house wall');
    for (const station of STATIONS.filter(station => ['demons', 'hummus', 'dessert'].includes(station.id))) {
      for (const point of [station.point]) assert(navigation.valid(point), `${station.id} approach is blocked`);
      for (const offset of [-spacing * 1.5, 0, spacing * 1.5]) {
        const point = station.id === 'dessert' ? { x: station.point.x, y: station.point.y + offset } : { x: station.point.x + offset, y: station.point.y };
        assert(navigation.valid(point), `${station.id} serving slot is blocked`);
      }
      const start = { x: table.x + table.w / 2, y: table.y - 60 };
      let previous = start;
      const path = navigation.find(start, station.point);
      assert(path.length, `route around the wall to ${station.id}`);
      for (const point of path) { assert(navigation.clear(previous, point)); previous = point; }
      assert(distance(previous, station.point) < 18);
    }
  }
});

test('the photo booth is recessed into a solid house nook with an accessible opening', () => {
  const photo = STATIONS.find(station => station.id === 'photo')!;
  for (const spacing of [9, 11, 14]) {
    const navigation = new PathfindingEngine(Math.max(5, spacing * .48));
    for (const id of ['nook-left', 'nook-right', 'nook-back', 'outside-lower-left']) {
      const wall = VENUE.obstacles.find(obstacle => obstacle.id === id)!;
      assert(!navigation.valid({ x: wall.x + wall.w / 2, y: wall.y + wall.h / 2 }), `${id} is not party floor`);
    }
    const opening = { x: 600, y: 519 };
    assert(navigation.valid(opening), 'the nook entrance stays open');
    assert(navigation.valid({ x: 719, y: 550 }), 'the restroom approach remains accessible');
    for (const point of [photo.point]) assert(navigation.valid(point), 'photo approach remains inside accessible floor');
    let previous = opening;
    const path = navigation.find(opening, photo.point);
    assert(path.length);
    for (const point of path) { assert(navigation.clear(previous, point), 'the booth is reached without crossing a nook wall'); previous = point; }
    assert(distance(previous, photo.point) < 18);
  }
});

test('the horizontal drinks slab extends right of the perpendicular Final Supper pizza slab', () => {
  const pizza = VENUE.obstacles.find(obstacle => obstacle.id === 'pizza')!;
  const bar = VENUE.obstacles.find(obstacle => obstacle.id === 'bar')!;
  const counter = VENUE.obstacles.find(obstacle => obstacle.id === 'counter')!;
  assert(bar.w > bar.h && pizza.h > pizza.w, 'drinks are horizontal and pizza is vertical');
  assert(bar.x + bar.w / 2 > pizza.x + pizza.w / 2, 'drinks sit to the right of the pizza');
  assert.equal(pizza.x, bar.x, 'the slabs share the left edge of the L');
  assert(bar.x + bar.w > pizza.x + pizza.w, 'the horizontal arm extends right');
  assert(bar.x + bar.w <= VENUE.boundary.x + VENUE.boundary.w, 'drinks fit inside the right wall');
  assert.equal(bar.y, pizza.y + pizza.h, 'drinks join the bottom edge of the vertical pizza slab');
  assert.equal(counter.y + counter.h, pizza.y, 'the slab connects to the kitchen counter');
  assert.equal(STATIONS.find(station => station.id === 'pizza')!.name, 'The Final Supper');
  const pizzaStation = STATIONS.find(station => station.id === 'pizza')!;
  const barStation = STATIONS.find(station => station.id === 'bar')!;
  assert(barStation.point.y > bar.y + bar.h, 'drinks serve below the horizontal slab toward the party');
  assert(barStation.point.x > bar.x && barStation.point.x < bar.x + bar.w);
  assert(pizzaStation.point.x < pizza.x, 'pizza serves left of the vertical slab toward the party');
  assert(pizzaStation.point.y > pizza.y && pizzaStation.point.y < pizza.y + pizza.h);
  for (const spacing of [9, 11, 14]) {
    const navigation = new PathfindingEngine(Math.max(5, spacing * .48));
    for (const station of STATIONS.filter(station => ['pizza', 'bar', 'hummus'].includes(station.id))) {
      for (const point of [station.point]) assert(navigation.valid(point), `${station.id} approach overlaps a counter or wall`);
    }
    for (const offset of [-spacing * 1.5, 0, spacing * 1.5]) {
      assert(navigation.valid({ x: barStation.point.x + offset, y: barStation.point.y }), 'drink service slots follow the horizontal edge');
      assert(navigation.valid({ x: pizzaStation.point.x, y: pizzaStation.point.y + offset }), 'pizza service slots follow the vertical edge');
    }
  }
});

test('A* finds obstacle-safe routes between every pair of stations', () => {
  const nav = new PathfindingEngine();
  for (const from of STATIONS) for (const to of STATIONS) {
    let start = from.point;
    const path = nav.find(start, to.point);
    assert(path.length, `${from.id} -> ${to.id}`);
    for (const p of path) { assert(nav.clear(start, p), `segment crosses furniture from ${from.id} to ${to.id}`); start = p; }
    assert(distance(start, to.point) < 18);
  }
  assert(!nav.valid({ x: 60, y: 350 }), 'patio access is excluded');
  assert(!nav.valid({ x: 870, y: 180 }), 'the unavailable kitchen remains inaccessible');
});

test('identical seed and settings replay identically; a different seed changes the party', () => {
  const a = new CrowdSimulation({ ...INITIAL_SETTINGS, duration: 1800 }), b = new CrowdSimulation({ ...INITIAL_SETTINGS, duration: 1800 }), c = new CrowdSimulation({ ...INITIAL_SETTINGS, duration: 1800, seed: 2031 });
  for (let i = 0; i < 1800; i++) { a.tick(); b.tick(); c.tick(); }
  assert.deepEqual(a.guests, b.guests);
  assert.deepEqual(a.metrics(), b.metrics());
  assert.notDeepEqual(a.guests.map(g => g.position), c.guests.map(g => g.position));
});

test('guests stay inside walkable geometry, visit stations, socialize, revisit and obey station capacity', () => {
  const sim = new CrowdSimulation({ ...INITIAL_SETTINGS, count: MAX_GUESTS, duration: 7200 });
  let stationSeen = false, socialSeen = false, repeatSeen = false;
  for (let i = 0; i < 14400; i++) {
    sim.tick();
    for (const g of sim.guests) { assert(sim.navigation.valid(g.position), `guest ${g.id} inside obstacle at ${JSON.stringify(g.position)}`); assert(['pending', 'moving', 'serving', 'socializing'].includes(g.state)); if (g.state === 'serving') stationSeen = true; if (g.state === 'socializing') socialSeen = true; if (Object.values(g.visits).some(v => v > 1)) repeatSeen = true; }
    for (const s of sim.stations) assert(sim.guests.filter(g => g.station === s.id && g.state === 'serving').length <= s.capacity, `capacity exceeded at ${s.id}`);
  }
  assert(stationSeen); assert(socialSeen); assert(repeatSeen);
  assert(sim.complete); assert.equal(sim.elapsed, 7200);
  const m = sim.metrics(); assert.equal(m.total, MAX_GUESTS); assert.equal(m.moving + m.socializing + m.serving, m.total);
  assert(m.peakDensity > 0);
  assert(m.stations.every(s => s.utilization >= 0 && s.utilization <= 100));
  assert(m.zones.some(z => z.congestedSeconds > 0));
});

test('staggered arrivals and runtime headcount changes have valid state', () => {
  const sim = new CrowdSimulation({ ...INITIAL_SETTINGS, count: 20, arrival: 'staggered', arrivalMinutes: 30 });
  for (let i = 0; i < 240; i++) sim.tick();
  assert(sim.metrics().total < 30);
  sim.setCount(30); assert.equal(sim.guests.length, 30); assert.equal(sim.settings.count, 30);
  for (let i = 0; i < 180; i++) sim.tick();
  sim.setCount(10); assert.equal(sim.guests.length, 10); assert(sim.metrics().total <= 10);
  sim.setCount(200); assert.equal(sim.guests.length, 30); assert.equal(sim.settings.count, 30);
  sim.setCount(1); assert.equal(sim.guests.length, 5);
});

test('disabling and repositioning charades releases guests and keeps destinations walkable', () => {
  const sim = new CrowdSimulation({ ...INITIAL_SETTINGS, count: MAX_GUESTS });
  for (let i = 0; i < 1800; i++) sim.tick();
  sim.setCharades('off'); assert(sim.guests.every(g => g.station !== 'charades'));
  for (let i = 0; i < 500; i++) sim.tick();
  assert(sim.guests.every(g => g.station !== 'charades'));
  for (const location of ['left', 'lower', 'center'] as const) {
    sim.setCharades(location);
    assert(sim.navigation.valid(sim.stations.find(s => s.id === 'charades')!.point));
    for (let i = 0; i < 100; i++) sim.tick();
    assert(sim.guests.every(g => sim.navigation.valid(g.position)));
  }
});

test('completed runs stop changing, preserve completed visits, and expose real scenario evidence', () => {
  const sim = new CrowdSimulation({ ...INITIAL_SETTINGS, count: MAX_GUESTS, duration: 120 });
  while (!sim.complete) sim.tick();
  const result = sim.result(), snapshot = JSON.stringify(sim.guests);
  for (let i = 0; i < 50; i++) sim.tick();
  assert.equal(JSON.stringify(sim.guests), snapshot);
  assert.equal(result.barCongested, sim.zoneStats.find(z => z.id === 'cocktails')!.congestedSeconds >= 60);
  assert.equal(result.count, MAX_GUESTS); assert.equal(result.seed, INITIAL_SETTINGS.seed);
  assert(Number.isFinite(result.efficiency));
});

test('station approaches do not trap moving guests on a shared destination', () => {
  const sim = new CrowdSimulation({ ...INITIAL_SETTINGS, count: MAX_GUESTS, duration: 14400 });
  const travel = new Map<number, number>();
  let maxTravel = 0;
  while (!sim.complete) {
    sim.tick();
    for (const g of sim.guests) {
      const seconds = g.state === 'moving' ? (travel.get(g.id) ?? 0) + .5 : 0;
      travel.set(g.id, seconds); maxTravel = Math.max(maxTravel, seconds);
      assert(sim.navigation.valid(g.position));
    }
  }
  assert(maxTravel < 240, `a guest spent ${maxTravel}s stuck on an approach`);
  assert(sim.guests.every(g => Object.values(g.visits).reduce((sum, n) => sum + n, 0) > 0), 'every guest eventually completes a visit');
  assert(sim.charadesRound > 0, 'groups start charades rounds');
});


test('guests join an open spot immediately and leave a busy station instead of lining up', () => {
  const sim = new CrowdSimulation({ ...INITIAL_SETTINGS, count: 5, capacityScale: .5 });
  for (const guest of sim.guests) guest.arrival = Infinity;
  const bar = sim.stations.find(station => station.id === 'bar')!;
  const [first, second] = sim.guests;
  first.state = 'moving'; first.station = 'bar'; first.position = { ...bar.point }; first.path = [];
  sim.tick();
  assert.equal(first.state, 'serving', 'an available spot is used on arrival');
  second.state = 'moving'; second.station = 'bar'; second.position = { x: bar.point.x, y: bar.point.y + 20 }; second.path = [];
  sim.tick();
  assert.notEqual(second.station, 'bar', 'a full station does not keep an arriving guest nearby');
  assert(['moving', 'socializing'].includes(second.state));
  assert.equal(sim.metrics().stations.find(station => station.id === 'bar')!.serving, 1);
});

test('guests mingle when all stations are occupied and metrics contain no wait tracking', () => {
  const sim = new CrowdSimulation({ ...INITIAL_SETTINGS, count: 10 });
  for (const guest of sim.guests) guest.arrival = Infinity;
  sim.stations.forEach((station, index) => {
    station.capacity = 1;
    Object.assign(sim.guests[index], { state: 'serving', station: station.id, serviceSlot: 0, position: { ...station.point }, path: [], dwell: 600 });
  });
  const guest = sim.guests[9], bar = sim.stations.find(station => station.id === 'bar')!;
  Object.assign(guest, { state: 'moving', station: 'bar', position: { ...bar.point }, path: [] });
  sim.tick();
  assert.equal(guest.station, null, 'the guest chooses to mingle');
  assert(['moving', 'socializing'].includes(guest.state));
  for (const stats of [sim.metrics(), sim.result(), ...sim.metrics().stations]) {
    for (const key of ['waiting', 'averageWait', 'peakQueue']) assert(!(key in stats), `${key} is removed`);
  }
});

test('nearby friends start a photo immediately while later arrivals continue exploring', () => {
  const sim = new CrowdSimulation({ ...INITIAL_SETTINGS, count: 5 });
  for (const guest of sim.guests) guest.arrival = Infinity;
  const photo = sim.stations.find(station => station.id === 'photo')!;
  sim.guests.slice(0, 3).forEach((guest, index) => {
    Object.assign(guest, { state: 'moving', station: 'photo', group: index < 2 ? 0 : 1, position: { x: photo.point.x + index * 15, y: photo.point.y }, path: [] });
  });
  sim.tick();
  assert.equal(sim.guests[0].state, 'serving');
  assert.equal(sim.guests[1].state, 'serving');
  assert.notEqual(sim.guests[0].serviceSlot, sim.guests[1].serviceSlot);
  assert.notEqual(sim.guests[2].station, 'photo', 'an ongoing photo has no line of guests waiting to join');
});

test('routing connects a guest near the table corner to a visible grid point', () => {
  const navigation = new PathfindingEngine(11 * .48);
  const start = { x: 527, y: 496 }, destination = { x: 166, y: 435 };
  assert(navigation.valid(start));
  let previous = start;
  const route = navigation.find(start, destination);
  assert(route.length);
  for (const point of route) { assert(navigation.clear(previous, point), 'every segment clears the actual table corner'); previous = point; }
  assert.deepEqual(previous, destination);
  const nearbyDestination = { x: 167, y: 435 };
  assert.deepEqual(navigation.find(start, nearbyDestination).at(-1), nearbyDestination, 'cached paths retain the exact destination');
});

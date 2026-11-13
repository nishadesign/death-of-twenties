import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CrowdSimulation, isInRoom } from '../src/simulation/CrowdSimulation';
import { INITIAL_SETTINGS, VENUE } from '../src/simulation/venue';
import { CHARADES_START, CHARADES_END, PARTY_DURATION, isFoodStation, partyTime, nightPhase } from '../src/simulation/night';
import { distance } from '../src/simulation/pathfinding';
import { useParty } from '../src/store';

const advance = (sim: CrowdSimulation, until: number) => { while (sim.elapsed < until) sim.tick(); };

test('the clock follows the host’s four-hour evening and most guests arrive in pairs by 9 PM', () => {
  const sim = new CrowdSimulation(INITIAL_SETTINGS);
  assert.equal(partyTime(0), '7:30 PM'); assert.equal(partyTime(CHARADES_START), '10:00 PM');
  assert.equal(partyTime(CHARADES_END), '10:45 PM'); assert.equal(partyTime(PARTY_DURATION), '11:30 PM');
  assert.equal(sim.elapsed, 0); assert.equal(sim.metrics().total, 0);
  const groups = new Map<number, typeof sim.guests>();
  for (const guest of sim.guests) groups.set(guest.group, [...(groups.get(guest.group) ?? []), guest]);
  assert([...groups.values()].filter(group => group.length === 2).flat().length > sim.guests.length / 2);
  for (const group of groups.values()) {
    assert.equal(new Set(group.map(g => g.arrival)).size, 1);
    assert.equal(new Set(group.map(g => g.departure)).size, 1);
  }
  advance(sim, 5 * 60); assert(sim.metrics().total > 0, 'early guests appear soon after doors open');
  advance(sim, 90 * 60); assert(sim.metrics().arrived >= 24, 'most guests are here by 9 PM');
  assert(sim.guests.some(g => g.arrival > 90 * 60), 'the schedule includes a few later arrivals');
});

test('guests get their first drink before food, consume finite stock and carry drinks and plates', () => {
  const sim = new CrowdSimulation(INITIAL_SETTINGS);
  let cup = false, plate = false;
  while (sim.elapsed < CHARADES_START - .5) {
    sim.tick();
    for (const g of sim.guests) {
      if (Object.keys(g.visits).some(id => isFoodStation(id as keyof typeof g.visits))) assert((g.visits.bar ?? 0) > 0, 'food follows the arrival drink');
      cup ||= g.drinkUntil > sim.elapsed; plate ||= g.plateUntil > sim.elapsed;
      assert(sim.navigation.valid(g.position));
    }
    for (const station of sim.stations) {
      const stock = sim.supply(station.id);
      assert(stock.remaining >= 0 && stock.consumed <= stock.initial);
    }
  }
  assert(cup && plate);
  assert(sim.guests.every(g => g.intro === 'free'), 'everyone completes drinks then a first bite');
  const m = sim.metrics();
  assert.equal(m.drinks, sim.guests.reduce((n, g) => n + (g.visits.bar ?? 0), 0));
  assert.equal(m.food, sim.guests.reduce((n, g) => n + Object.entries(g.visits).filter(([id]) => isFoodStation(id as keyof typeof g.visits)).reduce((sum, [, visits]) => sum + visits, 0), 0));
  assert(m.drinks >= 30 && m.food >= 30);
});

test('charades runs only from 10 to 10:45, then guests walk home by the close', () => {
  for (const seed of [2030, 42]) {
    const sim = new CrowdSimulation({ ...INITIAL_SETTINGS, seed });
    advance(sim, CHARADES_START - .5);
    assert(sim.guests.every(g => g.station !== 'charades')); assert.equal(sim.charadesRound, 0);
    advance(sim, CHARADES_START + 5 * 60);
    assert(sim.metrics().playing >= 15, 'friends gather to play and watch');
    assert(sim.charadesRound > 0); assert.equal(nightPhase(sim.elapsed, sim.settings), 'Charades');
    advance(sim, CHARADES_END);
    assert.equal(sim.metrics().playing, 0); assert(sim.guests.every(g => g.station !== 'charades'));
    let leavingSeen = false;
    while (!sim.complete) {
      sim.tick();
      for (const g of sim.guests) {
        leavingSeen ||= g.state === 'leaving';
        if (isInRoom(g)) assert(sim.navigation.valid(g.position));
        if (g.state === 'departed') assert(distance(g.position, VENUE.entry) < 12, 'guests leave through the doorway');
      }
    }
    assert(leavingSeen); assert.equal(sim.metrics().total, 0); assert.equal(sim.metrics().departed, 30);
    assert.equal(sim.metrics().arrived, 30); assert(sim.guests.every(g => g.state === 'departed'));
  }
});

test('empty platters and the bar do not over-serve or create waiting behavior', () => {
  const sim = new CrowdSimulation({ ...INITIAL_SETTINGS, foodPortions: 1, drinkServings: 5, charades: 'off' });
  advance(sim, 7200);
  assert.equal(sim.metrics().drinks, 5); assert.equal(sim.metrics().food, 6);
  assert.equal(sim.metrics().playing, 0);
  assert(sim.guests.every(g => ['pending', 'moving', 'socializing', 'serving'].includes(g.state)));
  assert(sim.stations.every(station => sim.supply(station.id).remaining === 0));
});

test('jumping backward and forward replays the same arrivals, consumption and activities', () => {
  const previous = useParty.getState();
  try {
    useParty.getState().reset(2030, INITIAL_SETTINGS);
    useParty.getState().setRunning(true);
    useParty.getState().seek(CHARADES_START + 300);
    const snapshot = JSON.stringify(useParty.getState().simulation.guests), metrics = useParty.getState().metrics;
    assert.equal(useParty.getState().running, false);
    useParty.getState().seek(0);
    assert.equal(useParty.getState().metrics.total, 0); assert.equal(useParty.getState().metrics.food, 0);
    useParty.getState().seek(CHARADES_START + 300);
    assert.equal(JSON.stringify(useParty.getState().simulation.guests), snapshot);
    assert.deepEqual(useParty.getState().metrics, metrics);
    useParty.getState().seek(PARTY_DURATION);
    assert.equal(useParty.getState().metrics.departed, 30);
  } finally { useParty.setState(previous); }
});

test('random arrivals mix only couples and single friends, with repeatable timing per seed', () => {
  const plan = (seed: number, count = 30) => {
    const sim = new CrowdSimulation({ ...INITIAL_SETTINGS, arrival: 'random', seed, count });
    const groups = [...new Set(sim.guests.map(g => g.group))].map(group => sim.guests.filter(g => g.group === group));
    assert(groups.some(group => group.length === 1));
    assert(groups.some(group => group.length === 2));
    assert(groups.every(group => group.length <= 2), 'no larger arrival groups');
    for (const group of groups) assert.equal(new Set(group.map(g => g.arrival)).size, 1, 'a couple arrives together');
    assert(new Set(groups.map(group => group[0].arrival)).size > 1, 'separate friends roll in at different times');
    assert.equal(sim.guests.length, count);
    return groups.map(group => ({ size: group.length, arrival: group[0].arrival }));
  };
  for (const count of [5, 15, 30]) for (const seed of [42, 2030, 991]) plan(seed, count);
  assert.deepEqual(plan(2030), plan(2030));
  assert.notDeepEqual(plan(2030), plan(42));
  const sim = new CrowdSimulation({ ...INITIAL_SETTINGS, arrival: 'random' });
  advance(sim, PARTY_DURATION);
  assert.equal(sim.metrics().departed, 30, 'the mixed-arrival party completes normally');
});

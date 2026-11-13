import { SeededRandom } from './random';
import { distance, PathfindingEngine } from './pathfinding';
import { clampGuestCount, STATIONS, VENUE } from './venue';
import { CHARADES_START, CHARADES_END, DEPARTURES_START, PARTY_DURATION, isFoodStation, isConsumable } from './night';

export const isInRoom = (g: Guest) => g.state !== 'pending' && g.state !== 'departed';
import type { Archetype, Guest, Hotspot, Metrics, Point, RunResult, Settings, Station, StationId, ZoneRecord } from './types';

export const FIXED_STEP = .5;
const archetypes: Archetype[] = ['Foodie', 'Social butterfly', 'Cocktail enthusiast', 'Photo booth regular', 'Game enthusiast', 'Wanderer'];
const clothing = ['#c49a57', '#8d9b85', '#ac6a5f', '#8e89ad', '#c5b8a0', '#688b98', '#806376', '#a68c77'];
const zones = (): ZoneRecord[] => [
  { id: 'food-corner', label: 'Upper-left food corner', point: { x: 225, y: 205 }, radius: 96, threshold: 7, peak: 0, congestedSeconds: 0 },
  { id: 'cocktails', label: 'Cocktail counter', point: { x: 795, y: 319 }, radius: 90, threshold: 7, peak: 0, congestedSeconds: 0 },
  { id: 'shared-table', label: 'Shared serving table', point: { x: 379, y: 447 }, radius: 151, threshold: 11, peak: 0, congestedSeconds: 0 },
  { id: 'photo-approach', label: 'Photo booth approach', point: { x: 650, y: 484 }, radius: 85, threshold: 6, peak: 0, congestedSeconds: 0 },
  { id: 'restroom-access', label: 'Restroom access', point: { x: 719, y: 530 }, radius: 50, threshold: 3, peak: 0, congestedSeconds: 0 },
  { id: 'center', label: 'Central circulation', point: VENUE.charades.center, radius: 100, threshold: 10, peak: 0, congestedSeconds: 0 },
  { id: 'entry', label: 'Entrance passage', point: { x: 805, y: 379 }, radius: 65, threshold: 6, peak: 0, congestedSeconds: 0 },
];
export class CrowdSimulation {
  settings: Settings;
  rng: SeededRandom;
  navigation: PathfindingEngine;
  guests: Guest[] = [];
  stations: Station[];
  elapsed = 0;
  zoneStats = zones();
  hotspots: Hotspot[] = [];
  peakDensity = 0;
  activeSeconds = 0;
  movingSeconds = 0;
  obstructedSeconds = 0;
  congestedGuestSeconds = 0;
  private sampleClock = 0;
  charadesRound = 0;
  private roundRemaining = 0;
  private buckets = new Map<string, Guest[]>();
  private nextGroup = 0;
  private counters = new Map<StationId, { occupied: number; visitors: number; consumed: number; initialStock: number }>();
  constructor(settings: Settings) {
    this.settings = { ...settings };
    this.rng = new SeededRandom(settings.seed);
    this.navigation = new PathfindingEngine(Math.max(5, settings.spacing * .48));
    this.stations = STATIONS.map(s => ({ ...s, point: s.id === 'charades' ? { ...VENUE.charades[settings.charades === 'off' ? 'center' : settings.charades] } : { ...s.point }, capacity: s.id === 'photo' || s.id === 'charades' ? s.capacity : Math.max(1, Math.round(s.capacity * settings.capacityScale)) }));
    for (const s of this.stations) this.counters.set(s.id, { occupied: 0, visitors: 0, consumed: 0, initialStock: s.id === 'bar' ? settings.drinkServings : isFoodStation(s.id) ? settings.foodPortions : 0 });
    this.setCount(settings.count);
  }
  get complete() { return this.elapsed >= this.settings.duration; }
  setCount(count: number) {
    count = clampGuestCount(count);
    this.settings.count = count;
    if (count < this.guests.length) { this.guests.splice(count); return; }
    while (this.guests.length < count) {
      const group = this.nextGroup++;
      // Guarantee both singles and couples in the mix, with their order randomized.
      const groupSize = this.settings.arrival === 'random'
        ? group === 1 ? 3 - this.guests.filter(g => g.group === 0).length : this.rng.pick([1, 2])
        : this.rng.pick([1, 2, 2, 2, 2, 2, 2, 3]);
      const rolling = this.settings.arrival === 'staggered' || this.settings.arrival === 'random';
      const arrival = this.elapsed > 0 ? this.elapsed + this.rng.range(0, 20) : group === 0 && rolling ? this.rng.range(60, 240) : this.settings.arrival === 'together' ? this.rng.range(0, 12) : rolling ? (this.rng.next() < .9 ? (this.rng.next() + this.rng.next()) / 2 * this.settings.arrivalMinutes * 60 : this.settings.arrivalMinutes * 60 + this.rng.range(60, 1200)) : (this.guests.length / count) * this.settings.arrivalMinutes * 60;
      const departure = this.rng.range(DEPARTURES_START, PARTY_DURATION - 120);
      const pairSpeed = this.settings.walkingSpeed * this.rng.range(.85, 1.1);
      for (let j = 0; j < groupSize && this.guests.length < count; j++) {
        const archetype = this.rng.pick(archetypes), preferences = {} as Record<StationId, number>;
        for (const s of this.stations) preferences[s.id] = this.rng.range(.6, 1.4) * (archetype === 'Foodie' && ['puri', 'chaat', 'hummus', 'demons', 'dessert', 'pizza'].includes(s.id) ? 2.2 : archetype === 'Cocktail enthusiast' && s.id === 'bar' || archetype === 'Photo booth regular' && s.id === 'photo' || archetype === 'Game enthusiast' && s.id === 'charades' ? 3 : 1);
        const position = { x: VENUE.entry.x - 11, y: VENUE.entry.y - 18 + j * 13 };
        this.guests.push({ id: this.guests.length, group, archetype, preferences, revisitProbability: this.rng.range(.3, .8), position, previousPosition: { ...position }, destination: { ...position }, path: [], state: 'pending', station: null, dwell: 0, arrival, departure, intro: 'drink', drinkUntil: 0, plateUntil: 0, lastDrinkAt: -Infinity, lastFoodAt: -Infinity, speed: pairSpeed, angle: Math.PI, clothing: this.rng.pick(clothing), hair: this.rng.pick(['#29221f', '#503a2b', '#b4986e', '#ddd0b5']), visits: {}, serviceSlot: -1, blocked: 0 });
      }
    }
  }
  setCharades(location: Settings['charades']) {
    this.settings.charades = location;
    const s = this.stations.find(s => s.id === 'charades')!;
    s.point = { ...VENUE.charades[location === 'off' ? 'center' : location] };
    for (const g of this.guests) if (g.station === 'charades') { g.station = null; this.chooseDestination(g); }
  }
  private go(g: Guest, destination: Point) {
    g.destination = this.navigation.valid(destination) ? { ...destination } : this.navigation.nearest(destination);
    g.path = this.navigation.find(g.position, g.destination);
  }
  private socialize(g: Guest) {
    const mate = this.guests.find(m => m.id !== g.id && m.group === g.group && m.state === 'socializing' && !m.path.length);
    const centers = [{ x: 377, y: 169 }, { x: 586, y: 331 }, { x: 823, y: 340 }, { x: 201, y: 412 }, { x: 585, y: 459 }];
    const other = this.guests.filter(m => m.state === 'socializing' && !m.path.length);
    const center = mate?.position ?? (other.length && this.rng.next() < .65 ? this.rng.pick(other).position : this.rng.pick(centers));
    const a = this.rng.range(0, Math.PI * 2), r = this.rng.range(17, 39);
    g.state = 'moving'; g.station = null; g.dwell = this.rng.range(70, g.archetype === 'Social butterfly' ? 360 : 200);
    this.go(g, { x: center.x + Math.cos(a) * r, y: center.y + Math.sin(a) * r });
  }
  get charadesActive() { return this.settings.charades !== 'off' && this.elapsed >= CHARADES_START && this.elapsed < CHARADES_END; }
  supply(id: StationId) {
    const stock = this.counters.get(id)!;
    return { initial: stock.initialStock, consumed: stock.consumed, remaining: Math.max(0, stock.initialStock - stock.consumed) };
  }
  private headTo(g: Guest, station: Station) {
    g.station = station.id; g.state = 'moving'; this.go(g, station.point);
  }
  private leave(g: Guest) {
    g.state = 'leaving'; g.station = null; g.serviceSlot = -1;
    this.go(g, VENUE.entry);
  }
  private finishVisit(g: Guest) {
    if (!g.station) return;
    const id = g.station;
    g.visits[id] = (g.visits[id] ?? 0) + 1;
    if (isConsumable(id)) {
      const stock = this.counters.get(id)!;
      stock.consumed = Math.min(stock.initialStock, stock.consumed + 1);
    }
    if (id === 'bar') {
      g.lastDrinkAt = this.elapsed; g.drinkUntil = this.elapsed + 15 * 60;
      if (g.intro === 'drink') g.intro = 'food';
    } else if (isFoodStation(id)) {
      g.lastFoodAt = this.elapsed; g.plateUntil = this.elapsed + 8 * 60;
      if (g.intro === 'food') g.intro = 'free';
    }
  }
  private hasRoom(station: Station) {
    const present = this.guests.filter(g => g.station === station.id && g.state === 'serving').length;
    if (isConsumable(station.id) && this.supply(station.id).remaining <= present) return false;
    return station.id === 'photo' ? present === 0 : present < station.capacity;
  }
  private chooseDestination(g: Guest) {
    g.serviceSlot = -1;
    if (this.elapsed >= g.departure) { this.leave(g); return; }
    // New arrivals get a drink, then a first bite. Busy spots send them to chat and try later.
    if (g.intro === 'drink') {
      const bar = this.stations.find(s => s.id === 'bar')!;
      if (this.supply('bar').remaining === 0) g.intro = 'food';
      else if (this.hasRoom(bar)) { this.headTo(g, bar); return; }
      else { this.socialize(g); g.dwell = this.rng.range(20, 50); return; }
    }
    if (g.intro === 'food' && !this.stations.some(s => isFoodStation(s.id) && this.supply(s.id).remaining > 0)) g.intro = 'free';
    if (g.intro === 'free' && this.charadesActive && g.id % 5 !== 0) { this.headTo(g, this.stations.find(s => s.id === 'charades')!); return; }
    if (g.intro === 'free' && this.rng.next() < (g.archetype === 'Social butterfly' ? .8 : .65)) { this.socialize(g); return; }
    const mate = this.guests.find(m => m.group === g.group && m.id !== g.id && m.station && (m.state === 'moving' || m.state === 'serving'));
    const scored = this.stations.filter(s => {
      if (s.id === 'charades' && !this.charadesActive) return false;
      if (g.intro === 'food' && !isFoodStation(s.id)) return false;
      if (g.intro === 'free' && s.id === 'bar' && this.elapsed - g.lastDrinkAt < 25 * 60) return false;
      if (g.intro === 'free' && isFoodStation(s.id) && this.elapsed - g.lastFoodAt < 12 * 60) return false;
      return this.hasRoom(s);
    }).map(s => {
      const visits = g.visits[s.id] ?? 0;
      const timedDemand = s.id === 'dessert' ? .2 + 1.5 * Math.min(1, this.elapsed / CHARADES_START) : 1;
      const localDensity = this.guests.filter(m => isInRoom(m) && distance(m.position, s.point) < 65).length;
      const repeat = visits ? (s.id === 'bar' ? 1.15 : g.revisitProbability) / (1 + visits * .18) : 1.3;
      const social = mate?.station === s.id ? 3 : 1;
      const weight = s.popularity * g.preferences[s.id] * timedDemand * repeat * social / ((1 + distance(g.position, s.point) / 850) * (1 + localDensity * .035));
      return { s, weight };
    });
    if (!scored.length) { this.socialize(g); if (g.intro !== 'free') g.dwell = this.rng.range(20, 50); return; }
    let draw = this.rng.next() * scored.reduce((a, b) => a + b.weight, 0);
    this.headTo(g, scored.find(a => (draw -= a.weight) <= 0)?.s ?? scored[0].s);
  }
  private rebuildBuckets() {
    this.buckets.clear();
    for (const g of this.guests) if (isInRoom(g)) { const key = `${Math.floor(g.position.x / 35)},${Math.floor(g.position.y / 35)}`; const bucket = this.buckets.get(key); if (bucket) bucket.push(g); else this.buckets.set(key, [g]); }
  }
  private neighbors(p: Point): Guest[] {
    const x = Math.floor(p.x / 35), y = Math.floor(p.y / 35), result: Guest[] = [];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const b = this.buckets.get(`${x + dx},${y + dy}`); if (b) result.push(...b); }
    return result;
  }
  private move(g: Guest, dt: number) {
    if (!g.path.length) return;
    let target = g.path[0], d = distance(g.position, target);
    // Local avoidance can displace an agent outside the clear segment near a corner.
    if (!this.navigation.clear(g.position, target)) { this.go(g, g.destination); if (!g.path.length) return; target = g.path[0]; d = distance(g.position, target); }
    if (d < 4) { if (this.navigation.clear(g.position, target)) g.position = { ...target }; g.path.shift(); return; }
    const neighbors = this.neighbors(g.position).filter(n => n.id !== g.id && distance(n.position, g.position) < 29);
    const velocity = Math.min(d, g.speed * dt / (1 + neighbors.length * .13));
    let dx = (target.x - g.position.x) / d * velocity, dy = (target.y - g.position.y) / d * velocity;
    for (const n of neighbors) {
      const dist = distance(g.position, n.position), spacing = this.settings.spacing * 1.1;
      if (dist > .01 && dist < spacing) { dx += (g.position.x - n.position.x) / dist * (spacing - dist) * .45; dy += (g.position.y - n.position.y) / dist * (spacing - dist) * .45; }
    }
    const next = { x: g.position.x + dx, y: g.position.y + dy };
    if (this.navigation.clear(g.position, next)) { const progress = d - distance(next, target); g.position = next; g.angle = Math.atan2(dy, dx); g.blocked = progress < velocity * .12 ? g.blocked + dt : 0; }
    else { g.blocked += dt; const direct = { x: g.position.x + (target.x - g.position.x) / d * velocity, y: g.position.y + (target.y - g.position.y) / d * velocity }; if (this.navigation.clear(g.position, direct)) g.position = direct; if (g.blocked > 3) this.go(g, g.destination); }
    if (g.blocked > 4 && (g.state === 'moving' || g.state === 'leaving')) {
      // Step around a stationary group, then rejoin an obstacle-safe A* route.
      const heading = Math.atan2(target.y - g.position.y, target.x - g.position.x);
      for (const side of [1, -1]) {
        const waypoint = { x: g.position.x + Math.cos(heading + side * Math.PI / 2) * 30, y: g.position.y + Math.sin(heading + side * Math.PI / 2) * 30 };
        if (this.navigation.clear(g.position, waypoint) && !neighbors.some(n => distance(n.position, waypoint) < this.settings.spacing)) { g.path = [waypoint, ...this.navigation.find(waypoint, g.destination)]; break; }
      }
      g.blocked = 0;
    }
    this.movingSeconds += dt;
    if (neighbors.length >= 4 || g.blocked) this.obstructedSeconds += dt;
  }
  private arrive(g: Guest) {
    if (!g.station) { g.state = 'socializing'; return; }
    const station = this.stations.find(s => s.id === g.station)!;
    const present = this.guests.filter(m => m.station === station.id && m.state === 'serving');
    const slot = Array.from({ length: station.capacity }, (_, i) => i).find(i => !present.some(m => m.serviceSlot === i));
    if (station.id === 'charades') {
      if (!this.charadesActive) { this.chooseDestination(g); return; }
      const angle = (slot ?? (present.length + g.id)) * 2.39996;
      if (slot === undefined) { g.state = 'socializing'; g.dwell = Math.max(1, CHARADES_END - this.elapsed); this.go(g, { x: station.point.x + Math.cos(angle) * (84 + g.id % 3 * 10), y: station.point.y + Math.sin(angle) * (84 + g.id % 3 * 10) }); }
      else { this.serve(g, station, slot); this.go(g, { x: station.point.x + Math.cos(angle) * 52, y: station.point.y + Math.sin(angle) * 52 }); }
      return;
    }
    // A busy spot is a reason to explore elsewhere; guests never form a line.
    if (slot === undefined || !this.hasRoom(station)) { this.chooseDestination(g); return; }
    if (station.id === 'photo') {
      // Start immediately with nearby friends; nobody joins a photo already in progress.
      const friends = this.guests.filter(m => m.id !== g.id && m.group === g.group && m.station === 'photo' && m.state === 'moving' && distance(m.position, station.point) < 50);
      const duration = this.rng.range(...station.service) * this.settings.serviceScale;
      [g, ...friends].slice(0, station.capacity).forEach((guest, index) => this.serve(guest, station, index, duration));
    } else this.serve(g, station, slot);
  }
  private serve(g: Guest, s: Station, slot = 0, sessionDuration?: number) {
    this.counters.get(s.id)!.visitors++;
    g.serviceSlot = slot; g.state = 'serving'; g.dwell = s.id === 'charades' ? Math.max(1, CHARADES_END - this.elapsed) : sessionDuration ?? this.rng.range(...s.service) * this.settings.serviceScale;
    const offset = (slot - (s.capacity - 1) / 2) * this.settings.spacing * 1.5;
    const vertical = ['pizza', 'chaat', 'dessert'].includes(s.id);
    this.go(g, { x: s.point.x + (vertical ? 0 : offset), y: s.point.y + (vertical ? offset : 0) });
  }
  tick(dt = FIXED_STEP) {
    if (this.complete) return;
    const before = this.elapsed;
    dt = Math.min(dt, this.settings.duration - this.elapsed); this.elapsed += dt;
    for (const g of this.guests) g.previousPosition = { ...g.position };
    this.rebuildBuckets();
    if (before < CHARADES_START && this.charadesActive) {
      for (const g of this.guests) if (isInRoom(g) && g.state !== 'leaving' && g.id % 5 !== 0) this.headTo(g, this.stations.find(s => s.id === 'charades')!);
    }
    if (before < CHARADES_END && this.elapsed >= CHARADES_END) {
      for (const g of this.guests) if (g.station === 'charades') { this.finishVisit(g); g.station = null; this.chooseDestination(g); }
    }
    const players = this.guests.filter(g => g.station === 'charades' && g.state === 'serving');
    if (players.length >= 5) {
      this.roundRemaining -= dt;
      if (this.roundRemaining <= 0) {
        this.charadesRound++; this.roundRemaining = this.rng.range(180, 300);
        const center = this.stations.find(s => s.id === 'charades')!.point;
        // A new performer rotates into the center; others gather around them.
        players.forEach((g, i) => { const angle = i * Math.PI * 2 / players.length; this.go(g, i === this.charadesRound % players.length ? center : { x: center.x + Math.cos(angle) * 56, y: center.y + Math.sin(angle) * 56 }); });
      }
    }
    for (const g of this.guests) {
      if (g.state === 'departed') continue;
      if (g.state === 'pending') {
        if (this.elapsed >= g.arrival && !this.neighbors(g.position).some(n => distance(n.position, g.position) < this.settings.spacing)) this.chooseDestination(g);
        continue;
      }
      this.activeSeconds += dt;
      if (this.elapsed >= g.departure && g.state !== 'leaving') this.leave(g);
      if (g.state === 'leaving') {
        if (distance(g.position, VENUE.entry) < 12) { g.state = 'departed'; g.path = []; }
        else this.move(g, dt);
        continue;
      }
      // Join the approach before separation traps guests at one exact destination.
      if (g.state === 'moving' && g.station && distance(g.position, this.stations.find(s => s.id === g.station)!.point) < (g.station === 'charades' ? 105 : 32)) { g.path = []; this.arrive(g); }
      if (g.state === 'moving' && !g.station && distance(g.position, g.destination) < this.settings.spacing * 1.3) { g.path = []; g.state = 'socializing'; }
      if (g.state === 'socializing' && distance(g.position, g.destination) < this.settings.spacing * 1.3) g.path = [];
      if (g.state === 'serving' && distance(g.position, g.destination) < this.settings.spacing) g.path = [];
      if (g.path.length) { this.move(g, dt); continue; }
      if (g.state === 'moving') this.arrive(g);
      else if (g.state === 'serving' || g.state === 'socializing') {
        g.dwell -= dt;
        if (g.dwell <= 0) { this.finishVisit(g); this.chooseDestination(g); }
      }
    }
    for (const station of this.stations) this.counters.get(station.id)!.occupied += this.guests.filter(g => g.station === station.id && g.state === 'serving').length * dt;
    this.sampleClock += dt;
    if (this.sampleClock >= 5 || this.complete) { this.sample(this.sampleClock); this.sampleClock = 0; }
  }
  private sample(interval: number) {
    const active = this.guests.filter(isInRoom), congested = new Set<number>();
    this.hotspots = [];
    for (const z of this.zoneStats) {
      const inside = active.filter(g => distance(g.position, z.point) < z.radius);
      z.peak = Math.max(z.peak, inside.length);
      if (inside.length >= z.threshold) {
        z.congestedSeconds += interval; inside.forEach(g => congested.add(g.id));
        const description: Record<string, string> = { 'food-corner': 'Guests are crowding the shared approach to the two food stations.', cocktails: 'The bar approach is busy. Watch the route toward the entrance.', 'shared-table': 'Serving and passing guests are sharing the table perimeter.', 'photo-approach': 'Guests around the photo booth are crowding the main circulation route.', 'restroom-access': 'Guests are gathering in the narrow restroom approach.', center: 'A gathering is reducing the space available for crossing the room.', entry: 'Arrivals and passing guests are meeting at the entrance.' };
        this.hotspots.push({ id: z.id, title: z.label, message: description[z.id], point: z.point, count: inside.length, severity: inside.length >= z.threshold * 1.4 ? 'high' : 'moderate' });
      }
    }
    // Local guest count in a 55 drawing-unit radius; deliberately not people/m².
    for (const g of active) this.peakDensity = Math.max(this.peakDensity, active.filter(n => distance(g.position, n.position) < 55).length);
    this.congestedGuestSeconds += congested.size * interval;
  }
  metrics(): Metrics {
    const active = this.guests.filter(isInRoom);
    const arrived = this.guests.filter(g => g.state !== 'pending').length;
    const departed = this.guests.filter(g => g.state === 'departed').length;
    return { elapsed: this.elapsed, total: active.length, arrived, departed, departing: active.filter(g => g.state === 'leaving').length, drinks: this.supply('bar').consumed, food: this.stations.filter(s => isFoodStation(s.id)).reduce((n, s) => n + this.supply(s.id).consumed, 0), playing: active.filter(g => g.station === 'charades').length, moving: active.filter(g => g.state === 'moving' || g.state === 'leaving').length, socializing: active.filter(g => g.state === 'socializing').length, serving: active.filter(g => g.state === 'serving').length, peakDensity: this.peakDensity, efficiency: this.movingSeconds ? Math.max(0, 1 - this.obstructedSeconds / this.movingSeconds) * 100 : 100, congestedMinutes: this.congestedGuestSeconds / Math.max(1, arrived) / 60, stations: this.stations.map(s => { const c = this.counters.get(s.id)!; return { id: s.id, consumed: c.consumed, initialStock: c.initialStock, remaining: this.supply(s.id).remaining, serving: active.filter(g => g.station === s.id && g.state === 'serving').length, visitors: c.visitors, utilization: this.elapsed ? c.occupied / (s.capacity * this.elapsed) * 100 : 0 }; }), hotspots: this.hotspots.map(h => ({ ...h })), zones: this.zoneStats.map(z => ({ ...z })), complete: this.complete };
  }
  result(): RunResult {
    const m = this.metrics();
    const enabled = m.stations.filter(s => s.id !== 'charades' || this.settings.charades !== 'off');
    return { count: this.settings.count, seed: this.settings.seed, peakDensity: m.peakDensity, congestedMinutes: m.congestedMinutes, efficiency: m.efficiency, utilization: enabled.reduce((v, s) => v + s.utilization, 0) / enabled.length, barCongested: this.zoneStats.find(z => z.id === 'cocktails')!.congestedSeconds >= 60, stations: m.stations, zones: m.zones };
  }
}

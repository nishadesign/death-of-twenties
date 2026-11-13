import { VENUE } from './venue';
import type { Point } from './types';
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export class PathfindingEngine {
  readonly cell = 12;
  readonly columns = Math.ceil(VENUE.width / this.cell);
  readonly rows = Math.ceil(VENUE.height / this.cell);
  readonly walkable: Uint8Array;
  readonly cache = new Map<string, Point[]>();
  constructor(readonly radius = 6) {
    this.walkable = new Uint8Array(this.columns * this.rows);
    for (let i = 0; i < this.walkable.length; i++) this.walkable[i] = this.valid(this.point(i)) ? 1 : 0;
  }
  valid(p: Point) {
    const b = VENUE.boundary, r = this.radius;
    return p.x >= b.x + r && p.x <= b.x + b.w - r && p.y >= b.y + r && p.y <= b.y + b.h - r && !VENUE.obstacles.some(o => p.x > o.x - r && p.x < o.x + o.w + r && p.y > o.y - r && p.y < o.y + o.h + r);
  }
  point(i: number): Point { return { x: (i % this.columns + .5) * this.cell, y: (Math.floor(i / this.columns) + .5) * this.cell }; }
  index(p: Point) { return Math.floor(p.y / this.cell) * this.columns + Math.floor(p.x / this.cell); }
  nearest(p: Point): Point {
    const idx = this.index(p);
    if (this.walkable[idx]) return this.point(idx);
    let best = -1, d = Infinity;
    for (let i = 0; i < this.walkable.length; i++) if (this.walkable[i]) { const v = distance(p, this.point(i)); if (v < d) { best = i; d = v; } }
    return this.point(best);
  }
  clear(a: Point, b: Point) {
    if (!this.valid(a) || !this.valid(b)) return false;
    // Test the whole segment against inflated furniture, including tight corners.
    for (const o of VENUE.obstacles) {
      let enter = 0, leave = 1;
      for (const [origin, delta, min, max] of [
        [a.x, b.x - a.x, o.x - this.radius + 1e-7, o.x + o.w + this.radius - 1e-7],
        [a.y, b.y - a.y, o.y - this.radius + 1e-7, o.y + o.h + this.radius - 1e-7],
      ]) {
        if (Math.abs(delta) < 1e-10) { if (origin < min || origin > max) { enter = 2; break; } }
        else { const first = (min - origin) / delta, last = (max - origin) / delta; enter = Math.max(enter, Math.min(first, last)); leave = Math.min(leave, Math.max(first, last)); }
      }
      if (enter <= leave) return false;
    }
    return true;
  }
  private visibleAnchor(p: Point) {
    const nearest = this.nearest(p);
    if (this.clear(p, nearest)) return nearest;
    let best = nearest, d = Infinity;
    for (let i = 0; i < this.walkable.length; i++) if (this.walkable[i]) {
      const candidate = this.point(i), length = distance(p, candidate);
      if (length < d && this.clear(p, candidate)) { best = candidate; d = length; }
    }
    return best;
  }
  find(start: Point, destination: Point): Point[] {
    const dest = this.valid(destination) ? destination : this.nearest(destination);
    if (this.clear(start, dest)) return [{ ...dest }];
    const s = this.index(this.visibleAnchor(start)), end = this.index(this.visibleAnchor(dest)), key = `${s}:${end}:${dest.x}:${dest.y}`;
    const cached = this.cache.get(key);
    if (cached && this.clear(start, cached[0])) return cached.map(p => ({ ...p }));
    const size = this.walkable.length, cost = new Float64Array(size).fill(Infinity), parent = new Int32Array(size).fill(-1), closed = new Uint8Array(size);
    cost[s] = 0;
    const open: number[] = [s];
    while (open.length) {
      let best = 0;
      for (let j = 1; j < open.length; j++) if (cost[open[j]] + distance(this.point(open[j]), dest) < cost[open[best]] + distance(this.point(open[best]), dest)) best = j;
      const current = open.splice(best, 1)[0];
      if (current === end) {
        const raw: Point[] = [dest]; let cursor = end;
        while (cursor !== s && cursor !== -1) { raw.unshift(this.point(cursor)); cursor = parent[cursor]; }
        raw.unshift(this.point(s));
        const path: Point[] = []; let from = start;
        while (raw.length) { let next = raw.length - 1; while (next > 0 && !this.clear(from, raw[next])) next--; from = raw[next]; path.push(from); raw.splice(0, next + 1); }
        if (this.cache.size > 6000) this.cache.clear();
        this.cache.set(key, path); return path.map(p => ({ ...p }));
      }
      closed[current] = 1;
      const cx = current % this.columns, cy = Math.floor(current / this.columns);
      for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const nx = cx + dx, ny = cy + dy, n = ny * this.columns + nx;
        if (nx < 0 || nx >= this.columns || ny < 0 || ny >= this.rows || !this.walkable[n] || closed[n]) continue;
        if (dx && dy && (!this.walkable[cy * this.columns + nx] || !this.walkable[ny * this.columns + cx])) continue;
        const alt = cost[current] + this.cell * (dx && dy ? Math.SQRT2 : 1);
        if (alt < cost[n]) { cost[n] = alt; parent[n] = current; if (!open.includes(n)) open.push(n); }
      }
    }
    return [];
  }
}

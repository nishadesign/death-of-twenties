import type { Point, Rect, Station } from '../simulation/types';
import { VENUE } from '../simulation/venue';

const obstacle = (id: string) => VENUE.obstacles.find(item => item.id === id)!;

// Follow the visible station surface, not the space where guests approach it.
// Rendering and picking share these shapes; simulation obstacles stay unchanged.
export function stationBounds(station: Station): Rect & { radius: number } {
  const { id, point } = station;
  if (id === 'charades') return { id, x: point.x - 74, y: point.y - 74, w: 148, h: 148, radius: 74 };
  if (id === 'photo') {
    const left = obstacle('booth-left'), right = obstacle('booth-right'), back = obstacle('booth-back');
    return { id, x: left.x, y: left.y, w: right.x + right.w - left.x, h: back.y + back.h - left.y, radius: 3 };
  }
  if (id === 'hummus' || id === 'demons' || id === 'dessert') {
    const table = obstacle('table');
    if (id === 'dessert') return { id, x: table.x + 78, y: table.y + 84, w: 122, h: 25, radius: 9 };
    return { id, x: table.x + (id === 'demons' ? 21 : 161), y: table.y + 16, w: 96, h: 49, radius: 9 };
  }
  return { ...obstacle(id), radius: id === 'puri' || id === 'chaat' ? 6 : 0 };
}

export function stationMarker(station: Station): Point {
  const bounds = stationBounds(station);
  switch (station.id) {
    case 'charades': return { x: station.point.x, y: bounds.y };
    case 'photo': return { x: bounds.x - 9, y: bounds.y + 14 };
    case 'puri': return { x: bounds.x + bounds.w / 2, y: bounds.y - 18 };
    case 'chaat': return { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h + 18 };
    case 'bar': return { x: bounds.x - 12, y: bounds.y + 15 };
    case 'pizza': return { x: bounds.x - 23, y: bounds.y + 40 };
    case 'demons': return { x: bounds.x - 8, y: bounds.y - 5 };
    case 'hummus': return { x: bounds.x + bounds.w + 8, y: bounds.y - 5 };
    case 'dessert': return { x: bounds.x - 15, y: bounds.y + 13 };
  }
}

export function stationContainsPoint(station: Station, point: Point) {
  const bounds = stationBounds(station), marker = stationMarker(station);
  if (Math.hypot(point.x - marker.x, point.y - marker.y) <= 10) return true;
  if (!containsPoint(bounds, point)) return false;
  const { x, y, w, h, radius } = bounds;
  const nearestX = Math.max(x + radius, Math.min(x + w - radius, point.x));
  const nearestY = Math.max(y + radius, Math.min(y + h - radius, point.y));
  return Math.hypot(point.x - nearestX, point.y - nearestY) <= radius;
}

export function containsPoint(rect: Rect, point: Point) {
  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}

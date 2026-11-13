import type { Point, Rect, Station } from '../simulation/types';
import { VENUE } from '../simulation/venue';

// Presentation bounds are derived from existing furniture and serving points.
// This does not add obstacles or alter the simulation's layout.
export function stationBounds(station: Station): Rect {
  const obstacle = (id: string) => VENUE.obstacles.find(item => item.id === id)!;
  const { id, point } = station;
  if (id === 'charades') return { id, x: point.x - 83, y: point.y - 83, w: 166, h: 166 };
  if (id === 'photo') {
    const left = obstacle('booth-left'), right = obstacle('booth-right'), back = obstacle('booth-back');
    return { id, x: left.x - 20, y: left.y - 10, w: right.x + right.w - left.x + 30, h: back.y + back.h - left.y + 20 };
  }
  if (id === 'hummus' || id === 'demons' || id === 'dessert') {
    const table = obstacle('table');
    if (id === 'dessert') {
      const x = Math.min(table.x, point.x - 12), y = Math.min(table.y + table.h * .65, point.y - 12);
      return { id, x, y, w: Math.max(table.x + table.w, point.x + 12) - x, h: Math.max(table.y + table.h, point.y + 12) - y };
    }
    const halfX = id === 'demons' ? table.x : table.x + table.w / 2;
    const x = Math.min(halfX, point.x - 12), y = Math.min(table.y, point.y - 12);
    return { id, x, y, w: Math.max(halfX + table.w / 2, point.x + 12) - x, h: Math.max(table.y + table.h * .65, point.y + 12) - y };
  }
  const furniture = obstacle(id);
  const x = Math.min(furniture.x - 8, point.x - 22), y = Math.min(furniture.y - 27, point.y - 22);
  return { id, x, y, w: Math.max(furniture.x + furniture.w + 8, point.x + 22) - x, h: Math.max(furniture.y + furniture.h + 8, point.y + 22) - y };
}

export function containsPoint(rect: Rect, point: Point) {
  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}

import type { Point } from '../simulation/types';
import { VENUE } from '../simulation/venue';

export type Camera = { zoom: number; center: Point };
export type Viewport = { width: number; height: number };
export const OVERVIEW: Camera = { zoom: 1, center: { x: VENUE.width / 2, y: VENUE.height / 2 } };
export const baseScale = ({ width, height }: Viewport) => Math.max(.01, Math.min((width - 36) / VENUE.width, (height - 24) / VENUE.height));

export function worldToScreen(point: Point, camera: Camera, viewport: Viewport): Point {
  const scale = baseScale(viewport) * camera.zoom;
  return { x: viewport.width / 2 + (point.x - camera.center.x) * scale, y: viewport.height / 2 + (point.y - camera.center.y) * scale };
}
export function screenToWorld(point: Point, camera: Camera, viewport: Viewport): Point {
  const scale = baseScale(viewport) * camera.zoom;
  return { x: camera.center.x + (point.x - viewport.width / 2) / scale, y: camera.center.y + (point.y - viewport.height / 2) / scale };
}

import { VENUE } from '../simulation/venue';
import type { Point } from '../simulation/types';

export type VibeSettings = { enabled: boolean; intensity: number; rotating: boolean };
export const DEFAULT_VIBES: VibeSettings = { enabled: true, intensity: .65, rotating: true };
export type LightCorner = 'upper-left' | 'upper-right' | 'lower-left' | 'lower-right';
// Presentation only. These fixtures are not obstacles or additional stations.
export const LIGHT_CORNERS: LightCorner[] = ['upper-right', 'lower-left'];

export function lightPosition(corner: LightCorner): Point {
  const room = VENUE.boundary, kitchen = VENUE.obstacles.find(item => item.id === 'kitchen')!;
  const counter = VENUE.obstacles.find(item => item.id === 'counter')!;
  const foodWall = VENUE.obstacles.find(item => item.id === 'food-wall')!;
  const restroom = VENUE.obstacles.find(item => item.id === 'restroom')!;
  const left = VENUE.patio.x + VENUE.patio.w + 24;
  return {
    'upper-left': { x: left, y: room.y + 16 },
    'upper-right': { x: Math.min(kitchen.x, counter.x) - 24, y: room.y + 16 },
    'lower-left': { x: left, y: foodWall.y - 18 },
    'lower-right': { x: room.x + room.w - 22, y: restroom.y - 22 },
  }[corner];
}

const palette = ['217,154,74', '155,121,176', '100,157,163'];

/** A quiet disco wash, driven by its own visual clock rather than simulation time. */
export function drawPartyLights(ctx: CanvasRenderingContext2D, settings: VibeSettings, time: number, reducedMotion: boolean) {
  if (!settings.enabled || settings.intensity <= 0) return;
  const intensity = Math.min(1, settings.intensity), phase = reducedMotion ? 0 : time * .00022;
  ctx.save();
  // Keep the wash inside the house and off its solid walls and unavailable areas.
  ctx.beginPath();
  const room = VENUE.boundary;
  ctx.rect(room.x, room.y, room.w, room.h);
  for (const id of ['patio', 'kitchen', 'restroom', 'outside-lower-left', 'food-wall', 'nook-left', 'nook-right', 'nook-back']) {
    const rect = VENUE.obstacles.find(item => item.id === id)!;
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.clip('evenodd');
  ctx.globalCompositeOperation = 'screen';
  for (const [index, corner] of LIGHT_CORNERS.entries()) {
    const point = lightPosition(corner);
    const inward = Math.atan2(VENUE.height / 2 - point.y, VENUE.width / 2 - point.x);
    const turn = phase + index * Math.PI;
    for (let beam = 0; beam < 3; beam++) {
      const color = palette[(beam + index) % palette.length];
      const angle = inward + (beam - 1) * .36 + Math.sin(turn + beam * .7) * .32;
      const reach = 640, spread = .19;
      const wash = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, reach);
      wash.addColorStop(0, `rgba(${color},${.32 * intensity})`);
      wash.addColorStop(.28, `rgba(${color},${.16 * intensity})`);
      wash.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = wash; ctx.beginPath(); ctx.moveTo(point.x, point.y);
      ctx.arc(point.x, point.y, reach, angle - spread, angle + spread); ctx.closePath(); ctx.fill();
      // Soft projected flecks move with the rotating lens, without flashing.
      for (let dot = 0; dot < 7; dot++) {
        const distance = 115 + dot * 66;
        const drift = angle + Math.sin(turn * .7 + dot * 1.9) * .13;
        const x = point.x + Math.cos(drift) * distance, y = point.y + Math.sin(drift) * distance;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 13);
        glow.addColorStop(0, `rgba(${color},${.38 * intensity})`); glow.addColorStop(1, `rgba(${color},0)`);
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(${color},${.38 * intensity})`; ctx.beginPath(); ctx.ellipse(x, y, 2.5, 5, drift + phase, 0, Math.PI * 2); ctx.fill();
      }
    }
    const halo = ctx.createRadialGradient(point.x, point.y, 1, point.x, point.y, 32);
    halo.addColorStop(0, `rgba(244,231,207,${.5 * intensity})`); halo.addColorStop(1, 'rgba(217,154,74,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(point.x, point.y, 32, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const corner of LIGHT_CORNERS) {
    const { x, y } = lightPosition(corner);
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fillStyle = '#24201d'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#c49a57'; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fillStyle = `rgba(244,231,207,${.4 + intensity * .6})`; ctx.fill();
  }
  ctx.restore();
}

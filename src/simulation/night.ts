import type { Settings, StationId } from './types';

export const PARTY_START_MINUTES = 19 * 60 + 30;
export const PARTY_DURATION = 4 * 60 * 60;
export const PLAYBACK_LENGTHS = [45, 60, 90];
export const DEFAULT_PLAYBACK_SECONDS = 60;
export const CHARADES_START = 150 * 60;
export const CHARADES_END = 195 * 60;
export const DEPARTURES_START = 225 * 60;
export const FOOD_STATIONS: StationId[] = ['puri', 'chaat', 'hummus', 'demons', 'dessert', 'pizza'];
export const isFoodStation = (id: StationId) => FOOD_STATIONS.includes(id);
export const isConsumable = (id: StationId) => id === 'bar' || isFoodStation(id);
export function partyTime(elapsed: number) {
  const minutes = PARTY_START_MINUTES + Math.floor(elapsed / 60);
  const hour = Math.floor(minutes / 60) % 24;
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
}
export function nightPhase(elapsed: number, settings: Settings) {
  if (elapsed >= PARTY_DURATION) return 'Goodnight';
  if (elapsed >= DEPARTURES_START) return 'Goodbyes';
  if (elapsed >= CHARADES_END) return 'One last catch-up';
  if (elapsed >= CHARADES_START && settings.charades !== 'off') return 'Charades';
  if (elapsed < settings.arrivalMinutes * 60) return 'Arrivals, drinks & first bites';
  return 'Food, photos & mingling';
}

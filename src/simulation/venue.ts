import type { CharadesLocation, Point, Rect, Station } from './types';
export const MIN_GUESTS = 5;
export const MAX_GUESTS = 30;
export const GUEST_PRESETS = [10, 15, 20, 25, 30];
export const clampGuestCount = (count: number) => Math.min(MAX_GUESTS, Math.max(MIN_GUESTS, Math.round(count)));
// Relative drawing units, based on the sketch and the host’s compact-room correction. Not surveyed dimensions.
export const VENUE = {
  width: 900, height: 650,
  boundary: { id: 'room', x: 18, y: 22, w: 864, h: 606 },
  entry: { x: 865, y: 378 },
  patio: { id: 'patio', x: 18, y: 22, w: 87, h: 488 },
  obstacles: [
    { id: 'patio', x: 18, y: 22, w: 87, h: 488 },
    // Host correction: pani puri extends right toward the sofa; chaat is perpendicular on its left.
    { id: 'puri', x: 114, y: 62, w: 204, h: 47 },
    { id: 'chaat', x: 114, y: 116, w: 44, h: 174 },
    { id: 'sofa-left', x: 324, y: 38, w: 177, h: 76 },
    { id: 'sofa-right', x: 510, y: 38, w: 156, h: 76 },
    { id: 'counter', x: 713, y: 34, w: 51, h: 31 },
    { id: 'kitchen', x: 764, y: 22, w: 118, h: 183 },
    // Host correction: drinks extend right from the bottom of the vertical pizza slab.
    { id: 'bar', x: 713, y: 205, w: 169, h: 58 },
    { id: 'pizza', x: 713, y: 65, w: 51, h: 140 },
    { id: 'food-wall', x: 18, y: 510, w: 514, h: 18 },
    { id: 'outside-lower-left', x: 18, y: 528, w: 389, h: 100 },
    { id: 'nook-left', x: 407, y: 528, w: 18, h: 100 },
    { id: 'nook-right', x: 686, y: 510, w: 18, h: 118 },
    { id: 'nook-back', x: 425, y: 619, w: 261, h: 9 },
    { id: 'table', x: 242, y: 385, w: 278, h: 125 },
    { id: 'booth-back', x: 435, y: 601, w: 239, h: 18 },
    { id: 'booth-left', x: 425, y: 544, w: 12, h: 75 },
    { id: 'booth-right', x: 674, y: 544, w: 12, h: 75 },
    { id: 'restroom', x: 735, y: 520, w: 147, h: 108 },
  ] satisfies Rect[],
  charades: { center: { x: 449, y: 254 }, left: { x: 263, y: 262 }, lower: { x: 605, y: 410 } } satisfies Record<Exclude<CharadesLocation, 'off'>, Point>,
};
const BAR_MENU = [
  { name: 'Last Drop', item: 'Blue cocktails' },
  { name: 'Too hot to handle', item: 'Spicy margarita' },
];
export const STATIONS: Station[] = [
  { id: 'puri', name: 'Blast from past', short: 'Blast from past', subtitle: 'Tequila pani puri shots', color: '#d5a16d', point: { x: 248, y: 145 }, capacity: 2, service: [120, 240], popularity: 1.15 },
  { id: 'chaat', name: "It's Complicated", short: "It's Complicated", subtitle: 'Papdi chaat', color: '#a4b28d', point: { x: 184, y: 226 }, capacity: 2, service: [120, 240], popularity: 1 },
  { id: 'hummus', name: 'Emotional Baggage', short: 'Emotional Baggage', subtitle: 'Hummus & pita', color: '#d8c295', point: { x: 449, y: 361 }, capacity: 2, service: [60, 120], popularity: .85 },
  { id: 'demons', name: 'Side Eye', short: 'Side Eye', subtitle: 'Caprese eyeball appetizers', color: '#b57c6b', point: { x: 305, y: 361 }, capacity: 2, service: [30, 90], popularity: 1 },
  { id: 'dessert', name: 'Love Handles', short: 'Love Handles', subtitle: 'Shahi tukda', color: '#c6a15d', point: { x: 545, y: 488 }, capacity: 2, service: [120, 180], popularity: .8 },
  { id: 'photo', name: 'Department of Questionable Choices', short: 'Department of Questionable Choices', subtitle: 'Selfie booth', color: '#a997bc', point: { x: 557, y: 583 }, capacity: 4, service: [180, 360], popularity: .8 },
  { id: 'charades', name: 'Act Your Age… Or Don’t!', short: 'Charades', subtitle: 'A party game together', color: '#9cae9b', point: VENUE.charades.center, capacity: 10, service: [600, 1200], popularity: .65 },
  { id: 'bar', name: BAR_MENU.map(drink => drink.name).join(' & '), short: BAR_MENU.map(drink => drink.name).join(' & '), subtitle: BAR_MENU.map(drink => `${drink.name}: ${drink.item}`).join(' · '), menu: BAR_MENU, color: '#a7a6ce', point: { x: 795, y: 288 }, capacity: 2, service: [120, 240], popularity: 1.4 },
  { id: 'pizza', name: 'The Final Supper', short: 'The Final Supper', subtitle: 'Pizza · party-facing kitchen slab', color: '#c98a65', point: { x: 690, y: 150 }, capacity: 2, service: [60, 120], popularity: 1 },
];
export const INITIAL_SETTINGS = { count: 30, seed: 2030, duration: 14400, arrival: 'staggered' as const, arrivalMinutes: 90, charades: 'center' as const, walkingSpeed: 27, spacing: 11, capacityScale: 1, serviceScale: 1, foodPortions: 45, drinkServings: 120 };

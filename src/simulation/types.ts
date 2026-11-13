export type Point = { x: number; y: number };
export type Rect = Point & { w: number; h: number; id: string };
export type StationId = 'puri' | 'chaat' | 'hummus' | 'demons' | 'dessert' | 'photo' | 'charades' | 'bar' | 'pizza';
export type CharadesLocation = 'center' | 'left' | 'lower' | 'off';
export type ArrivalPattern = 'together' | 'staggered' | 'gradual' | 'random';
export type GuestState = 'pending' | 'moving' | 'serving' | 'socializing' | 'leaving' | 'departed';
export type Archetype = 'Foodie' | 'Social butterfly' | 'Cocktail enthusiast' | 'Photo booth regular' | 'Game enthusiast' | 'Wanderer';
export interface Station { id: StationId; name: string; short: string; subtitle: string; menu?: { name: string; item: string }[]; color: string; point: Point; capacity: number; service: [number, number]; popularity: number; }
export interface Guest { id: number; group: number; archetype: Archetype; preferences: Record<StationId, number>; revisitProbability: number; position: Point; previousPosition: Point; destination: Point; path: Point[]; state: GuestState; station: StationId | null; dwell: number; arrival: number; departure: number; intro: 'drink' | 'food' | 'free'; drinkUntil: number; plateUntil: number; lastDrinkAt: number; lastFoodAt: number; speed: number; angle: number; clothing: string; hair: string; visits: Partial<Record<StationId, number>>; serviceSlot: number; blocked: number; }
export interface Settings { count: number; seed: number; duration: number; arrival: ArrivalPattern; arrivalMinutes: number; charades: CharadesLocation; walkingSpeed: number; spacing: number; capacityScale: number; serviceScale: number; foodPortions: number; drinkServings: number; }
export interface StationStats { id: StationId; serving: number; visitors: number; utilization: number; consumed: number; remaining: number; initialStock: number; }
export interface Hotspot { id: string; title: string; message: string; point: Point; count: number; severity: 'moderate' | 'high'; }
export interface ZoneRecord { id: string; label: string; point: Point; radius: number; threshold: number; peak: number; congestedSeconds: number; }
export interface Metrics { elapsed: number; total: number; arrived: number; departed: number; departing: number; drinks: number; food: number; playing: number; moving: number; socializing: number; serving: number; peakDensity: number; efficiency: number; congestedMinutes: number; stations: StationStats[]; hotspots: Hotspot[]; zones: ZoneRecord[]; complete: boolean; }
export interface RunResult { count: number; seed: number; peakDensity: number; congestedMinutes: number; efficiency: number; utilization: number; barCongested: boolean; stations: StationStats[]; zones: ZoneRecord[]; }

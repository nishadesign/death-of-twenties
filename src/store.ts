import { create } from 'zustand';
import { CrowdSimulation } from './simulation/CrowdSimulation';
import { clampGuestCount, INITIAL_SETTINGS } from './simulation/venue';
import type { Metrics, Settings, StationId } from './simulation/types';
import { DEFAULT_VIBES, type VibeSettings } from './rendering/PartyLights';
import { DEFAULT_PLAYBACK_SECONDS, PARTY_DURATION } from './simulation/night';
const initial = new CrowdSimulation(INITIAL_SETTINGS);
interface PartyStore {
  simulation: CrowdSimulation; settings: Settings; metrics: Metrics; running: boolean;
  speed: number; mode: 'venue' | 'live' | 'heatmap'; selected: StationId | null; showCounts: boolean; showStationTitles: boolean;
  vibes: VibeSettings;
  setVibes: (patch: Partial<VibeSettings>) => void;
  reset: (seed?: number, patch?: Partial<Settings>) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  seek: (elapsed: number) => void;
  setRunning: (running: boolean) => void;
  setSpeed: (speed: number) => void;
  setMode: (mode: PartyStore['mode']) => void;
  select: (id: StationId | null) => void;
  toggleCounts: () => void;
  toggleStationTitles: () => void;
  publish: () => void;
}
export const useParty = create<PartyStore>((set, get) => ({
  simulation: initial, settings: { ...INITIAL_SETTINGS }, metrics: initial.metrics(), running: false, speed: PARTY_DURATION / DEFAULT_PLAYBACK_SECONDS, mode: 'live', selected: null, showCounts: false, showStationTitles: false,
  vibes: { ...DEFAULT_VIBES },
  setVibes: patch => set(state => ({ vibes: { ...state.vibes, ...patch, intensity: patch.intensity === undefined || !Number.isFinite(patch.intensity) ? state.vibes.intensity : Math.min(1, Math.max(0, patch.intensity)) } })),
  reset: (seed, patch) => { const settings = { ...get().settings, ...patch, seed: seed ?? get().settings.seed }; settings.count = clampGuestCount(settings.count); const simulation = new CrowdSimulation(settings); set({ settings, simulation, metrics: simulation.metrics(), running: false }); },
  updateSettings: patch => { const state = get(), settings = { ...state.settings, ...patch }; settings.count = clampGuestCount(settings.count); if (patch.count !== undefined) state.simulation.setCount(settings.count); if (patch.charades !== undefined) state.simulation.setCharades(patch.charades); if (Object.keys(patch).some(k => !['count', 'charades'].includes(k))) { state.reset(settings.seed, settings); return; } set({ settings, metrics: state.simulation.metrics() }); },
  seek: elapsed => {
    const state = get(), simulation = new CrowdSimulation(state.settings);
    const target = Math.min(state.settings.duration, Math.max(0, elapsed));
    while (simulation.elapsed < target) simulation.tick(Math.min(.5, target - simulation.elapsed));
    set({ simulation, metrics: simulation.metrics(), running: false });
  },
  setRunning: running => set({ running }), setSpeed: speed => set({ speed }), setMode: mode => set({ mode }), select: selected => set({ selected }), toggleCounts: () => set(s => ({ showCounts: !s.showCounts })),
  toggleStationTitles: () => set(state => ({ showStationTitles: !state.showStationTitles })),
  publish: () => { const state = get(), metrics = state.simulation.metrics(); set({ metrics, running: metrics.complete ? false : state.running }); },
}));

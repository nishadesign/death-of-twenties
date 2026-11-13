import { CrowdSimulation } from './CrowdSimulation';
import type { Settings } from './types';
self.onmessage = (e: MessageEvent<{ settings: Settings; counts: number[]; seeds: number[] }>) => {
  try {
    const { settings, counts, seeds } = e.data;
    let completed = 0;
    for (const count of counts) for (const seed of seeds) {
      const sim = new CrowdSimulation({ ...settings, count, seed });
      while (!sim.complete) sim.tick();
      self.postMessage({ type: 'result', result: sim.result(), completed: ++completed, total: counts.length * seeds.length });
    }
    self.postMessage({ type: 'done' });
  } catch (error) { self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'The comparison could not finish.' }); }
};

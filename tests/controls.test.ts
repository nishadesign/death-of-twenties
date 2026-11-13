import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useParty } from '../src/store';

test('controls preserve a running headcount change, reset assumptions, and replay the same seed', () => {
  useParty.getState().reset(42);
  useParty.getState().setRunning(true);
  useParty.getState().setSpeed(10);
  const original = useParty.getState().simulation;
  for (let i = 0; i < 600; i++) original.tick();
  useParty.getState().publish();
  useParty.getState().updateSettings({ count: 20 });
  assert.equal(useParty.getState().simulation, original);
  assert.equal(useParty.getState().running, true);
  assert.equal(useParty.getState().settings.count, 20);
  assert.equal(useParty.getState().metrics.elapsed, 300);
  useParty.getState().updateSettings({ count: 100 });
  assert.equal(useParty.getState().settings.count, 30);
  assert.equal(useParty.getState().simulation.guests.length, 30);
  useParty.getState().reset(42, { count: 100 });
  assert.equal(useParty.getState().settings.count, 30);
  assert.equal(useParty.getState().simulation.guests.length, 30);
  useParty.getState().setMode('heatmap'); assert.equal(useParty.getState().mode, 'heatmap');
  useParty.getState().toggleCounts(); assert.equal(useParty.getState().showCounts, true);
  useParty.getState().select('bar'); assert.equal(useParty.getState().selected, 'bar');
  useParty.getState().updateSettings({ serviceScale: 1.5 });
  assert.notEqual(useParty.getState().simulation, original);
  assert.equal(useParty.getState().running, false);
  assert.equal(useParty.getState().metrics.elapsed, 0);
  assert.equal(useParty.getState().settings.seed, 42);
  const guests = JSON.stringify(useParty.getState().simulation.guests);
  useParty.getState().reset();
  assert.equal(JSON.stringify(useParty.getState().simulation.guests), guests);
});

test('the scenario worker returns one real result per headcount and paired seed', async () => {
  const messages: { type: string; result?: { count: number; seed: number }; completed?: number; total?: number }[] = [];
  const scope = { onmessage: undefined as unknown as (e: { data: unknown }) => void, postMessage: (message: typeof messages[number]) => messages.push(message) };
  Object.defineProperty(globalThis, 'self', { value: scope, configurable: true });
  await import('../src/simulation/scenario.worker');
  scope.onmessage({ data: { settings: { ...useParty.getState().settings, duration: 1800 }, counts: [20, 30], seeds: [42, 7961] } });
  const results = messages.filter(m => m.type === 'result');
  assert.equal(results.length, 4);
  assert.deepEqual(results.map(m => [m.result!.count, m.result!.seed]), [[20, 42], [20, 7961], [30, 42], [30, 7961]]);
  assert.equal(results.at(-1)?.completed, 4); assert.equal(results.at(-1)?.total, 4);
  assert.equal(messages.at(-1)?.type, 'done');
  delete (globalThis as { self?: unknown }).self;
});

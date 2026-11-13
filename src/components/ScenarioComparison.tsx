import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Download, LoaderCircle } from 'lucide-react';
import { useParty } from '../store';
import { GUEST_PRESETS, MAX_GUESTS, MIN_GUESTS } from '../simulation/venue';
import type { RunResult, Settings } from '../simulation/types';
const average = (a: number[]) => a.reduce((v, n) => v + n, 0) / a.length;
function stat(runs: RunResult[], key: 'peakDensity' | 'congestedMinutes' | 'efficiency' | 'utilization', digits = 1) { const values = runs.map(r => r[key]); return <><strong>{average(values).toFixed(digits)}</strong><small>{Math.min(...values).toFixed(digits)}–{Math.max(...values).toFixed(digits)}</small></>; }
export default function ScenarioComparison() {
  const settings = useParty(s => s.settings);
  const [counts, setCounts] = useState<number[]>([...GUEST_PRESETS]), [seedCount, setSeedCount] = useState(3);
  const [results, setResults] = useState<RunResult[]>([]), [running, setRunning] = useState(false), [progress, setProgress] = useState(0), [error, setError] = useState('');
  const [snapshot, setSnapshot] = useState<Settings | null>(null), [expected, setExpected] = useState(0);
  const worker = useRef<Worker | null>(null);
  useEffect(() => () => worker.current?.terminate(), []);
  const start = () => {
    worker.current?.terminate(); setError(''); setResults([]); setProgress(0); setRunning(true); setSnapshot({ ...settings }); setExpected(counts.length * seedCount);
    useParty.getState().setRunning(false);
    const w = new Worker(new URL('../simulation/scenario.worker.ts', import.meta.url), { type: 'module' }); worker.current = w;
    w.onmessage = e => { if (e.data.type === 'result') { setResults(r => [...r, e.data.result]); setProgress(e.data.completed / e.data.total); } if (e.data.type === 'done' || e.data.type === 'error') { setRunning(false); if (e.data.type === 'error') setError(e.data.message); w.terminate(); } };
    w.onerror = () => { setError('The comparison stopped unexpectedly. Try fewer seeds or a shorter duration.'); setRunning(false); w.terminate(); };
    w.postMessage({ settings: { ...settings }, counts, seeds: Array.from({ length: seedCount }, (_, i) => settings.seed + i * 7919) });
  };
  const exportCSV = () => { const headings = 'guests,seed,peak_local_density,congested_minutes_per_guest,circulation_efficiency_percent,mean_station_utilization_percent,bar_congested_60_seconds'; const csv = headings + '\n' + results.map(r => [r.count, r.seed, r.peakDensity, r.congestedMinutes, r.efficiency, r.utilization, r.barCongested].join(',')).join('\n'); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = 'death-of-my-20s-scenarios.csv'; a.click(); URL.revokeObjectURL(url); };
  const resultCounts = [...new Set(results.map(r => r.count))];
  return <div className="comparison">
    <div className="comparison-config"><div><label className="field-label">GUEST COUNTS</label><div className="count-options">{[MIN_GUESTS, ...GUEST_PRESETS].map(n => <button key={n} disabled={running} className={counts.includes(n) ? 'selected' : ''} aria-pressed={counts.includes(n)} onClick={() => setCounts(c => c.includes(n) ? c.filter(v => v !== n) : [...c, n].sort((a, b) => a - b))}>{n}</button>)}</div></div><label className="seed-select">Seeds per scenario<select value={seedCount} disabled={running} onChange={e => setSeedCount(+e.target.value)}>{[1, 3, 5, 10].map(n => <option key={n} value={n}>{n} {n === 1 ? 'seed' : 'seeds'}</option>)}</select></label></div>
    <p className="helper">Your guest list is capped at {MAX_GUESTS}. Each headcount uses the same seeds and venue assumptions. Every run starts at arrival and simulates {settings.duration / 60} minutes. Live guest-count changes are not replayed.</p>
    <div className="comparison-actions"><button className="primary-button" disabled={running || !counts.length} onClick={start}>{running ? <LoaderCircle size={15} className="spin"/> : <ArrowRight size={15}/>} {running ? `Running ${results.length} of ${expected}…` : 'Run comparison'}</button>{running && <button className="text-button" onClick={() => { worker.current?.terminate(); setRunning(false); }}>Stop</button>}{results.length > 0 && <button className="text-button" onClick={exportCSV}><Download size={14}/> Export runs</button>}</div>
    {running && <progress className="comparison-progress" value={progress} max={1} aria-label="Comparison progress"/>}
    {error && <p role="alert" className="error">{error}</p>}
    {results.length === 0 && !running && <div className="comparison-empty"><span>{GUEST_PRESETS.join(' · ')}</span><h3>How many is a good crowd?</h3><p>Run the party at different headcounts to see how guests spread through the room.<br/>Results and variability appear here after each simulated run.</p></div>}
    {results.length > 0 && <><div className="result-caption"><span>{results.length === expected ? 'COMPLETED COMPARISON' : 'PARTIAL RESULTS'} · {snapshot!.duration / 60} MIN / RUN</span><span>Mean, with min–max below</span></div><div className="table-scroll"><table className="comparison-table"><thead><tr><th>Guests</th><th>Peak density<small>relative count</small></th><th>Congested<small>min / guest</small></th><th>Utilization<small>percent</small></th><th>Circulation<small>percent</small></th></tr></thead><tbody>{resultCounts.map(n => { const runs = results.filter(r => r.count === n); return <tr key={n}><th>{n}<small>{runs.length} {runs.length === 1 ? 'run' : 'runs'}</small></th><td>{stat(runs, 'peakDensity', 0)}</td><td>{stat(runs, 'congestedMinutes')}</td><td>{stat(runs, 'utilization', 0)}</td><td>{stat(runs, 'efficiency', 0)}</td></tr>; })}</tbody></table></div>
    <div className="evidence-list">{resultCounts.map(n => { const runs = results.filter(r => r.count === n), congested = runs.filter(r => r.barCongested).length; return <p key={n}><span className={`status-dot ${congested ? 'warm' : ''}`}/><strong>{n} guests:</strong> the cocktail zone was congested for at least one minute in <strong>{congested} of {runs.length}</strong> completed runs.</p>; })}</div>
    <p className="helper">Run assumptions: {snapshot!.arrival} arrivals; charades {snapshot!.charades}; walking speed {snapshot!.walkingSpeed} units/sec; spacing {snapshot!.spacing}; station visit time {snapshot!.serviceScale}×; food/bar spots {Math.round(snapshot!.capacityScale * 2)}. Seed sequence starts at {snapshot!.seed}, stepping by 7,919. Utilization is occupied station spots over available place-time. Circulation is the share of movement time without local crowding. Density is a local count within 55 relative drawing units. Estimates depend on unmeasured geometry and the chosen assumptions.</p></>}
  </div>;
}

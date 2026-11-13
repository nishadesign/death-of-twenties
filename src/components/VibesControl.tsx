import { Pause, Play, Sparkles } from 'lucide-react';
import { useParty } from '../store';

export default function VibesControl() {
  const vibes = useParty(state => state.vibes), setVibes = useParty(state => state.setVibes), mode = useParty(state => state.mode);
  return <section className="vibes-control" aria-labelledby="vibes-heading">
    <div className="panel-heading"><span className="eyebrow" id="vibes-heading"><Sparkles size={13}/> VIBES</span><button className={`vibes-switch ${vibes.enabled ? 'enabled' : ''}`} role="switch" aria-checked={vibes.enabled} aria-label="Corner lights" onClick={() => setVibes({ enabled: !vibes.enabled })}><span>{vibes.enabled ? 'On' : 'Off'}</span><span className="mini-toggle" aria-hidden="true"><i/></span></button></div>
    <p>Two revolving corner lights.</p>
    <div className="vibes-intensity"><label htmlFor="vibes-glow">Glow</label><output htmlFor="vibes-glow">{Math.round(vibes.intensity * 100)}%</output><input id="vibes-glow" className="guest-slider" type="range" min="0" max="100" step="5" value={Math.round(vibes.intensity * 100)} disabled={!vibes.enabled} onChange={e => setVibes({ intensity: +e.target.value / 100 })} style={{ '--range-progress': `${vibes.intensity * 100}%` } as React.CSSProperties}/></div>
    <button className="vibes-rotation" disabled={!vibes.enabled} onClick={() => setVibes({ rotating: !vibes.rotating })}>{vibes.rotating ? <Pause size={12}/> : <Play size={12}/>} {vibes.rotating ? 'Pause rotation' : 'Resume rotation'}</button>
    {mode === 'heatmap' && <small className="vibes-note">Lights are hidden in Heatmap.</small>}
    <small className="vibes-motion-note">Your reduced-motion setting keeps the lights still.</small>
  </section>;
}

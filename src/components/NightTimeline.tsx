import { useParty } from '../store';
import { CHARADES_START, CHARADES_END, PARTY_DURATION, nightPhase, partyTime } from '../simulation/night';

export default function NightTimeline() {
  const { metrics, settings, seek } = useParty();
  const moments = [
    { at: 0, title: 'Doors open' },
    { at: settings.arrivalMinutes * 60, title: 'Most guests here' },
    { at: CHARADES_START, title: settings.charades === 'off' ? 'Mingling' : 'Charades' },
    { at: CHARADES_END, title: 'Last catch-ups' },
    { at: PARTY_DURATION, title: 'Goodnight' },
  ];
  return <section className="night-timeline" aria-label="The evening timeline">
    <div className="night-timeline-heading"><strong>{nightPhase(metrics.elapsed, settings)}</strong><span>Jump to a moment · playback pauses</span></div>
    <nav aria-label="Jump to a party time">{moments.map((moment, index) => {
      const current = metrics.elapsed >= moment.at && (index === moments.length - 1 || metrics.elapsed < moments[index + 1].at);
      return <button key={moment.at} aria-current={current ? 'step' : undefined} aria-label={`Jump to ${partyTime(moment.at)}: ${moment.title}`} className={current ? 'current' : metrics.elapsed > moment.at ? 'past' : ''} onClick={() => seek(moment.at)}><i aria-hidden="true"/><time>{partyTime(moment.at)}</time><span>{moment.title}</span></button>;
    })}</nav>
    <div className="night-attendance"><span><strong>{metrics.total}</strong> in the room</span><span><strong>{metrics.arrived}/{settings.count}</strong> arrived</span><span><strong>{metrics.departed}</strong> headed home</span></div>
  </section>;
}

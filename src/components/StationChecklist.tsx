import type { StationId } from '../simulation/types';
import { STATION_CHECKLISTS } from '../stories/checklists';
import { useChecklistProgress } from './ChecklistProgress';

export default function StationChecklist({ stationId }: { stationId: StationId }) {
  const { checked, saved, toggle } = useChecklistProgress();
  const groups = STATION_CHECKLISTS[stationId];
  if (!groups?.length) return null;
  const items = groups.flatMap(group => group.items), done = items.filter(item => checked.has(item.id)).length;
  return <section className="station-checklist" aria-label="Preparation checklist">
    <header className="checklist-heading"><h3>Checklist</h3><span className="checklist-progress" aria-live="polite">{done} / {items.length} done</span></header>
    <div className="checklist-body">
      <p className="checklist-save-note" role="status">{saved ? 'Saved in this browser.' : 'Saved for this visit only.'}</p>
      {groups.map(group => <fieldset key={group.id} className="checklist-group">
        <legend className={groups.length === 1 ? 'sr-only' : undefined}>{group.title}</legend>
        {groups.length > 1 && <p className="checklist-description">{group.description}</p>}
        {group.items.map(item => <label key={item.id} className={`checklist-item ${checked.has(item.id) ? 'is-checked' : ''}`}>
          <input type="checkbox" value={item.id} checked={checked.has(item.id)} onChange={event => toggle(item.id, event.currentTarget.checked)}/>
          <span><span className="checklist-item-name">{item.label}</span><span className="checklist-quantity">{item.quantity}</span></span>
        </label>)}
      </fieldset>)}
    </div>
  </section>;
}

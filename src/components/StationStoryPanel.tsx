import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useParty } from '../store';
import { STATIONS } from '../simulation/venue';
import { getStationStory } from '../stories/manifest';
import type { StoryImage } from '../stories/types';
import StationGallery from './StationGallery';
import ImageLightbox from './ImageLightbox';
import StationChecklist from './StationChecklist';

export default function StationStoryPanel() {
  const selected = useParty(state => state.selected), select = useParty(state => state.select);
  const index = STATIONS.findIndex(station => station.id === selected), station = STATIONS[index];
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [phase, setPhase] = useState<'before' | 'after'>('before');
  const phaseButtons = useRef<Partial<Record<'before' | 'after', HTMLButtonElement>>>({});
  const title = useRef<HTMLHeadingElement>(null), scroll = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const backdropDown = useRef(false);
  useLayoutEffect(() => {
    const el = dialog.current!;
    el.showModal();
    title.current?.focus({ preventScroll: true });
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { el.close(); document.body.style.overflow = previous; };
  }, []);
  useLayoutEffect(() => {
    scroll.current?.scrollTo(0, 0); setLightbox(null); setPhase('before');
  }, [selected]);
  useEffect(() => { scroll.current?.scrollTo(0, 0); }, [phase]);
  if (!station) return null;
  const story = getStationStory(station), previous = STATIONS[(index + STATIONS.length - 1) % STATIONS.length], next = STATIONS[(index + 1) % STATIONS.length];
  const open = (image: StoryImage) => { if (image.src) setLightbox(image.id); };
  return <dialog ref={dialog} className="station-story-modal" aria-labelledby="station-story-title" aria-modal="true"
    onCancel={e => { e.preventDefault(); e.stopPropagation(); if (!lightbox) select(null); }}
    onPointerDown={e => { backdropDown.current = e.target === e.currentTarget; }}
    onClick={e => { if (e.target === e.currentTarget && backdropDown.current) select(null); }}>
    <button className="icon-button story-close" aria-label="Close station story" onClick={() => select(null)}><X size={21}/></button>
    <div className="story-panel-header">
      <header className="story-heading"><h2 id="station-story-title" ref={title} tabIndex={-1}>{station.name}</h2><p>{station.subtitle}</p></header>
      <div className="story-phase-tabs" role="tablist" aria-label="Station before and after">
        {(['before', 'after'] as const).map(value => <button key={value} id={`station-${value}-tab`} type="button" role="tab" aria-selected={phase === value} aria-controls={`station-${value}-panel`} tabIndex={phase === value ? 0 : -1} ref={el => { if (el) phaseButtons.current[value] = el; }} onClick={() => setPhase(value)} onKeyDown={event => {
          const next = event.key === 'Home' ? 'before' : event.key === 'End' ? 'after' : ['ArrowLeft', 'ArrowRight'].includes(event.key) ? (value === 'before' ? 'after' : 'before') : null;
          if (next) { event.preventDefault(); setPhase(next); phaseButtons.current[next]?.focus(); }
        }}>{value === 'before' ? 'Before' : 'After'}</button>)}
      </div>
    </div>
    <div className="story-panel-scroll" ref={scroll}>
      <div id="station-before-panel" role="tabpanel" aria-labelledby="station-before-tab" tabIndex={0} hidden={phase !== 'before'}>
        {phase === 'before' && <>
          <StationGallery key={`${station.id}-before`} images={story.plannedImages} phase="Before" onOpen={open}/>
          <StationChecklist key={`checklist-${station.id}`} stationId={station.id}/>
        </>}
      </div>
      <div id="station-after-panel" role="tabpanel" aria-labelledby="station-after-tab" tabIndex={0} hidden={phase !== 'after'}>
        {phase === 'after' && <StationGallery key={`${station.id}-after`} images={story.builtImages} phase="After" onOpen={open}/>}
      </div>
    </div>
    <nav className="story-navigation" aria-label="Station stories"><button onClick={() => select(previous.id)} aria-label={`Previous Station: ${previous.name}`}><ArrowLeft size={16}/> Previous</button><span>{String(index + 1).padStart(2, '0')} / {String(STATIONS.length).padStart(2, '0')}</span><button onClick={() => select(next.id)} aria-label={`Next Station: ${next.name}`}>Next <ArrowRight size={16}/></button></nav>
    <span className="sr-only" aria-live="polite">Station {index + 1} of {STATIONS.length}: {station.name}</span>
    {lightbox && <ImageLightbox images={phase === 'before' ? story.plannedImages : story.builtImages} initialId={lightbox} onClose={() => setLightbox(null)}/>}
  </dialog>;
}

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useParty } from '../store';
import { STATIONS } from '../simulation/venue';
import { getStationStory, getStoryImages, VENUE_REFERENCE } from '../stories/manifest';
import type { StoryImage } from '../stories/types';
import PlannedBuiltComparison from './PlannedBuiltComparison';
import DesignProcessTimeline from './DesignProcessTimeline';
import ImageLightbox from './ImageLightbox';

export default function StationStoryPanel() {
  const selected = useParty(state => state.selected), select = useParty(state => state.select);
  const index = STATIONS.findIndex(station => station.id === selected), station = STATIONS[index];
  const [lightbox, setLightbox] = useState<string | null>(null);
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
  useEffect(() => {
    scroll.current?.scrollTo(0, 0); setLightbox(null);
  }, [selected]);
  if (!station) return null;
  const story = getStationStory(station), previous = STATIONS[(index + STATIONS.length - 1) % STATIONS.length], next = STATIONS[(index + 1) % STATIONS.length];
  const open = (image: StoryImage) => { if (image.src) setLightbox(image.id); };
  return <dialog ref={dialog} className="station-story-modal" aria-labelledby="station-story-title" aria-modal="true"
    onCancel={e => { e.preventDefault(); e.stopPropagation(); if (!lightbox) select(null); }}
    onPointerDown={e => { backdropDown.current = e.target === e.currentTarget; }}
    onClick={e => { if (e.target === e.currentTarget && backdropDown.current) select(null); }}>
    <div className="story-panel-toolbar"><button onClick={() => select(null)}><ArrowLeft size={15}/> Back to Venue</button><button className="icon-button" aria-label="Close station story" onClick={() => select(null)}><X size={19}/></button></div>
    <div className="story-panel-scroll" ref={scroll}>
      <header className="story-heading"><div className="story-folio"><span className="eyebrow">THE PARTY, IN THE MAKING</span><span>{String(index + 1).padStart(2, '0')} <i>/ {String(STATIONS.length).padStart(2, '0')}</i></span></div><h2 id="station-story-title" ref={title} tabIndex={-1}>{station.name}</h2><p>{story.subtitle || station.subtitle}</p><div className="story-heading-rule" aria-hidden="true"><span/>✦<span/></div></header>
      <div key={station.id} className="story-content">
        <PlannedBuiltComparison story={story} onOpen={open}/>
        {story.sourceNote && <p className="story-source-note">{story.sourceNote}</p>}
        <DesignProcessTimeline story={story} onOpen={open}/>
        {!story.intention && !story.iterations.length && !story.plannedImages.some(image => image.src) && !story.builtImages.some(image => image.src) && <p className="story-awaiting">The archive for this station is waiting for its concept artwork and photographs from the night.</p>}
        <details className="story-reference"><summary>The original venue sketch</summary><button onClick={() => open(VENUE_REFERENCE)} aria-label="Enlarge the original venue sketch"><img src={VENUE_REFERENCE.src!} alt={VENUE_REFERENCE.alt} loading="lazy"/><span>{VENUE_REFERENCE.caption}</span></button></details>
      </div>
    </div>
    <nav className="story-navigation" aria-label="Station stories"><button onClick={() => select(previous.id)} aria-label={`Previous Station: ${previous.name}`}><span><ArrowLeft size={14}/> Previous Station</span><strong>{previous.short}</strong></button><button onClick={() => select(next.id)} aria-label={`Next Station: ${next.name}`}><span>Next Station <ArrowRight size={14}/></span><strong>{next.short}</strong></button></nav>
    <span className="sr-only" aria-live="polite">Station {index + 1} of {STATIONS.length}: {station.name}</span>
    {lightbox && <ImageLightbox images={[...getStoryImages(story), VENUE_REFERENCE]} initialId={lightbox} onClose={() => setLightbox(null)}/>}
  </dialog>;
}

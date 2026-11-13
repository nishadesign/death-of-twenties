import { useState } from 'react';
import type { StationStory, StoryImage } from '../stories/types';
import StoryImageCard from './StoryImageCard';

export function comparableImages(story: StationStory) {
  const planned = story.plannedImages.find(image => image.id === story.comparison?.plannedId && image.src);
  const built = story.builtImages.find(image => image.id === story.comparison?.builtId && image.src);
  return planned && built ? { planned, built } : null;
}

function ImageSequence({ images, label, onOpen }: { images: StoryImage[]; label: string; onOpen: (image: StoryImage) => void }) {
  // Lead with supplied artwork or a photograph; keep missing revisions available.
  const [index, setIndex] = useState(() => {
    const firstAvailable = images.findIndex(image => image.src);
    return firstAvailable < 0 ? Math.max(0, images.length - 1) : firstAvailable;
  });
  const fallback: StoryImage = { id: `${label}-missing`, src: null, alt: `${label} image`, caption: `${label === 'Built' ? 'Party photograph' : 'Concept artwork'} · not yet supplied` };
  return <div className="story-image-sequence"><StoryImageCard key={images[index]?.id || fallback.id} image={images[index] || fallback} label={label} onOpen={onOpen}/>
    {images.length > 1 && <div className="image-sequence-controls" role="group" aria-label={`${label} images`}>{images.map((image, i) => <button key={image.id} aria-label={`Show ${image.caption || image.alt}`} aria-pressed={index === i} onClick={() => setIndex(i)}>{String(i + 1).padStart(2, '0')}</button>)}<span>{images.length} images</span></div>}
  </div>;
}

export default function PlannedBuiltComparison({ story, onOpen }: { story: StationStory; onOpen: (image: StoryImage) => void }) {
  const [overlay, setOverlay] = useState(false), [reveal, setReveal] = useState(50), [failed, setFailed] = useState(false);
  const pair = comparableImages(story);
  return <section className="planned-built" aria-label="Planned and built comparison">
    <div className="comparison-heading"><h3>From imagined to real.</h3><span aria-hidden="true">✦</span></div>
    <div className="story-comparison-grid"><ImageSequence images={story.plannedImages} label="Planned" onOpen={onOpen}/><ImageSequence images={story.builtImages} label="Built" onOpen={onOpen}/></div>
    {pair && !failed && <div className="before-after"><button className="text-button" aria-pressed={overlay} onClick={() => setOverlay(!overlay)}>{overlay ? 'Hide image overlay' : 'Compare with a before / after slider'}</button>{overlay && <>
      <div className="before-after-images"><img src={pair.built.src!} alt={`Built: ${pair.built.alt}`} onError={() => setFailed(true)}/><img src={pair.planned.src!} alt={`Planned: ${pair.planned.alt}`} style={{ clipPath: `inset(0 ${100 - reveal}% 0 0)` }} onError={() => setFailed(true)}/><i style={{ left: `${reveal}%` }}/><span className="before-label">Planned</span><span className="after-label">Built</span></div>
      <label className="comparison-slider-label">Reveal planned image <span>{reveal}%</span><input type="range" min="0" max="100" value={reveal} onChange={e => setReveal(+e.target.value)} aria-label="Planned image reveal" aria-valuetext={`${reveal} percent planned, ${100 - reveal} percent built`}/></label>
    </>}</div>}
  </section>;
}

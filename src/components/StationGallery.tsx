import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Image } from 'lucide-react';
import type { StoryImage } from '../stories/types';
import StoryImageCard from './StoryImageCard';

export default function StationGallery({ images, phase, onOpen }: { images: StoryImage[]; phase: 'Before' | 'After'; onOpen: (image: StoryImage) => void }) {
  const available = images.filter(image => image.src);
  const [index, setIndex] = useState(0);
  const rail = useRef<HTMLDivElement>(null), tiles = useRef(new Map<number, HTMLDivElement>());
  if (!available.length) return <div className="station-gallery-empty"><Image size={28} strokeWidth={1}/><p>{phase === 'Before' ? 'No before images added yet.' : 'No after photos added yet.'}</p></div>;
  const move = (direction: number, focus = false) => {
    const next = Math.max(0, Math.min(available.length - 1, index + direction));
    const tile = tiles.current.get(next), track = rail.current;
    setIndex(next);
    if (tile && track) {
      track.scrollTo({ left: Math.max(0, tile.offsetLeft - (track.clientWidth - tile.offsetWidth) / 2), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      if (focus) tile.querySelector('button')?.focus({ preventScroll: true });
    }
  };
  const trackScroll = () => {
    const track = rail.current!;
    const center = track.scrollLeft + track.clientWidth / 2;
    let closest = 0, distance = Infinity;
    tiles.current.forEach((tile, i) => { const d = Math.abs(tile.offsetLeft + tile.offsetWidth / 2 - center); if (d < distance) { closest = i; distance = d; } });
    setIndex(closest);
  };
  return <section className="station-gallery" aria-label={`${phase} images`} aria-roledescription="carousel">
    <div className="gallery-rail" data-single={available.length === 1} ref={rail} onScroll={trackScroll} onKeyDown={event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1, true); }
    }}>
      {available.map((image, i) => <div key={image.id} className="gallery-tile" ref={el => { if (el) tiles.current.set(i, el); else tiles.current.delete(i); }} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${available.length}`}>
        <StoryImageCard image={image} label={phase} onOpen={onOpen} minimal/>
      </div>)}
    </div>
    {available.length > 1 && <div className="gallery-navigation">
      <button className="icon-button" aria-label="Previous gallery image" disabled={index === 0} onClick={() => move(-1)}><ArrowLeft size={17}/></button>
      <span aria-live="polite" aria-atomic="true">{index + 1} / {available.length}</span>
      <button className="icon-button" aria-label="Next gallery image" disabled={index === available.length - 1} onClick={() => move(1)}><ArrowRight size={17}/></button>
    </div>}
  </section>;
}

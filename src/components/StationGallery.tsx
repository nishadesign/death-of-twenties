import { useState } from 'react';
import { ArrowLeft, ArrowRight, Image } from 'lucide-react';
import type { StationStory, StoryImage } from '../stories/types';
import StoryImageCard from './StoryImageCard';

export default function StationGallery({ story, onOpen }: { story: StationStory; onOpen: (image: StoryImage) => void }) {
  const groups = [
    { label: 'At the party', images: story.builtImages.filter(image => image.src) },
    { label: story.stationId === 'hummus' ? 'Inspiration' : 'Artwork', images: story.plannedImages.filter(image => image.src) },
  ].filter(group => group.images.length);
  const [collection, setCollection] = useState(0), [index, setIndex] = useState(0);
  const group = groups[collection] ?? groups[0];
  if (!group) return <div className="station-gallery-empty"><Image size={28} strokeWidth={1}/><p>No photos added yet.</p></div>;
  const image = group.images[index] ?? group.images[0];
  const move = (direction: number) => setIndex(i => (i + direction + group.images.length) % group.images.length);
  return <section className="station-gallery" aria-label="Station images">
    {groups.length > 1 ? <div className="gallery-collections" role="group" aria-label="Image collection">{groups.map((item, i) => <button key={item.label} aria-pressed={collection === i} onClick={() => { setCollection(i); setIndex(0); }}>{item.label}</button>)}</div> : <p className="gallery-label">{group.label}</p>}
    <StoryImageCard key={image.id} image={image} label={group.label} onOpen={onOpen} minimal/>
    {group.images.length > 1 && <div className="gallery-navigation">
      <button className="icon-button" aria-label="Previous gallery image" onClick={() => move(-1)}><ArrowLeft size={17}/></button>
      <span aria-live="polite" aria-atomic="true">{index + 1} / {group.images.length}</span>
      <button className="icon-button" aria-label="Next gallery image" onClick={() => move(1)}><ArrowRight size={17}/></button>
    </div>}
  </section>;
}

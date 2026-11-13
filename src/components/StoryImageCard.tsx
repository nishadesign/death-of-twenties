import { useEffect, useState } from 'react';
import { Image, Maximize2 } from 'lucide-react';
import type { StoryImage } from '../stories/types';

export default function StoryImageCard({ image, label, onOpen, compact = false, minimal = false }: {
  image: StoryImage; label: string; onOpen: (image: StoryImage) => void; compact?: boolean; minimal?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [image.src]);
  const available = Boolean(image.src) && !failed;
  return <figure className={`story-image-card ${compact ? 'story-image-compact' : ''}`}>
    {!minimal && <div className="story-image-label"><span>{label}</span>{image.iteration && <span>Iteration {String(image.iteration).padStart(2, '0')}</span>}</div>}
    {available ? <button className="story-image-open" onClick={() => onOpen(image)} aria-label={`Enlarge ${image.alt}`}>
      <img src={image.src!} alt={image.alt} loading="lazy" onError={() => setFailed(true)}/><span className="image-enlarge" aria-hidden="true"><Maximize2 size={14}/>{!minimal && ' View full image'}</span>
    </button> : <div className="story-image-missing" role="img" aria-label={`${image.alt}: ${failed ? 'image unavailable' : 'not yet supplied'}`}>
      <Image size={24} strokeWidth={1}/><span>{failed ? 'Image unavailable' : label.toLowerCase() === 'built' ? 'The night itself' : 'The imagined party'}</span>
      <small>{failed ? 'This image could not be loaded.' : 'Image not yet supplied'}</small>
    </div>}
    {!minimal && <figcaption>{image.caption || image.alt}</figcaption>}
  </figure>;
}

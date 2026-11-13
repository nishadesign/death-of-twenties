import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import type { StoryImage } from '../stories/types';

export default function ImageLightbox({ images, initialId, onClose }: { images: StoryImage[]; initialId: string; onClose: () => void }) {
  const available = images.filter(image => image.src);
  const [index, setIndex] = useState(Math.max(0, available.findIndex(image => image.id === initialId)));
  const [failed, setFailed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const image = available[index];
  useEffect(() => {
    const el = dialog.current!;
    const opener = document.activeElement as HTMLElement | null;
    el.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { el.close(); document.body.style.overflow = previous; if (opener?.isConnected) opener.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => setFailed(false), [image?.id]);
  const move = (direction: number) => setIndex(i => (i + direction + available.length) % available.length);
  return createPortal(<dialog ref={dialog} className="image-lightbox" aria-label="Design artifact viewer"
    onCancel={e => { e.preventDefault(); e.stopPropagation(); onClose(); }}
    onKeyDown={e => { e.stopPropagation(); if (e.key === 'ArrowRight') { e.preventDefault(); move(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); } }}>
    <header><span className="eyebrow">THE PARTY ARCHIVE</span><button className="icon-button" aria-label="Close image viewer" onClick={onClose}><X size={24}/></button></header>
    <div className="lightbox-image-area">{image && !failed ? <img src={image.src!} alt={image.alt} onError={() => setFailed(true)}/> : <p role="status">This image could not be loaded.</p>}</div>
    <footer><button className="icon-button" aria-label="Previous image" disabled={available.length < 2} onClick={() => move(-1)}><ArrowLeft size={22}/></button><div aria-live="polite"><p>{image?.caption || image?.alt}</p><span>{index + 1} / {available.length}</span></div><button className="icon-button" aria-label="Next image" disabled={available.length < 2} onClick={() => move(1)}><ArrowRight size={22}/></button></footer>
  </dialog>, document.body);
}

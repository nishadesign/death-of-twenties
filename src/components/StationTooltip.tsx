import { useLayoutEffect, useRef, useState } from 'react';
import type { Point } from '../simulation/types';
import type { Viewport } from '../rendering/camera';

export default function StationTooltip({ id, name, point, viewport }: { id: string; name: string; point: Point; viewport: Viewport }) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Point | null>(null);
  useLayoutEffect(() => {
    const place = () => {
      const box = ref.current!.getBoundingClientRect(), gap = 12, edge = 8;
      const x = Math.max(edge, Math.min(point.x - box.width / 2, viewport.width - box.width - edge));
      const above = point.y - box.height - gap;
      const y = Math.max(edge, Math.min(above >= edge ? above : point.y + gap, viewport.height - box.height - edge));
      setPosition({ x, y });
    };
    place();
    const observer = new ResizeObserver(place); observer.observe(ref.current!);
    return () => observer.disconnect();
  }, [name, point.x, point.y, viewport.width, viewport.height]);

  return <div ref={ref} id={id} role="tooltip" className="station-name-tooltip" style={{ left: position?.x ?? 0, top: position?.y ?? 0, visibility: position ? 'visible' : 'hidden' }}>
    <svg className="station-tooltip-sun" viewBox="0 0 84 22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M4 20h24m28 0h24M12 11l17 5M22 3l12 11M33 1l5 12M42 0v12M51 1l-5 12M62 3 50 14M72 11l-17 5"/>
      <circle cx="42" cy="19" r="3"/>
    </svg>
    <strong>{name}</strong>
    <span className="station-tooltip-rule" aria-hidden="true"><i/>◇<i/></span>
  </div>;
}

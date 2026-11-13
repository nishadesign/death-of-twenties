import { useEffect, useId, useRef, useState } from 'react';
import { Expand, Minus, Plus } from 'lucide-react';
import { useParty } from '../store';
import { drawVenue, stationAt } from '../rendering/VenueRenderer';
import { FIXED_STEP } from '../simulation/CrowdSimulation';
import { STATIONS } from '../simulation/venue';
import type { Point, StationId } from '../simulation/types';
import { baseScale, OVERVIEW, screenToWorld, worldToScreen, type Camera } from '../rendering/camera';
import { stationMarker } from '../rendering/stationGeometry';
import StationTooltip from './StationTooltip';

export default function PartyVenue() {
  const canvas = useRef<HTMLCanvasElement>(null), wrapper = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<Camera>({ zoom: OVERVIEW.zoom, center: { ...OVERVIEW.center } });
  const sizeRef = useRef({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1), zoomRef = useRef(100);
  const [hover, setHover] = useState<{ id: StationId; point: Point } | null>(null), hovered = useRef<StationId | null>(null);
  const tooltipId = useId();
  const stationButtons = useRef(new Map<StationId, HTMLButtonElement>());
  const drag = useRef<{ x: number; y: number; camera: Camera; moved: boolean } | null>(null);
  const mode = useParty(state => state.mode), selected = useParty(state => state.selected), select = useParty(state => state.select);
  useEffect(() => { hovered.current = null; setHover(null); }, [selected]);
  useEffect(() => {
    if (!hover) return;
    const dismiss = (event: KeyboardEvent) => { if (event.key === 'Escape') { hovered.current = null; setHover(null); } };
    window.addEventListener('keydown', dismiss);
    return () => window.removeEventListener('keydown', dismiss);
  }, [hover?.id]);

  useEffect(() => {
    const el = canvas.current!, container = wrapper.current!, ctx = el.getContext('2d')!;
    let frame = 0, last = performance.now(), accumulator = 0, publishClock = 0, lightTime = 0;
    let currentSim = useParty.getState().simulation;
    const smooth = new Map<number, Point>();
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const resize = () => {
      hovered.current = null; setHover(null);
      const box = container.getBoundingClientRect(), dpr = Math.min(devicePixelRatio, 2);
      el.width = box.width * dpr; el.height = box.height * dpr;
      const viewport = { width: box.width, height: box.height }; sizeRef.current = viewport;
    };
    const observer = new ResizeObserver(resize); observer.observe(container); resize();
    const render = (now: number) => {
      const dt = Math.min((now - last) / 1000, .1); last = now;
      const state = useParty.getState();
      if (state.vibes.enabled && state.vibes.rotating && state.mode !== 'heatmap' && !motion.matches) lightTime += dt * 1000;
      if (state.simulation !== currentSim) { currentSim = state.simulation; smooth.clear(); accumulator = 0; }
      if (state.running) { accumulator += dt * state.speed; while (accumulator >= FIXED_STEP) { state.simulation.tick(); accumulator -= FIXED_STEP; } publishClock += dt; if (publishClock > .2) { state.publish(); publishClock = 0; } }
      const dpr = Math.min(devicePixelRatio, 2), viewport = sizeRef.current, camera = cameraRef.current;
      const scale = baseScale(viewport) * camera.zoom, origin = worldToScreen({ x: 0, y: 0 }, camera, viewport);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, viewport.width, viewport.height);
      ctx.translate(origin.x, origin.y); ctx.scale(scale, scale);
      drawVenue(ctx, state.simulation, { mode: state.mode, selected: state.selected, hovered: hovered.current, showCounts: state.showCounts, showStationTitles: state.showStationTitles, time: now, alpha: state.running ? accumulator / FIXED_STEP : 1, smooth, reducedMotion: motion.matches, vibes: state.vibes, lightTime });
      for (const station of state.simulation.stations) {
        const button = stationButtons.current.get(station.id); if (!button) continue;
        const point = worldToScreen(stationMarker(station), camera, viewport);
        const offscreen = point.x < 12 || point.x > viewport.width - 12 || point.y < 12 || point.y > viewport.height - 12;
        button.style.transform = `translate(${point.x - 18}px, ${point.y - 18}px)`;
        button.style.visibility = offscreen ? 'hidden' : '';
      }
      const percent = Math.round(camera.zoom * 100);
      if (zoomRef.current !== percent) { zoomRef.current = percent; setZoom(camera.zoom); }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      hovered.current = null; setHover(null);
      const camera = cameraRef.current; cameraRef.current = { ...camera, zoom: Math.max(1, Math.min(2.5, camera.zoom - event.deltaY * .002)) };
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => { cancelAnimationFrame(frame); observer.disconnect(); el.removeEventListener('wheel', wheel); };
  }, []);

  const changeZoom = (delta: number) => { const camera = cameraRef.current; cameraRef.current = { ...camera, zoom: Math.max(1, Math.min(2.5, camera.zoom + delta)) }; };
  const clearHover = () => { hovered.current = null; setHover(null); };
  const hit = (clientX: number, clientY: number) => {
    const rect = canvas.current!.getBoundingClientRect();
    return stationAt(screenToWorld({ x: clientX - rect.left, y: clientY - rect.top }, cameraRef.current, sizeRef.current), useParty.getState().simulation);
  };
  return <div className="venue-wrap" ref={wrapper}>
    <canvas ref={canvas} tabIndex={-1} aria-label="Illustrated party venue. Use the station buttons or station list to explore design stories." aria-describedby={hover && !selected ? tooltipId : undefined} role="img" style={{ cursor: hover ? 'pointer' : 'grab' }}
      onPointerDown={e => { if (e.button !== 0) return; const camera = cameraRef.current; drag.current = { x: e.clientX, y: e.clientY, camera, moved: false }; e.currentTarget.setPointerCapture(e.pointerId); clearHover(); }}
      onPointerMove={e => {
        if (drag.current) {
          const d = drag.current, dx = e.clientX - d.x, dy = e.clientY - d.y;
          if (Math.abs(dx) + Math.abs(dy) > 5) d.moved = true;
          if (d.moved) { const scale = baseScale(sizeRef.current) * d.camera.zoom; cameraRef.current = { zoom: d.camera.zoom, center: { x: d.camera.center.x - dx / scale, y: d.camera.center.y - dy / scale } }; }
        } else if (e.pointerType !== 'touch') {
          const id = hit(e.clientX, e.clientY); hovered.current = id;
          const rect = e.currentTarget.getBoundingClientRect();
          setHover(id ? { id, point: { x: e.clientX - rect.left, y: e.clientY - rect.top } } : null);
        }
      }}
      onPointerUp={e => { const down = drag.current; drag.current = null; if (!down) return; if (!down.moved) { const id = hit(e.clientX, e.clientY); if (id) { e.currentTarget.focus({ preventScroll: true }); select(id); } } if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}
      onPointerCancel={() => { drag.current = null; clearHover(); }} onLostPointerCapture={() => { drag.current = null; }} onPointerLeave={clearHover}/>
    <div className="canvas-station-buttons" role="group" aria-label="Explore station stories">{STATIONS.map(station => <button key={station.id} data-station-id={station.id} ref={el => { if (el) stationButtons.current.set(station.id, el); else stationButtons.current.delete(station.id); }} className="canvas-story-button" aria-label={`Explore the Story: ${station.name}`} aria-describedby={hover?.id === station.id && !selected ? tooltipId : undefined} aria-pressed={selected === station.id} onClick={() => select(station.id)} onFocus={() => { hovered.current = station.id; const current = useParty.getState().simulation.stations.find(s => s.id === station.id)!; setHover({ id: station.id, point: worldToScreen(stationMarker(current), cameraRef.current, sizeRef.current) }); }} onBlur={clearHover}><span aria-hidden="true">✦</span></button>)}</div>
    {hover && !selected && <StationTooltip id={tooltipId} name={STATIONS.find(station => station.id === hover.id)!.name} point={hover.point} viewport={sizeRef.current}/>}
    <div className="canvas-note"><span className="tiny-diamond"/> YOUR VENUE, BROUGHT TO LIFE</div>
    <div className="zoom-controls"><button aria-label="Zoom out" onClick={() => changeZoom(-.2)} disabled={zoom <= 1}><Minus size={14}/></button><span>{Math.round(zoom * 100)}%</span><button aria-label="Zoom in" onClick={() => changeZoom(.2)} disabled={zoom >= 2.5}><Plus size={14}/></button><i/><button aria-label="Fit entire venue" onClick={() => { cameraRef.current = { zoom: OVERVIEW.zoom, center: { ...OVERVIEW.center } }; }}><Expand size={14}/></button></div>
    {mode === 'heatmap' && <div className="heatmap-legend"><span>Relative density</span><i/><div><span>Low</span><span>Very high</span></div></div>}
  </div>;
}

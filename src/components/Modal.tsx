import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
export default function Modal({ open, onClose, title, subtitle, children, wide = false }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; wide?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open && !dialog.current?.open) dialog.current?.showModal(); else if (!open && dialog.current?.open) dialog.current?.close(); }, [open]);
  return <dialog ref={dialog} className={`modal ${wide ? 'modal-wide' : ''}`} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }} aria-label={title}><div className="modal-content"><button className="modal-close icon-button" aria-label="Close dialog" onClick={onClose}><X size={20}/></button><span className="eyebrow">DEATH OF 20s · THE LIVING PARTY</span><h2>{title}</h2>{subtitle && <p className="modal-subtitle">{subtitle}</p>}{children}</div></dialog>;
}

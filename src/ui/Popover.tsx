import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Menu déroulant léger : se ferme au clic extérieur ou sur Échap. */
export function Popover({ trigger, children, align = 'left', className = '' }: {
  trigger: (p: { open: boolean; toggle: () => void }) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'left' | 'right'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key) }
  }, [open])
  return (
    <div className={'popover-host ' + className} ref={ref}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && <div className={'popover ' + align} role="dialog">{children(() => setOpen(false))}</div>}
    </div>
  )
}

/** Bouton à confirmation en deux temps (évite les mauvaises manipulations sans boîte modale). */
export function ConfirmButton({ label, confirmLabel = 'Confirmer ?', onConfirm, className = '' }: { label: string; confirmLabel?: string; onConfirm: () => void; className?: string }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 4000); return () => clearTimeout(t) }, [armed])
  return (
    <button className={className + (armed ? ' armed' : '')} onClick={() => { if (armed) { setArmed(false); onConfirm() } else setArmed(true) }}>
      {armed ? confirmLabel : label}
    </button>
  )
}

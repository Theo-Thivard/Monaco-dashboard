import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Menu déroulant léger. Le contenu est rendu dans <body> (portail) pour ne jamais être
 * rogné ni masqué par une carte du dashboard ; il se ferme au clic extérieur, sur Échap,
 * ou au défilement / redimensionnement.
 */
export function Popover({ trigger, children, align = 'left', className = '' }: {
  trigger: (p: { open: boolean; toggle: () => void }) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'left' | 'right'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number; maxH: number } | null>(null)
  const host = useRef<HTMLDivElement>(null)
  const pop = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!open || !host.current) return
    const r = host.current.getBoundingClientRect()
    const top = r.bottom + 6
    setPos({ top, maxH: Math.max(200, window.innerHeight - top - 16), ...(align === 'right' ? { right: Math.max(8, window.innerWidth - r.right) } : { left: Math.max(8, Math.min(r.left, window.innerWidth - 320)) }) })
  }, [open, align])

  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => {
      const t = e.target as Node
      if (!host.current?.contains(t) && !pop.current?.contains(t)) setOpen(false)
    }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const close = (e: Event) => { if (!(e.target instanceof Node) || !pop.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key)
      window.removeEventListener('resize', close); window.removeEventListener('scroll', close, true)
    }
  }, [open])

  return (
    <div className={'popover-host ' + className} ref={host}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && pos && createPortal(
        <div ref={pop} className="popover" role="dialog" style={{ position: 'fixed', top: pos.top, left: pos.left, right: pos.right, maxHeight: pos.maxH }}>{children(() => setOpen(false))}</div>,
        document.body,
      )}
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

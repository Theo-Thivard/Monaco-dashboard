import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export interface NavMenuItem {
  id: string
  label: string
  /** pastille de couleur discrète */
  color?: string
  /** information secondaire alignée à droite */
  meta?: string
  hint?: string
}
export interface NavMenuGroup { heading?: string; items: NavMenuItem[] }

interface Props {
  label: string
  /** valeur courante affichée à côté du libellé quand l'entrée est active */
  value?: string
  valueColor?: string
  active: boolean
  menuTitle: string
  groups: NavMenuGroup[]
  selectedId?: string
  width?: number
  onSelect: (id: string) => void
}

/**
 * Entrée de navigation avec menu déroulant : portail (jamais rogné), fermeture au clic extérieur / Échap / Tab,
 * navigation clavier (↑ ↓ Début Fin, Entrée, Espace), état sélectionné exposé (aria-checked).
 */
export function NavDropdown({ label, value, valueColor, active, menuTitle, groups, selectedId, width = 320, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const flat = groups.flatMap((g) => g.items)

  useLayoutEffect(() => {
    if (!open || !trigger.current) return
    const r = trigger.current.getBoundingClientRect()
    setPos({ top: r.bottom + 4, left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)) })
  }, [open, width])

  const items = () => Array.from(menu.current?.querySelectorAll<HTMLElement>('[role=menuitemradio]') ?? [])

  // à l'ouverture : le focus va sur l'élément sélectionné (ou le premier)
  useEffect(() => {
    if (!open || !pos) return
    const els = items()
    const idx = Math.max(0, flat.findIndex((i) => i.id === selectedId))
    els[idx]?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pos])

  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => {
      const t = e.target as Node
      if (!trigger.current?.contains(t) && !menu.current?.contains(t)) setOpen(false)
    }
    const close = () => setOpen(false)
    document.addEventListener('mousedown', down)
    window.addEventListener('resize', close)
    return () => { document.removeEventListener('mousedown', down); window.removeEventListener('resize', close) }
  }, [open])

  const choose = (id: string) => { setOpen(false); trigger.current?.focus(); onSelect(id) }

  const onMenuKey = (e: React.KeyboardEvent) => {
    const els = items()
    const cur = els.indexOf(document.activeElement as HTMLElement)
    const go = (i: number) => { e.preventDefault(); els[(i + els.length) % els.length]?.focus() }
    if (e.key === 'ArrowDown') go(cur + 1)
    else if (e.key === 'ArrowUp') go(cur - 1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(els.length - 1)
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); trigger.current?.focus() }
    else if (e.key === 'Tab') setOpen(false)
  }

  return (
    <>
      <button
        ref={trigger} type="button" className={'nav-item' + (active ? ' active' : '') + (open ? ' open' : '')}
        aria-haspopup="menu" aria-expanded={open} aria-current={active ? 'page' : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true) } }}
      >
        <span>{label}</span>
        {active && value && <span className="nav-value">{valueColor && <i className="dot" style={{ background: valueColor }} />}{value}</span>}
        <svg className="caret" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && pos && createPortal(
        <div ref={menu} className="nav-menu" role="menu" aria-label={menuTitle} style={{ top: pos.top, left: pos.left, width }} onKeyDown={onMenuKey}>
          <div className="nav-menu-title">{menuTitle}</div>
          {groups.map((g, gi) => (
            <div key={gi} className="nav-group" role="group" aria-label={g.heading}>
              {g.heading && <div className="nav-group-title">{g.heading}</div>}
              {g.items.map((it): ReactNode => (
                <button
                  key={it.id} type="button" role="menuitemradio" aria-checked={it.id === selectedId} tabIndex={-1}
                  className={'nav-option' + (it.id === selectedId ? ' selected' : '')}
                  onClick={() => choose(it.id)}
                >
                  <span className="radio" aria-hidden="true">{it.id === selectedId && <i />}</span>
                  {it.color && <i className="dot" style={{ background: it.color }} />}
                  <span className="opt-label">{it.label}{it.hint && <small>{it.hint}</small>}</span>
                  {it.meta && <span className="opt-meta">{it.meta}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}

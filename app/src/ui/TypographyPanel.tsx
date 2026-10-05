import { useRef, useState } from 'react'
import { TYPE_CATS, TYPE_MAX, TYPE_MIN, TYPE_STEP, defaultTypography, type TypeCat } from '../config/typography'
import { patchUI, updateConfig } from '../state/store'
import type { Env } from './env'

const GLOBAL_PRESETS = [{ label: 'Standard', v: 1 }, { label: 'Grand', v: 1.25 }, { label: 'Très grand', v: 1.5 }]
const round = (n: number) => Math.round(n * 100) / 100
const clamp = (n: number) => Math.min(TYPE_MAX, Math.max(TYPE_MIN, round(n)))

/** Panneau flottant (déplaçable) : taille du texte globale, taille et gras par catégorie. */
export function TypographyPanel({ env }: { env: Env }) {
  const { typo, metrics } = env.config.theme
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  const box = useRef<HTMLDivElement>(null)

  const setGlobal = (v: number) => updateConfig((c) => ({ ...c, theme: { ...c.theme, metrics: { ...c.theme.metrics, fontScale: clamp(v) } } }))
  const setCat = (id: TypeCat, p: Partial<{ size: number; bold: boolean }>) =>
    updateConfig((c) => ({ ...c, theme: { ...c.theme, typo: { ...c.theme.typo, [id]: { ...c.theme.typo[id], ...p } } } }))
  const allBold = TYPE_CATS.every(({ id }) => typo[id].bold)
  const setAllBold = (bold: boolean) =>
    updateConfig((c) => ({ ...c, theme: { ...c.theme, typo: Object.fromEntries(TYPE_CATS.map(({ id }) => [id, { ...c.theme.typo[id], bold }])) as typeof c.theme.typo } }))
  const reset = () => updateConfig((c) => ({ ...c, theme: { ...c.theme, metrics: { ...c.theme.metrics, fontScale: 1 }, typo: defaultTypography() } }))
  const pristine = metrics.fontScale === 1 && TYPE_CATS.every(({ id }) => typo[id].size === 1 && !typo[id].bold)

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    const r = box.current!.getBoundingClientRect()
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    const w = box.current!.offsetWidth
    setPos({ x: Math.min(window.innerWidth - w - 4, Math.max(4, e.clientX - drag.current.dx)), y: Math.min(window.innerHeight - 60, Math.max(4, e.clientY - drag.current.dy)) })
  }

  const row = (key: string, label: string, hint: string | undefined, size: number, bold: boolean, onSize: (v: number) => void, onBold: (b: boolean) => void, strong = false) => (
    <div className={'typo-row' + (strong ? ' strong' : '')} key={key}>
      <div className="typo-row-head">
        <span className="typo-label" title={hint}>{label}</span>
        <span className="typo-pct">{Math.round(size * 100)} %</span>
        <button className={'typo-bold' + (bold ? ' on' : '')} aria-pressed={bold} aria-label={`${label} en gras`} title="Gras" onClick={() => onBold(!bold)}>B</button>
      </div>
      <div className="typo-slide">
        <button className="typo-step" aria-label={`${label} : réduire`} onClick={() => onSize(size - TYPE_STEP)} disabled={size <= TYPE_MIN}>A−</button>
        <input type="range" min={TYPE_MIN} max={TYPE_MAX} step={TYPE_STEP} value={size} aria-label={`${label} : taille`} onChange={(e) => onSize(Number(e.target.value))} />
        <button className="typo-step big" aria-label={`${label} : agrandir`} onClick={() => onSize(size + TYPE_STEP)} disabled={size >= TYPE_MAX}>A+</button>
      </div>
    </div>
  )

  return (
    <div ref={box} className="typo-panel" role="dialog" aria-label="Taille et gras du texte" style={pos ? { left: pos.x, top: pos.y, right: 'auto' } : undefined}>
      <div className="typo-head" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={() => { drag.current = null }}>
        <strong>Texte</strong>
        <span className="typo-grip" aria-hidden="true">⠿ déplacer</span>
        <button className="typo-close" aria-label="Fermer" onClick={() => patchUI({ typoPanel: false })}>×</button>
      </div>
      <div className="typo-body">
        <div className="typo-presets">
          {GLOBAL_PRESETS.map((p) => <button key={p.label} className={'tool' + (metrics.fontScale === p.v ? ' on' : '')} onClick={() => setGlobal(p.v)}>{p.label}</button>)}
        </div>
        {row('all', 'Tout le texte', 'Agrandit tout d\'un coup (catégories, interface et graphiques)', metrics.fontScale, allBold, setGlobal, setAllBold, true)}
        <div className="typo-sep">Par catégorie</div>
        {TYPE_CATS.map(({ id, label, hint }) => row(id, label, hint, typo[id].size, typo[id].bold, (v) => setCat(id, { size: clamp(v) }), (b) => setCat(id, { bold: b })))}
        <button className="tool wide" onClick={reset} disabled={pristine}>Réinitialiser le texte</button>
      </div>
    </div>
  )
}

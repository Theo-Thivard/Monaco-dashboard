import { useState } from 'react'
import { setUnit, useUI } from '../state/store'
import type { Env } from './env'

/**
 * Unité d'une cellule de chiffres. Par défaut : l'unité du modèle (MW IT, %…). En vue consultant, un clic permet d'écrire
 * l'unité de son choix (n'importe quel texte) ou de la supprimer (champ vidé) ; « ↺ » revient à l'unité par défaut.
 * `id` identifie la cellule (ex. « kpi:need », « scen:1 ») ; l'unité saisie est enregistrée dans la configuration.
 */
export function UnitText({ env, id, def, className }: { env: Env; id: string; def: string; className?: string }) {
  const consultant = useUI().mode === 'consultant'
  const custom = env.config.units[id]
  const text = custom ?? def
  const [draft, setDraft] = useState<string | null>(null)
  if (!consultant) return text ? <span className={className}>{text}</span> : null
  const commit = () => {
    if (draft === null) return
    const v = draft.trim()
    setDraft(null)
    if (v === def) setUnit(id, undefined)
    else setUnit(id, v)
  }
  if (draft !== null) {
    return (
      <input
        className={'unit-edit ' + (className ?? '')} autoFocus value={draft} size={Math.max(3, draft.length + 1)} aria-label="Unité (vide = aucune)" placeholder="unité"
        onChange={(e) => setDraft(e.target.value)} onBlur={commit} onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setDraft(null) }}
        onFocus={(e) => e.target.select()}
      />
    )
  }
  return (
    <span className={'unit-slot ' + (className ?? '')}>
      <span className={'unit-click' + (text ? '' : ' empty')} role="button" tabIndex={0} title="Cliquer pour écrire l'unité de votre choix (champ vidé = pas d'unité)"
        onClick={(e) => { e.stopPropagation(); setDraft(text) }} onKeyDown={(e) => { if (e.key === 'Enter') setDraft(text) }}>{text || 'unité'}</span>
      {custom !== undefined && <button className="unit-reset" onClick={(e) => { e.stopPropagation(); setUnit(id, undefined) }} title={`Revenir à l'unité par défaut (${def || 'aucune'})`} aria-label="Unité par défaut">↺</button>}
    </span>
  )
}

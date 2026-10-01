import { useRef } from 'react'
import { defaultParams } from '../core/hypotheses'
import { diffFromDefault, exportJSON, importJSON, patchUI, redo, resetAll, resetAssumptions, resetDashboard, resetReference, setMode, setReferenceToCurrent, setScenario, shareURL, toast, undo, useAppState } from '../state/store'
import { buildCSV, download, printPage } from '../state/exporters'
import type { Env } from './env'
import { ConfirmButton, Popover } from './Popover'

export function Header({ env }: { env: Env }) {
  const s = useAppState((x) => x)
  const consultant = s.ui.mode === 'consultant'
  const fileRef = useRef<HTMLInputElement>(null)
  const diff = diffFromDefault(s)
  const modified = diff.assumptions.length
  const refIsDefault = JSON.stringify(s.reference) === JSON.stringify(defaultParams())

  const copyLink = async () => {
    const url = shareURL()
    try { await navigator.clipboard.writeText(url); toast('Lien copié dans le presse-papiers') } catch { window.prompt('Copiez ce lien :', url) }
  }

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-title">{env.config.title}</div>
        <div className="brand-sub">{env.config.subtitle}</div>
      </div>

      <div className="seg scen" role="radiogroup" aria-label="Scénario">
        {[0, 1, 2].map((i) => (
          <button key={i} role="radio" aria-checked={s.scenario === i} className={s.scenario === i ? 'on' : ''} onClick={() => setScenario(i)}>{env.scenarioName(i)}</button>
        ))}
      </div>

      <div className="topbar-actions">
        <div className="hist">
          <button onClick={undo} disabled={!s.past.length} title="Annuler (modification d'hypothèse)" aria-label="Annuler">↶</button>
          <button onClick={redo} disabled={!s.future.length} title="Rétablir" aria-label="Rétablir">↷</button>
        </div>
        <button className="tool" onClick={() => patchUI({ panel: s.ui.panel === 'assumptions' ? null : 'assumptions' })}>
          Hypothèses{modified ? <span className="badge">{modified}</span> : null}
        </button>

        <Popover align="right" trigger={({ toggle }) => <button className="tool" onClick={toggle}>Scénario ▾</button>}>
          {(close) => (
            <div className="pop-body menu">
              <div className="pop-title">Scénario de référence</div>
              <p className="pop-help">{refIsDefault ? 'La référence est le scénario d\'origine du modèle.' : 'Vos hypothèses diffèrent de la référence : les écarts sont affichés sur les indicateurs.'}</p>
              <button onClick={() => { setReferenceToCurrent(); close() }}>Définir l'état actuel comme référence</button>
              <button onClick={() => { resetReference(); close() }}>Revenir à la référence d'origine</button>
              <div className="pop-sep" />
              <button onClick={() => { resetAssumptions(); close() }}>Réinitialiser les hypothèses</button>
              <button onClick={() => { void copyLink(); close() }}>Copier un lien vers ce scénario</button>
            </div>
          )}
        </Popover>

        <Popover align="right" trigger={({ toggle }) => <button className="tool" onClick={toggle} aria-label="Plus d'actions">Exporter ▾</button>}>
          {(close) => (
            <div className="pop-body menu">
              <button onClick={() => { printPage(); close() }}>Imprimer / PDF</button>
              <button onClick={() => { download('monaco-resultats.csv', buildCSV(env), 'text/csv;charset=utf-8'); close() }}>Résultats (CSV pour Excel)</button>
              <button onClick={() => { download('monaco-dashboard-config.json', exportJSON(), 'application/json'); close() }}>Configuration complète (JSON)</button>
              <button onClick={() => { fileRef.current?.click(); close() }}>Importer une configuration…</button>
              <button onClick={() => { document.documentElement.requestFullscreen?.().catch(() => undefined); close() }}>Plein écran</button>
            </div>
          )}
        </Popover>

        {consultant && (
          <>
            <button className={'tool' + (s.ui.editLayout ? ' on' : '')} onClick={() => patchUI({ editLayout: !s.ui.editLayout, selectedWidget: null, panel: s.ui.panel === 'widget' ? null : s.ui.panel })}>
              {s.ui.editLayout ? '✓ Terminer la mise en page' : 'Mise en page'}
            </button>
            <button className="tool" onClick={() => patchUI({ panel: s.ui.panel === 'settings' ? null : 'settings' })}>Personnaliser</button>
            <Popover align="right" trigger={({ toggle }) => <button className="tool" onClick={toggle}>Réinitialiser ▾</button>}>
              {(close) => (
                <div className="pop-body menu">
                  <ConfirmButton label="Reset assumptions" confirmLabel="Confirmer : hypothèses par défaut" onConfirm={() => { resetAssumptions(); close() }} />
                  <ConfirmButton label="Reset dashboard" confirmLabel="Confirmer : mise en page par défaut" onConfirm={() => { resetDashboard(); close() }} />
                  <ConfirmButton className="danger" label="Reset all" confirmLabel="Confirmer : tout réinitialiser" onConfirm={() => { resetAll(); close() }} />
                </div>
              )}
            </Popover>
          </>
        )}

        <button className={'mode' + (consultant ? ' on' : '')} onClick={() => setMode(consultant ? 'client' : 'consultant')} title="Basculer entre la vue client et la vue consultant" aria-pressed={consultant}>
          {consultant ? 'Vue consultant' : 'Vue client'}
        </button>
      </div>
      <input ref={fileRef} type="file" accept="application/json" hidden onChange={async (e) => {
        const f = e.target.files?.[0]
        e.target.value = ''
        if (!f) return
        try { importJSON(await f.text()) } catch { toast('Fichier de configuration invalide') }
      }} />
    </header>
  )
}

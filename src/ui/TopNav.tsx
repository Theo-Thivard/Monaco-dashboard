import { useRef } from 'react'
import { ACTORS, ACTOR_GROUPS, actorBlock, arrangeActors } from '../core/actors'
import { buildCSV, download, printPage } from '../state/exporters'
import { navigate, toggleSidebar, useUI } from '../state/store'
import { diffFromDefault, exportJSON, importJSON, patchUI, redo, resetAll, resetAssumptions, resetDashboard, setMode, shareURL, toast, undo, useAppState } from '../state/store'
import type { Env } from './env'
import { NavDropdown } from './NavDropdown'
import { ConfirmButton, Popover } from './Popover'

const SCENARIO_HINTS = ['Hypothèses prudentes', 'Hypothèses centrales', 'Hypothèses ambitieuses']

function SettingsMenu({ env, onImport }: { env: Env; onImport: () => void }) {
  const s = useAppState((x) => x)
  const consultant = s.ui.mode === 'consultant'
  const modified = diffFromDefault(s).assumptions.length
  const copyLink = async () => {
    const url = shareURL()
    try { await navigator.clipboard.writeText(url); toast('Lien copié dans le presse-papiers') } catch { window.prompt('Copiez ce lien :', url) }
  }
  return (
    <Popover align="right" trigger={({ toggle, open }) => (
      <button className={'nav-icon' + (open ? ' open' : '')} onClick={toggle} aria-label="Réglages" aria-haspopup="menu" aria-expanded={open} title="Réglages">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
      </button>
    )}>
      {(close) => (
        <div className="pop-body menu">
          <div className="pop-title">Affichage</div>
          <button onClick={() => { setMode(consultant ? 'client' : 'consultant'); close() }}>{consultant ? 'Passer en vue client' : 'Passer en vue consultant'}</button>
          {consultant && <button onClick={() => { patchUI({ panel: 'settings' }); close() }}>Personnaliser le tableau de bord</button>}
          {consultant && <button onClick={() => { patchUI({ panel: 'settings', settingsTab: 'save' }); close() }}>Enregistrer l'affichage sur GitHub…</button>}
          {consultant && <button onClick={() => { patchUI({ editLayout: !s.ui.editLayout, selectedWidget: null, panel: null }); close() }}>{s.ui.editLayout ? 'Terminer la mise en page' : 'Modifier la mise en page'}</button>}
          <div className="pop-sep" />
          {consultant && <div className="pop-title">Versions et affichages</div>}
          {consultant && __REGISTRY__.map((r) => (
            <a key={r.slug} className={'menu-link' + (r.slug === __APP_SLUG__ ? ' current' : '')} href={`${__SITE_ROOT__}${r.path}`} aria-current={r.slug === __APP_SLUG__ ? 'true' : undefined}>
              {r.label}{r.slug === __APP_SLUG__ ? ' · affichée' : ''}
            </a>
          ))}
          {consultant && <div className="pop-sep" />}
          <div className="pop-title">Partager et exporter</div>
          <button onClick={() => { void copyLink(); close() }}>Copier un lien vers cette page</button>
          <button onClick={() => { printPage(); close() }}>Imprimer / PDF</button>
          <button onClick={() => { download('monaco-resultats.csv', buildCSV(env), 'text/csv;charset=utf-8'); close() }}>Résultats (CSV pour Excel)</button>
          <button onClick={() => { download('monaco-dashboard-config.json', exportJSON(), 'application/json'); close() }}>Configuration complète (JSON)</button>
          <button onClick={() => { onImport(); close() }}>Importer une configuration…</button>
          <button onClick={() => { document.documentElement.requestFullscreen?.().catch(() => undefined); close() }}>Plein écran</button>
          {consultant && (
            <>
              <div className="pop-sep" />
              <div className="pop-title">Réinitialiser</div>
              <ConfirmButton label="Réinitialiser les hypothèses" confirmLabel="Confirmer : hypothèses par défaut" onConfirm={() => { resetAssumptions(); close() }} />
              <ConfirmButton label="Réinitialiser l'affichage" confirmLabel="Confirmer : mise en page par défaut" onConfirm={() => { resetDashboard(); close() }} />
              <ConfirmButton className="danger" label="Tout réinitialiser" confirmLabel="Confirmer : tout réinitialiser" onConfirm={() => { resetAll(); close() }} />
            </>
          )}
        </div>
      )}
    </Popover>
  )
}

/** Barre de navigation principale : Globale · Scénario ▾ · Acteurs ▾ · ⚙ */
export function TopNav({ env }: { env: Env }) {
  const route = env.route
  const { snap, tokens } = env
  const ui = useUI()
  const past = useAppState((x) => x.past.length)
  const future = useAppState((x) => x.future.length)
  const fileRef = useRef<HTMLInputElement>(null)
  const scenColors = [tokens.scen0, tokens.scen1, tokens.scen2]

  const scenarioGroups = [{ items: [0, 1, 2].map((i) => ({
    id: String(i), label: env.scenarioName(i), color: scenColors[i], hint: SCENARIO_HINTS[i], meta: env.fmt('power', snap.results[i].addressable),
  })) }]
  const shownActors = arrangeActors(env.config.actors, () => 0)
  const actorGroups = ACTOR_GROUPS.map((g) => ({
    heading: g.title,
    items: shownActors.map((id) => ACTORS.find((a) => a.id === id)!).filter((a) => a.group === g.id).map((a) => ({
      id: a.id, label: env.actorLabel(a.id), meta: env.fmt('power', actorBlock(snap.active, a.id).addressable),
    })),
  }))

  return (
    <header className="topnav">
      <nav className="topnav-inner" aria-label="Navigation principale">
        <button className={'nav-icon side-toggle' + (ui.sidebar ? ' open' : '')} onClick={toggleSidebar} aria-pressed={ui.sidebar} aria-label="Panneau d'hypothèses" title={ui.sidebar ? 'Masquer les hypothèses' : 'Afficher les hypothèses'}>☰</button>
        <button className="brand" onClick={() => navigate({ kind: 'global' })} title="Retour à la vue globale">{env.config.brand}</button>
        <div className="nav-items">
          <button className={'nav-item' + (route.kind === 'global' ? ' active' : '')} aria-current={route.kind === 'global' ? 'page' : undefined} onClick={() => navigate({ kind: 'global' })}>{env.label('nav:global', 'Globale')}</button>
          <NavDropdown
            label={env.label('nav:scenario', 'Scénario')} menuTitle="SCÉNARIO" width={340}
            active={route.kind === 'scenario'} value={env.scenarioName(snap.scenario)} valueColor={scenColors[snap.scenario]}
            groups={scenarioGroups} selectedId={route.kind === 'scenario' ? String(route.scenario) : undefined}
            onSelect={(id) => navigate({ kind: 'scenario', scenario: Number(id) })}
          />
          <NavDropdown
            label={env.label('nav:actors', 'Acteurs')} menuTitle="ACTEURS" width={380}
            active={route.kind === 'actor'} value={route.kind === 'actor' ? env.actorLabel(route.actor, true) : undefined}
            groups={actorGroups} selectedId={route.kind === 'actor' ? route.actor : undefined}
            onSelect={(id) => navigate({ kind: 'actor', actor: id as never })}
          />
        </div>
        <div className="nav-tools">
          <button className="nav-icon" onClick={undo} disabled={!past} title="Annuler la dernière modification d'hypothèse (Ctrl+Z)" aria-label="Annuler">↶</button>
          <button className="nav-icon" onClick={redo} disabled={!future} title="Rétablir (Ctrl+Maj+Z)" aria-label="Rétablir">↷</button>
          <SettingsMenu env={env} onImport={() => fileRef.current?.click()} />
        </div>
      </nav>
      <input ref={fileRef} type="file" accept="application/json" hidden onChange={async (e) => {
        const f = e.target.files?.[0]
        e.target.value = ''
        if (!f) return
        try { importJSON(await f.text()) } catch { toast('Fichier de configuration invalide') }
      }} />
    </header>
  )
}

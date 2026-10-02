import { useState } from 'react'
import { PRESETS, TOKEN_GROUPS, defaultMetrics, type PresetId, type Tokens } from '../config/theme'
import { createDefaultConfig } from '../config/defaults'
import { actorBlock, arrangeActors } from '../core/actors'
import { DATASETS } from '../core/datasets'
import type { Entity } from '../core/engine'
import { lensValue } from '../core/lens'
import { addWidget, diffFromDefault, getState, moveActor, moveKpi, patchUI, setActorsAuto, setActorsManual, toggleActorHidden, resetAll, resetAssumptions, resetDashboard, setLabel, toast, toggleKpi, updateConfig, updateWidget, useAppState } from '../state/store'
import { KPI_BY_ID } from '../core/kpis'
import { download, buildCSV, printPage } from '../state/exporters'
import { exportJSON, shareURL } from '../state/store'
import { saveVariant, TOKEN_HELP_URL, type SaveResult } from '../state/github'
import type { Env } from './env'
import { ColorField, Drawer, Field, NumberInput } from './fields'
import { LABEL_DEFS } from './labels'
import { ConfirmButton } from './Popover'
import { widgetTitle } from './WidgetFrame'

/** Ordre et visibilité des acteurs (graphiques et menu « Acteurs »). */
function ActorsSection({ env }: { env: Env }) {
  const prefs = env.config.actors
  const value = (id: Entity) => lensValue(actorBlock(env.snap.results[1], id), env.snap.lens)
  const all = arrangeActors({ order: prefs.order, hidden: [] }, value)
  return (
    <>
      <h4>Acteurs</h4>
      <div className="seg small" role="radiogroup" aria-label="Classement des acteurs">
        <button role="radio" aria-checked={!prefs.order} className={!prefs.order ? 'on' : ''} onClick={setActorsAuto}>Automatique (décroissant)</button>
        <button role="radio" aria-checked={!!prefs.order} className={prefs.order ? 'on' : ''} onClick={() => setActorsManual(all)}>Ordre manuel</button>
      </div>
      <p className="drawer-help">Décochez un acteur pour le retirer des graphiques et du menu ; les totaux restent ceux du modèle complet. En ordre manuel, utilisez ↑ ↓.</p>
      {all.map((id) => (
        <div key={id} className="series-row kpi-rows">
          <input type="checkbox" checked={!prefs.hidden.includes(id)} onChange={() => toggleActorHidden(id)} aria-label={`Afficher ${env.actorLabel(id)}`} />
          <span>{env.actorLabel(id)}</span>
          <span className="order"><button onClick={() => moveActor(id, -1, all)} aria-label="Monter">↑</button><button onClick={() => moveActor(id, 1, all)} aria-label="Descendre">↓</button></span>
        </div>
      ))}
    </>
  )
}

const TABS = [['content', 'Contenu'], ['look', 'Apparence'], ['format', 'Formats'], ['save', 'Sauvegarde']] as const

function ContentTab({ env }: { env: Env }) {
  const { config } = env
  const kind = env.route.kind
  const pageLabel = kind === 'global' ? 'Globale' : kind === 'scenario' ? 'Scénario (Bas, Central et Haut)' : 'Acteurs (les huit acteurs)'
  const [ds, setDs] = useState(DATASETS[0].id)
  const tiers: [string, string][] = [['client', 'Vue client'], ['detail', 'Analyse détaillée'], ['method', 'Méthodologie']]
  return (
    <>
      <h4>Navigation</h4>
      <Field label="Nom affiché dans la barre"><input type="text" value={config.brand} onChange={(e) => updateConfig((c) => ({ ...c, brand: e.target.value }))} /></Field>
      <Field label="Pied de page (sources)"><textarea rows={2} value={config.footnote} onChange={(e) => updateConfig((c) => ({ ...c, footnote: e.target.value }))} /></Field>

      <ActorsSection env={env} />

      <h4>Indicateurs</h4>
      {config.kpis.order.map((id) => KPI_BY_ID[id]).filter(Boolean).map((k) => (
        <div key={k.id} className="series-row kpi-rows">
          <input type="checkbox" checked={config.kpis.visible.includes(k.id)} onChange={() => toggleKpi(k.id)} aria-label={`Afficher ${k.label}`} />
          <input type="text" value={env.label(`kpi:${k.id}`, k.label)} onChange={(e) => setLabel(`kpi:${k.id}`, e.target.value, k.label)} aria-label="Libellé" />
          <span className="order"><button onClick={() => moveKpi(k.id, -1)} aria-label="Monter">↑</button><button onClick={() => moveKpi(k.id, 1)} aria-label="Descendre">↓</button></span>
        </div>
      ))}

      <h4>Éléments de la page</h4>
      <p className="drawer-help">Page : {pageLabel}. Les réglages s'appliquent à toutes les pages de ce type.</p>
      {tiers.map(([tier, title]) => (
        <div key={tier} className="cl-group">
          <div className="cl-head"><span className="cl-title static">{title}</span></div>
          {config.pages[kind].widgets.filter((w) => w.tier === tier && w.kind !== 'section').map((w) => (
            <div key={w.id} className="cl-item">
              <label><input type="checkbox" checked={w.visible} onChange={(e) => updateWidget(w.id, { visible: e.target.checked })} /><span>{widgetTitle(w) || w.id}</span></label>
              <button className="link" onClick={() => patchUI({ editLayout: true, selectedWidget: w.id, panel: 'widget' })}>réglages</button>
            </div>
          ))}
        </div>
      ))}

      <h4>Ajouter</h4>
      <div className="add-row">
        <select value={ds} onChange={(e) => setDs(e.target.value)} aria-label="Jeu de données">
          {DATASETS.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
        </select>
        <button onClick={() => {
          const d = DATASETS.find((x) => x.id === ds)!
          const id = `ch-${ds}-${Date.now().toString(36)}`
          addWidget({ id, kind: 'chart', tier: 'client', visible: true, datasetId: ds, chartType: d.defaultChart, legend: true }, { w: 12, h: 12 })
          toast('Graphique ajouté en bas du tableau de bord')
        }}>＋ Graphique</button>
      </div>
      <button className="wide" onClick={() => {
        addWidget({ id: `hy-${Date.now().toString(36)}`, kind: 'drivers', tier: 'client', visible: true, title: 'Hypothèses', hypMode: getState().route.kind === 'global' ? 'three' : 'one' }, { w: 9, h: 22 })
        toast('Bloc d\'hypothèses ajouté en bas de la page')
      }}>＋ Bloc d'hypothèses (curseurs)</button>
      <button className="wide" onClick={() => {
        addWidget({ id: `tx-${Date.now().toString(36)}`, kind: 'text', tier: 'client', visible: true, title: 'Note', text: 'Saisissez votre commentaire…' }, { w: 8, h: 8 })
        toast('Note ajoutée en bas du tableau de bord')
      }}>＋ Note / annotation</button>
    </>
  )
}

function LookTab({ env }: { env: Env }) {
  const { config } = env
  const t = env.tokens
  const m = config.theme.metrics
  const set = (patch: Partial<Tokens>) => updateConfig((c) => ({ ...c, theme: { ...c.theme, tokens: { ...c.theme.tokens, ...patch } } }))
  const metric = (key: keyof typeof m, label: string, min: number, max: number, step = 1) => (
    <Field label={`${label} · ${m[key]}`}>
      <input type="range" min={min} max={max} step={step} value={m[key]} onChange={(e) => updateConfig((c) => ({ ...c, theme: { ...c.theme, metrics: { ...c.theme.metrics, [key]: Number(e.target.value) } } }))} />
    </Field>
  )
  return (
    <>
      <Field label="Thème">
        <select value={config.theme.preset} onChange={(e) => updateConfig((c) => ({ ...c, theme: { ...c.theme, preset: e.target.value as PresetId, tokens: {} } }))}>
          {Object.entries(PRESETS).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}
        </select>
      </Field>
      {TOKEN_GROUPS.map((g) => (
        <div key={g.title}>
          <h4>{g.title}</h4>
          {g.keys.map((k) => (
            <ColorField key={k.key} label={k.label} value={config.theme.tokens[k.key]} fallback={PRESETS[config.theme.preset].tokens[k.key] ?? t[k.key]} onChange={(v) => {
              if (v) set({ [k.key]: v })
              else updateConfig((c) => { const tk = { ...c.theme.tokens }; delete tk[k.key]; return { ...c, theme: { ...c.theme, tokens: tk } } })
            }} />
          ))}
        </div>
      ))}
      <h4>Espacements & dimensions</h4>
      {metric('gap', 'Espacement entre blocs (px)', 4, 40)}
      {metric('pad', 'Marge intérieure des cartes (px)', 8, 40)}
      {metric('radius', 'Arrondi des angles (px)', 0, 20)}
      {metric('rowHeight', 'Hauteur d\'une ligne de grille (px)', 16, 40)}
      {metric('maxWidth', 'Largeur maximale de la page (px)', 1100, 2400, 20)}
      {metric('fontScale', 'Taille du texte (×)', 0.85, 1.3, 0.05)}
      <button className="wide" onClick={() => updateConfig((c) => ({ ...c, theme: { preset: c.theme.preset, tokens: {}, metrics: defaultMetrics() } }))}>Réinitialiser l'apparence</button>
    </>
  )
}

function FormatTab({ env }: { env: Env }) {
  const f = env.config.format
  const setF = (p: Partial<typeof f>) => updateConfig((c) => ({ ...c, format: { ...c.format, ...p } }))
  const groups = Array.from(new Set(LABEL_DEFS.map((l) => l.group)))
  return (
    <>
      <Field label="Unité de puissance" hint="Conversion à l'affichage uniquement ; les calculs restent en kW">
        <select value={f.powerUnit} onChange={(e) => setF({ powerUnit: e.target.value as 'MW' | 'kW' })}><option value="MW">MW</option><option value="kW">kW</option></select>
      </Field>
      <Field label="Suffixe d'unité (p. ex. « IT »)"><input type="text" value={f.unitSuffix} onChange={(e) => setF({ unitSuffix: e.target.value })} /></Field>
      <div className="grid2">
        <Field label="Décimales – puissance"><NumberInput value={f.powerDecimals} min={0} max={4} onChange={(v) => setF({ powerDecimals: v ?? 2 })} /></Field>
        <Field label="Décimales – %"><NumberInput value={f.pctDecimals} min={0} max={3} onChange={(v) => setF({ pctDecimals: v ?? 1 })} /></Field>
        <Field label="Décimales – ratios"><NumberInput value={f.ratioDecimals} min={0} max={3} onChange={(v) => setF({ ratioDecimals: v ?? 2 })} /></Field>
      </div>
      <p className="drawer-help">Aperçu : {env.fmt('power', env.snap.active.addressable)} · {env.fmt('pct', env.snap.active.rate)} · {env.fmt('ratio', env.snap.active.growth)}</p>
      <h4>Libellés</h4>
      {groups.map((g) => (
        <details key={g}>
          <summary>{g}</summary>
          {LABEL_DEFS.filter((l) => l.group === g).map((l) => (
            <Field key={l.key} label={l.def}><input type="text" value={env.label(l.key, l.def)} onChange={(e) => setLabel(l.key, e.target.value, l.def)} /></Field>
          ))}
        </details>
      ))}
    </>
  )
}

const TOKEN_KEY = 'monaco-dashboard-gh-token'
const readToken = () => { try { return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY) ?? '' } catch { return '' } }

const BASE_LABEL = __REGISTRY__.find((r) => r.slug === __APP_BASE__)?.label.replace(' (actuelle)', '') ?? __APP_BASE__.toUpperCase()

/** Enregistre l'affichage actuel comme nouvelle publication « V6 · nom » (branche + pull request + fusion automatiques). */
function GithubSave() {
  const [token, setToken] = useState(readToken)
  const [remember, setRemember] = useState(() => { try { return !!localStorage.getItem(TOKEN_KEY) } catch { return false } })
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<SaveResult | null>(null)
  const submit = async () => {
    setBusy(true); setError(''); setDone(null)
    try {
      try { localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY); (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token.trim()) } catch { /* stockage indisponible */ }
      setDone(await saveVariant({ token: token.trim(), name, base: { slug: __APP_BASE__, label: BASE_LABEL }, config: getState().config }))
    } catch (e) { setError(e instanceof Error ? e.message : 'Échec de l\'enregistrement.') }
    setBusy(false)
  }
  return (
    <>
      <h4>Enregistrer cet affichage</h4>
      <p className="drawer-help">Crée une <b>copie</b> du tableau de bord avec l'affichage actuel (mise en page, couleurs, libellés, textes, visibilité) sous le nom « {BASE_LABEL} · votre nom ». La version actuelle et les précédentes restent inchangées et accessibles ; la nouvelle apparaît dans le menu ⚙ › Versions et affichages. Les hypothèses (curseurs) ne sont pas enregistrées.</p>
      <Field label="Nom de l'affichage"><input type="text" value={name} placeholder="ex. vue client mars" onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Jeton GitHub" hint="Jeton personnel limité à ce dépôt : « Contents » et « Pull requests » en Read and write. Il reste dans votre navigateur.">
        <input type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="github_pat_…" />
      </Field>
      <label className="chk"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Mémoriser le jeton sur cet appareil</label>
      <p className="drawer-help"><a href={TOKEN_HELP_URL} target="_blank" rel="noreferrer">Créer un jeton</a> (Repository access : seulement ce dépôt · Contents et Pull requests : Read and write).</p>
      <button className="tool on" disabled={busy || !token.trim() || !name.trim()} onClick={submit}>{busy ? 'Enregistrement…' : 'Enregistrer comme nouvelle version'}</button>
      {error && <p className="warn" role="alert">{error}</p>}
      {done && (
        <div className="diff same" role="status">
          {done.merged ? (
            <>
              <p>✓ « {done.label} » est enregistré. Il sera en ligne dans 2 à 4 minutes (coche verte dans l'onglet Actions du dépôt), puis rechargez avec Ctrl+Maj+R.</p>
              <p><a href={done.url} target="_blank" rel="noreferrer">{done.url}</a></p>
            </>
          ) : (
            <p>La copie est prête mais la fusion automatique a échoué ({done.mergeError}). <a href={done.prUrl} target="_blank" rel="noreferrer">Ouvrez la pull request</a> et cliquez sur « Merge » : « {done.label} » sera alors en ligne.</p>
          )}
        </div>
      )}
    </>
  )
}

function SaveTab({ env }: { env: Env }) {
  const s = useAppState((x) => x)
  const d = diffFromDefault(s)
  const lines: [string, number][] = [['Mise en page', d.layout], ['Thème & couleurs', d.theme], ['Libellés & textes', d.labels], ['Visibilité', d.visibility], ['Types de graphiques & séries', d.charts], ['Formats', d.format]]
  const same = d.assumptions.length === 0 && lines.every(([, n]) => n === 0)
  return (
    <>
      <h4>Configuration actuelle vs par défaut</h4>
      <div className={'diff' + (same ? ' same' : '')}>
        {same ? <p>Aucun écart : la configuration actuelle est la configuration par défaut.</p> : (
          <>
            <div className="diff-row"><span>Hypothèses modifiées</span><b>{d.assumptions.length}</b></div>
            {d.assumptions.slice(0, 8).map((a, i) => (
              <div key={i} className="diff-sub">{env.hypLabel(a.id)}{a.scenario !== null ? ` (${env.scenarioName(a.scenario)})` : ''} : {env.fmtHypValue(a.id, a.from)} → <b>{env.fmtHypValue(a.id, a.to)}</b></div>
            ))}
            {d.assumptions.length > 8 && <div className="diff-sub muted">… et {d.assumptions.length - 8} autres</div>}
            {lines.map(([label, n]) => <div key={label} className="diff-row"><span>{label}</span><b>{n || '—'}</b></div>)}
          </>
        )}
      </div>

      <GithubSave />

      <h4>Réinitialiser</h4>
      <div className="reset-list">
        <div><ConfirmButton label="Réinitialiser les hypothèses" onConfirm={resetAssumptions} /><p>Hypothèses aux valeurs d'origine (annulable).</p></div>
        <div><ConfirmButton label="Réinitialiser l'affichage" onConfirm={resetDashboard} /><p>Mise en page, couleurs, graphiques, libellés et visibilité par défaut (affichage enregistré dans le dépôt, sinon d'origine). Les hypothèses sont conservées.</p></div>
        <div><ConfirmButton className="danger" label="Tout réinitialiser" onConfirm={resetAll} /><p>Tout remettre à l'état initial.</p></div>
      </div>

      <h4>Exporter</h4>
      <div className="reset-list">
        <button onClick={() => download('monaco-dashboard-config.json', exportJSON(), 'application/json')}>Configuration (JSON)</button>
        <button onClick={() => download('monaco-resultats.csv', buildCSV(env), 'text/csv;charset=utf-8')}>Résultats (CSV pour Excel)</button>
        <button onClick={printPage}>Imprimer / PDF</button>
        <button onClick={async () => { const u = shareURL(); try { await navigator.clipboard.writeText(u); toast('Lien copié') } catch { window.prompt('Lien :', u) } }}>Copier un lien vers cette page</button>
      </div>
      <p className="drawer-help">Défaut : {createDefaultConfig().pages[env.route.kind].widgets.length} éléments sur cette page · {Object.keys(getState().config.labels).length} libellé(s) personnalisé(s).</p>
    </>
  )
}

export function SettingsDrawer({ env }: { env: Env }) {
  const tab = useAppState((s) => s.ui.settingsTab)
  return (
    <Drawer
      title="Personnaliser" onClose={() => patchUI({ panel: null })}
      tabs={<div className="tabs" role="tablist">{TABS.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => patchUI({ settingsTab: id })}>{label}</button>)}</div>}
    >
      {tab === 'content' && <ContentTab env={env} />}
      {tab === 'look' && <LookTab env={env} />}
      {tab === 'format' && <FormatTab env={env} />}
      {tab === 'save' && <SaveTab env={env} />}
    </Drawer>
  )
}

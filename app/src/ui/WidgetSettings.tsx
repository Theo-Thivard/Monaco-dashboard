import { CHART_LABELS, compatibleCharts, DATASET_BY_ID, type ChartType } from '../core/datasets'
import type { EntityText, HypMode, LensOverride, SeriesStyle, WidgetConfig } from '../config/types'
import { scenarioTitle } from '../core/scenarios'
import { headlineTokens } from '../core/headlineText'
import { KPI_BY_ID } from '../core/kpis'
import { LABEL_DEFS } from './labels'
import { entityKey, lensTextKey, resolveEntityText, resolveWidget } from '../config/resolve'
import { useState } from 'react'
import { LENS_LABEL } from '../core/lens'
import { patchUI, removeWidget, updateWidgetEntity, updateWidgetLens, setLabel, updateLayoutItem, updateWidget, setTitlesLinked } from '../state/store'
import { useDataset, type Env } from './env'
import { ColorField, Drawer, Field, NumberInput } from './fields'
import { prepareDataset } from './prepare'
import { widgetSubtitle, widgetTitle } from './WidgetFrame'

function SeriesList({ wc, env }: { wc: WidgetConfig; env: Env }) {
  const eff = resolveWidget(wc, env.snap.lens)
  const setL = (p: LensOverride) => updateWidgetLens(wc.id, env.snap.lens, p)
  const ds = useDataset(wc.datasetId, env)
  if (!ds || ds.series.length < 2 || ds.kind === 'bridge' || ds.kind === 'sensitivity') return null
  const colors = prepareDataset(ds, {}, env.tokens).colors
  const order = (eff.seriesOrder?.length ? [...eff.seriesOrder, ...ds.series.map((s) => s.id).filter((id) => !eff.seriesOrder!.includes(id))] : ds.series.map((s) => s.id))
  const patch = (id: string, p: Partial<SeriesStyle>) => setL({ series: { ...eff.series, [id]: { ...eff.series?.[id], ...p } } })
  const move = (id: string, d: -1 | 1) => {
    const o = [...order]; const i = o.indexOf(id); const j = i + d
    if (j < 0 || j >= o.length) return
    ;[o[i], o[j]] = [o[j], o[i]]
    setL({ seriesOrder: o })
  }
  return (
    <div className="series-list">
      <h4>Séries</h4>
      {order.map((id) => {
        const s = ds.series.find((x) => x.id === id)
        if (!s) return null
        const st = eff.series?.[id]
        return (
          <div key={id} className="series-row">
            <input type="checkbox" checked={!st?.hidden} onChange={(e) => patch(id, { hidden: !e.target.checked })} aria-label={`Afficher ${s.name}`} />
            <input type="color" value={st?.color ?? colors[id]} onChange={(e) => patch(id, { color: e.target.value })} aria-label="Couleur" />
            <input type="text" value={st?.name ?? ''} placeholder={s.name} onChange={(e) => patch(id, { name: e.target.value || undefined })} aria-label="Nom" />
            <span className="order"><button onClick={() => move(id, -1)} aria-label="Monter">↑</button><button onClick={() => move(id, 1)} aria-label="Descendre">↓</button></span>
          </div>
        )
      })}
    </div>
  )
}

/** Message clé : texte généré (par défaut) ou texte libre avec jetons vivants. */
function HeadlineEditor({ wc, env, entity, onPatch, onReset }: { wc: WidgetConfig; env: Env; entity: boolean; onPatch: (p: NonNullable<WidgetConfig['headline']>) => void; onReset: () => void }) {
  const route = env.route
  const tokens = headlineTokens(env.snap, env.f, env.scenarioName, route.kind === 'actor' ? { id: route.actor, name: env.actorLabel(route.actor) } : undefined)
  const h = wc.headline ?? {}
  // textes communs : les champs vides sont retirés ; textes propres à un scénario / acteur : un champ vide = texte généré
  const patch = (p: Partial<NonNullable<WidgetConfig['headline']>>) => {
    if (entity) return onPatch(p)
    const next = { ...h, ...p }
    for (const k of Object.keys(next) as (keyof typeof next)[]) if (!next[k]) delete next[k]
    onPatch(next)
  }
  return (
    <>
      <h4>Message clé</h4>
      <label className="inline"><input type="checkbox" checked={!h.hideTitle} onChange={(e) => patch({ hideTitle: !e.target.checked })} /> Afficher la partie gauche (surtitre et titre)</label>
      <label className="inline"><input type="checkbox" checked={!h.hideBullets} onChange={(e) => patch({ hideBullets: !e.target.checked })} /> Afficher la partie droite (commentaires)</label>
      <p className="drawer-help">Laissez un champ vide pour garder le texte généré. Écrivez librement : <code>{'{central}'}</code>, <code>{'{bas}'}</code>… sont remplacés par les chiffres du modèle (ils suivent les hypothèses), <code>**mot**</code> met en gras.</p>
      <Field label="Surtitre"><input type="text" value={h.kicker ?? ''} placeholder="ex. Vue d'ensemble" onChange={(e) => patch({ kicker: e.target.value })} /></Field>
      <Field label="Titre"><textarea rows={4} value={h.title ?? ''} placeholder="ex. Le besoin atteint **{central}** en 2035…" onChange={(e) => patch({ title: e.target.value })} /></Field>
      <Field label="Puces (une par ligne)"><textarea rows={6} value={h.bullets ?? ''} placeholder={'ex. De {2026} en 2026 à {haut} dans le scénario haut'} onChange={(e) => patch({ bullets: e.target.value })} /></Field>
      {wc.headline && <button className="link" onClick={onReset}>Revenir au texte généré</button>}
      <h4>Chiffres disponibles</h4>
      <div className="token-list">
        {tokens.map((t) => <div key={t.key} className="token-row"><code>{`{${t.key}}`}</code><span>{t.label}</span><b>{t.value}</b></div>)}
      </div>
    </>
  )
}

/** Textes (libellés) propres à certains blocs : panneau des scénarios, indicateurs. */
function LabelFields({ wc, env }: { wc: WidgetConfig; env: Env }) {
  const rows: { key: string; def: string; title: string }[] =
    wc.kind === 'scenarioCards' ? LABEL_DEFS.filter((l) => l.group === 'Panneau des trois scénarios').map((l) => {
      const m = /^scenpanel:(sub|subAddr):(\d)$/.exec(l.key)
      return { ...l, title: m ? `Sous la valeur · ${env.scenarioName(Number(m[2]))} (${m[1] === 'sub' ? 'besoins générés' : 'besoins adressables'})` : l.def }
    })
    : wc.kind === 'actorKpis' ? LABEL_DEFS.filter((l) => l.group === 'Indicateurs d\'acteur').map((l) => ({ ...l, title: l.def }))
    : wc.kind === 'kpis' ? env.config.kpis.order.filter((id) => KPI_BY_ID[id]?.lenses.includes(env.snap.lens)).map((id) => ({ key: `kpi:${id}`, def: KPI_BY_ID[id].label, title: KPI_BY_ID[id].label }))
    : []
  if (!rows.length) return null
  return (
    <>
      <h4>Textes du bloc</h4>
      {wc.kind === 'scenarioCards' && <p className="drawer-help">Textes sous chaque valeur : jetons <code>{'{2026}'}</code> <code>{'{hausse}'}</code> <code>{'{besoin}'}</code> <code>{'{taux}'}</code> <code>{'{valeur}'}</code> (chiffres du modèle) ; <code>**mot**</code> met en gras. Les six lignes « sous la valeur » correspondent à la lecture Besoins générés puis Besoins adressables.</p>}
      {rows.map((l) => <Field key={l.key} label={l.title}><input type="text" value={env.label(l.key, l.def)} onChange={(e) => setLabel(l.key, e.target.value, l.def)} /></Field>)}
    </>
  )
}

export function WidgetSettings({ wc, env }: { wc: WidgetConfig; env: Env }) {
  const ds = useDataset(wc.datasetId, env)
  const def = wc.datasetId ? DATASET_BY_ID[wc.datasetId] : undefined
  const li = env.config.pages[env.route.kind].layout.find((l) => l.i === wc.id)
  const set = (p: Partial<WidgetConfig>) => updateWidget(wc.id, p)
  // textes : propres au scénario / à l'acteur affiché par défaut ; « tous » = textes communs (les saisies propres à une page sont alors retirées)
  const ekey = entityKey(env.route)
  const [shared, setShared] = useState(false)
  const lens = env.snap.lens
  const linked = env.config.titlesLinked
  const rw = resolveEntityText(resolveWidget(wc, lens, linked), shared ? null : ekey, lens, linked)
  const setText = (all: EntityText) => {
    // titres indépendants : titre et sous-titre sont propres à la lecture affichée (Besoins générés / adressables)
    const { title, subtitle, ...other } = all
    let p: EntityText = all
    if (!linked && wc.kind !== 'headline' && (title !== undefined || subtitle !== undefined)) {
      const own: EntityText = { ...(title !== undefined ? { title } : {}), ...(subtitle !== undefined ? { subtitle } : {}) }
      if (ekey && !shared) updateWidgetEntity(wc.id, lensTextKey(ekey, lens), own)
      else {
        updateWidgetLens(wc.id, lens, own)
        // une saisie propre à un scénario / acteur ne doit pas masquer le titre commun qu'on vient de modifier
        const fields = Object.keys(own)
        if (wc.entityText) updateWidget(wc.id, { entityText: Object.fromEntries(Object.entries(wc.entityText).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).filter(([f]) => !fields.includes(f)))])) })
      }
      if (!Object.keys(other).length) return
      p = other
    }
    if (ekey && !shared) return updateWidgetEntity(wc.id, ekey, p)
    const keys = Object.keys(p) as (keyof EntityText)[]
    const entityText = wc.entityText
      ? Object.fromEntries(Object.entries(wc.entityText).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).filter(([f]) => !keys.includes(f as keyof EntityText)))]))
      : undefined
    updateWidget(wc.id, { ...p, ...(entityText ? { entityText } : {}) })
  }
  const eff = resolveWidget(wc, env.snap.lens)
  const setL = (p: LensOverride) => updateWidgetLens(wc.id, env.snap.lens, p)
  const ok = ds ? compatibleCharts(ds) : []
  const curType = eff.chartType && ok.includes(eff.chartType) ? eff.chartType : def?.defaultChart
  const num = (k: 'x' | 'y' | 'w' | 'h', label: string, min: number, max: number) => {
    const half = k === 'y' || k === 'h' // hauteurs et positions verticales : demi-unités acceptées (2,5)
    return <Field label={label}><NumberInput value={li?.[k]} min={min} max={max} step={half ? 0.5 : 1} onChange={(v) => v !== undefined && updateLayoutItem(wc.id, { [k]: half ? Math.round(v * 2) / 2 : Math.round(v) })} /></Field>
  }
  return (
    <Drawer title="Réglages du bloc" onClose={() => patchUI({ panel: null, selectedWidget: null })}>
      {ekey && (
        <>
          <p className="drawer-help">Textes de <b>{env.route.kind === 'scenario' ? scenarioTitle(env.scenarioName(env.route.scenario)) : env.route.kind === 'actor' ? env.actorLabel(env.route.actor) : ''}</b> : ce qui est saisi ici ne concerne que cette page.</p>
          <label className="inline"><input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} /> Modifier le texte de tous les {env.route.kind === 'scenario' ? 'scénarios' : 'acteurs'}</label>
        </>
      )}
      {wc.kind === 'headline' && (
        <HeadlineEditor wc={rw} env={env} entity={!!ekey && !shared}
          onPatch={(p) => (ekey && !shared ? updateWidgetEntity(wc.id, ekey, { headline: p }) : setText({ headline: Object.keys(p).length ? p : undefined }))}
          onReset={() => (ekey && !shared ? updateWidgetEntity(wc.id, ekey, { headline: { kicker: '', title: '', bullets: '' } }) : setText({ headline: undefined }))} />
      )}
      <LabelFields wc={wc} env={env} />
      {!['headline', 'kpis', 'actorKpis', 'scenarioCards'].includes(wc.kind) && (
        <label className="inline" title="Décoché : le titre et le sous-titre de chaque bloc peuvent différer entre « Besoins générés » et « Besoins adressables » (lecture affichée en ce moment). Valable pour tous les blocs.">
          <input type="checkbox" checked={linked} onChange={(e) => setTitlesLinked(e.target.checked)} /> Mêmes titres pour « Besoins générés » et « Besoins adressables »
        </label>
      )}
      {wc.kind !== 'headline' && <Field label="Titre" hint="Légende « [unité ; date] » : écrivez {unité} pour que l'unité suive le réglage (MW IT, kW…)"><input type="text" value={widgetTitle(rw)} onChange={(e) => setText({ title: e.target.value })} /></Field>}
      {wc.kind !== 'headline' && <Field label="Sous-titre"><input type="text" value={widgetSubtitle(rw)} onChange={(e) => setText({ subtitle: e.target.value })} /></Field>}
      {wc.kind === 'text' && <Field label="Contenu"><textarea rows={9} value={rw.text ?? ''} onChange={(e) => setText({ text: e.target.value })} /></Field>}
      {wc.kind !== 'section' && wc.kind !== 'headline' && <Field label="Note de bas de carte" hint="Annotation ou précision méthodologique affichée sous le widget"><textarea rows={2} value={rw.note ?? ''} onChange={(e) => setText({ note: e.target.value || undefined })} /></Field>}

      {wc.kind === 'chart' && ds && (
        <>
          <h4>Graphique</h4>
          <p className="drawer-help">Ces réglages (type, légende, décimales, axes, séries) sont propres à la lecture <b>{env.label(`lens:${env.snap.lens}`, LENS_LABEL[env.snap.lens])}</b> : l'autre lecture garde les siens.</p>
          <Field label="Type de visualisation" hint="Seuls les types compatibles avec ces données sont proposés">
            <select value={curType} onChange={(e) => setL({ chartType: e.target.value as ChartType })}>
              {ok.map((t) => <option key={t} value={t}>{CHART_LABELS[t]}</option>)}
            </select>
          </Field>
          {curType !== 'table' && <label className="inline"><input type="checkbox" checked={eff.legend ?? true} onChange={(e) => setL({ legend: e.target.checked })} /> Afficher la légende</label>}
          {def?.supportsInitial && <label className="inline"><input type="checkbox" checked={!!wc.showInitial} onChange={(e) => set({ showInitial: e.target.checked })} /> Afficher la valeur initiale (2026) : départ des courbes, repère sur les barres, barre 2026</label>}
          <Field label="Décimales (vide = automatique)"><NumberInput value={eff.decimals} min={0} max={4} onChange={(v) => setL({ decimals: v })} /></Field>
          {curType !== 'table' && curType !== 'donut' && curType !== 'pie' && (
            <>
              <div className="grid2">
                <Field label="Axe : minimum"><NumberInput value={eff.axisMin} step={0.5} placeholder="auto" onChange={(v) => setL({ axisMin: v })} /></Field>
                <Field label="Axe : maximum"><NumberInput value={eff.axisMax} step={0.5} placeholder="auto" onChange={(v) => setL({ axisMax: v })} /></Field>
              </div>
              <p className="drawer-help">Dans l'unité affichée ({env.unit(ds?.format ?? 'power')}). Vide = automatique.</p>
            </>
          )}
          <SeriesList wc={wc} env={env} />
        </>
      )}

      {wc.kind === 'drivers' && (
        <>
          <h4>Hypothèses</h4>
          <Field label="Curseurs des 3 scénarios">
            <select value={wc.hypMode === 'three' || (!wc.hypMode && wc.showAllScenarios) ? 'three' : 'together'} onChange={(e) => set({ hypMode: e.target.value as HypMode, showAllScenarios: undefined })}>
              <option value="together">Groupés (valeur du Central, même %)</option><option value="three">Indépendants (un curseur par scénario)</option>
            </select>
          </Field>
          <p className="drawer-help">Le bandeau suit la page : Besoins générés, Besoins adressables ou l'acteur affiché, chacun avec sa propre liste. Choisissez les hypothèses avec « Afficher / masquer » dans le bloc.</p>
        </>
      )}

      <h4>Taille et position</h4>
      <div className="grid2">
        {num('w', 'Largeur (colonnes, 1–24)', 1, 24)}
        {num('h', 'Hauteur (lignes)', 1, 80)}
        {num('x', 'Colonne', 0, 23)}
        {num('y', 'Ligne', 0, 500)}
      </div>
      <p className="drawer-help">Vous pouvez aussi tirer les bords et les coins du bloc à la souris.</p>

      <h4>Couleurs de la carte</h4>
      <ColorField label="Fond" value={wc.bg} fallback={env.tokens.surface} onChange={(v) => set({ bg: v })} />
      <ColorField label="Texte" value={wc.fg} fallback={env.tokens.text} onChange={(v) => set({ fg: v })} />

      <div className="drawer-actions">
        <button onClick={() => set({ visible: false })}>Masquer</button>
        <button className="danger" onClick={() => removeWidget(wc.id)}>Supprimer</button>
      </div>
    </Drawer>
  )
}

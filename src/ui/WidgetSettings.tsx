import { CHART_LABELS, compatibleCharts, DATASET_BY_ID, type ChartType } from '../core/datasets'
import type { SeriesStyle, WidgetConfig } from '../config/types'
import { headlineTokens } from '../core/headlineText'
import { KPI_BY_ID } from '../core/kpis'
import { LABEL_DEFS } from './labels'
import { patchUI, removeWidget, setLabel, updateLayoutItem, updateWidget } from '../state/store'
import { useDataset, type Env } from './env'
import { ColorField, Drawer, Field, NumberInput } from './fields'
import { prepareDataset } from './prepare'
import { widgetSubtitle, widgetTitle } from './WidgetFrame'

function SeriesList({ wc, env }: { wc: WidgetConfig; env: Env }) {
  const ds = useDataset(wc.datasetId, env)
  if (!ds || ds.series.length < 2 || ds.kind === 'bridge' || ds.kind === 'sensitivity') return null
  const colors = prepareDataset(ds, {}, env.tokens).colors
  const order = (wc.seriesOrder?.length ? [...wc.seriesOrder, ...ds.series.map((s) => s.id).filter((id) => !wc.seriesOrder!.includes(id))] : ds.series.map((s) => s.id))
  const patch = (id: string, p: Partial<SeriesStyle>) => updateWidget(wc.id, { series: { ...wc.series, [id]: { ...wc.series?.[id], ...p } } })
  const move = (id: string, d: -1 | 1) => {
    const o = [...order]; const i = o.indexOf(id); const j = i + d
    if (j < 0 || j >= o.length) return
    ;[o[i], o[j]] = [o[j], o[i]]
    updateWidget(wc.id, { seriesOrder: o })
  }
  return (
    <div className="series-list">
      <h4>Séries</h4>
      {order.map((id) => {
        const s = ds.series.find((x) => x.id === id)
        if (!s) return null
        const st = wc.series?.[id]
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
function HeadlineEditor({ wc, env }: { wc: WidgetConfig; env: Env }) {
  const route = env.route
  const tokens = headlineTokens(env.snap, env.f, env.scenarioName, route.kind === 'actor' ? { id: route.actor, name: env.actorLabel(route.actor) } : undefined)
  const h = wc.headline ?? {}
  const patch = (p: Partial<NonNullable<WidgetConfig['headline']>>) => {
    const next = { ...h, ...p }
    for (const k of Object.keys(next) as (keyof typeof next)[]) if (!next[k]) delete next[k]
    updateWidget(wc.id, { headline: Object.keys(next).length ? next : undefined })
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
      {wc.headline && <button className="link" onClick={() => updateWidget(wc.id, { headline: undefined })}>Revenir au texte généré</button>}
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
  const ok = ds ? compatibleCharts(ds) : []
  const curType = wc.chartType && ok.includes(wc.chartType) ? wc.chartType : def?.defaultChart
  const num = (k: 'x' | 'y' | 'w' | 'h', label: string, min: number, max: number) => (
    <Field label={label}><NumberInput value={li?.[k]} min={min} max={max} onChange={(v) => v !== undefined && updateLayoutItem(wc.id, { [k]: Math.round(v) })} /></Field>
  )
  return (
    <Drawer title="Réglages du bloc" onClose={() => patchUI({ panel: null, selectedWidget: null })}>
      {wc.kind === 'headline' && <HeadlineEditor wc={wc} env={env} />}
      <LabelFields wc={wc} env={env} />
      {wc.kind !== 'headline' && <Field label="Titre"><input type="text" value={widgetTitle(wc)} onChange={(e) => set({ title: e.target.value })} /></Field>}
      {wc.kind !== 'headline' && <Field label="Sous-titre"><input type="text" value={widgetSubtitle(wc)} onChange={(e) => set({ subtitle: e.target.value })} /></Field>}
      {wc.kind === 'text' && <Field label="Contenu"><textarea rows={9} value={wc.text ?? ''} onChange={(e) => set({ text: e.target.value })} /></Field>}
      {wc.kind !== 'section' && wc.kind !== 'headline' && <Field label="Note de bas de carte" hint="Annotation ou précision méthodologique affichée sous le widget"><textarea rows={2} value={wc.note ?? ''} onChange={(e) => set({ note: e.target.value || undefined })} /></Field>}

      {wc.kind === 'chart' && ds && (
        <>
          <h4>Graphique</h4>
          <Field label="Type de visualisation" hint="Seuls les types compatibles avec ces données sont proposés">
            <select value={curType} onChange={(e) => set({ chartType: e.target.value as ChartType })}>
              {ok.map((t) => <option key={t} value={t}>{CHART_LABELS[t]}</option>)}
            </select>
          </Field>
          {curType !== 'table' && <label className="inline"><input type="checkbox" checked={wc.legend ?? true} onChange={(e) => set({ legend: e.target.checked })} /> Afficher la légende</label>}
          <Field label="Décimales (vide = automatique)"><NumberInput value={wc.decimals} min={0} max={4} onChange={(v) => set({ decimals: v })} /></Field>
          {curType !== 'table' && curType !== 'donut' && curType !== 'pie' && (
            <>
              <div className="grid2">
                <Field label="Axe : minimum"><NumberInput value={wc.axisMin} step={0.5} placeholder="auto" onChange={(v) => set({ axisMin: v })} /></Field>
                <Field label="Axe : maximum"><NumberInput value={wc.axisMax} step={0.5} placeholder="auto" onChange={(v) => set({ axisMax: v })} /></Field>
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
          <label className="inline"><input type="checkbox" checked={!!wc.showAllScenarios} onChange={(e) => set({ showAllScenarios: e.target.checked })} /> Afficher les trois scénarios</label>
          {env.route.kind === 'actor' && (
            <label className="inline"><input type="checkbox" checked={wc.hypSource === 'actor'} onChange={(e) => set({ hypSource: e.target.checked ? 'actor' : 'visible' })} /> Seulement les hypothèses de l'acteur</label>
          )}
          <p className="drawer-help">Choisissez les hypothèses affichées avec « Afficher / masquer » dans le bloc.</p>
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

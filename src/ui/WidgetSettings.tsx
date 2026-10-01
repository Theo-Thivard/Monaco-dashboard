import { CHART_LABELS, compatibleCharts, DATASET_BY_ID, type ChartType } from '../core/datasets'
import type { SeriesStyle, WidgetConfig } from '../config/types'
import { patchUI, removeWidget, updateLayoutItem, updateWidget } from '../state/store'
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

export function WidgetSettings({ wc, env }: { wc: WidgetConfig; env: Env }) {
  const ds = useDataset(wc.datasetId, env)
  const def = wc.datasetId ? DATASET_BY_ID[wc.datasetId] : undefined
  const li = env.config.layout.find((l) => l.i === wc.id)
  const set = (p: Partial<WidgetConfig>) => updateWidget(wc.id, p)
  const ok = ds ? compatibleCharts(ds) : []
  const curType = wc.chartType && ok.includes(wc.chartType) ? wc.chartType : def?.defaultChart
  const num = (k: 'x' | 'y' | 'w' | 'h', label: string, min: number, max: number) => (
    <Field label={label}><NumberInput value={li?.[k]} min={min} max={max} onChange={(v) => v !== undefined && updateLayoutItem(wc.id, { [k]: Math.round(v) })} /></Field>
  )
  return (
    <Drawer title="Réglages du widget" onClose={() => patchUI({ panel: null, selectedWidget: null })}>
      <Field label="Titre"><input type="text" value={widgetTitle(wc)} onChange={(e) => set({ title: e.target.value })} /></Field>
      <Field label="Sous-titre"><input type="text" value={widgetSubtitle(wc)} onChange={(e) => set({ subtitle: e.target.value })} /></Field>
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
          <SeriesList wc={wc} env={env} />
        </>
      )}

      <h4>Taille et position</h4>
      <div className="grid2">
        {num('w', 'Largeur (colonnes, 1–24)', 1, 24)}
        {num('h', 'Hauteur (lignes)', 1, 80)}
        {num('x', 'Colonne', 0, 23)}
        {num('y', 'Ligne', 0, 500)}
      </div>
      <p className="drawer-help">Vous pouvez aussi tirer les bords et les coins du widget à la souris.</p>

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

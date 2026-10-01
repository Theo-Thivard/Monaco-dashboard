import { CATALOG } from './catalog'
import { SCENARIOS } from './model'
import { useStore, type WidgetCfg } from './store'

type Props =
  | { mode: 'widget'; cfg: WidgetCfg; onClose: () => void }
  | { mode: 'global'; onClose: () => void; onExport: () => void; onImport: () => void }

function ColorField({ label, value, fallback, onChange }: { label: string; value?: string; fallback: string; onChange: (v?: string) => void }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="color-row">
        <input type="color" value={value ?? fallback} onChange={(e) => onChange(e.target.value)} />
        <button className="link" onClick={() => onChange(undefined)} disabled={!value}>défaut</button>
      </div>
    </div>
  )
}

export function SettingsPanel(props: Props) {
  const s = useStore()
  if (props.mode === 'widget') {
    const { cfg } = props
    const c = CATALOG[Object.keys(CATALOG).find((k) => CATALOG[k].type === cfg.type && CATALOG[k].group === cfg.group) ?? '']
    const dark = s.theme.mode === 'dark'
    const set = (p: Partial<WidgetCfg>) => s.updateWidget(cfg.id, p)
    return (
      <aside className="panel">
        <div className="panel-head"><b>Réglages du widget</b><button onClick={props.onClose}>✕</button></div>
        <div className="field"><label>Titre</label><input type="text" value={cfg.title} onChange={(e) => set({ title: e.target.value })} /></div>
        <ColorField label="Couleur de fond" value={cfg.bg} fallback={dark ? '#1b2230' : '#ffffff'} onChange={(v) => set({ bg: v })} />
        <ColorField label="Couleur du texte / graphique" value={cfg.fg} fallback={dark ? '#e6e9ef' : '#1d2433'} onChange={(v) => set({ fg: v })} />
        <ColorField label="Couleur de l'en-tête" value={cfg.headerBg} fallback={dark ? '#232c3d' : '#eef1f6'} onChange={(v) => set({ headerBg: v })} />
        {c?.scenario && (
          <div className="field">
            <label>Scénario affiché</label>
            <select value={String(cfg.scenario)} onChange={(e) => set({ scenario: e.target.value === 'global' ? 'global' : (Number(e.target.value) as 0 | 1 | 2) })}>
              <option value="global">Suit le sélecteur global</option>
              {SCENARIOS.map((n, i) => <option key={n} value={i}>{n}</option>)}
            </select>
          </div>
        )}
        {c?.kind === 'graphique' && c.type !== 'kpi' && (
          <div className="field row"><input id="lg" type="checkbox" checked={cfg.legend} onChange={(e) => set({ legend: e.target.checked })} /><label htmlFor="lg">Afficher la légende</label></div>
        )}
        <button className="danger" onClick={() => s.removeWidget(cfg.id)}>Supprimer ce widget</button>
      </aside>
    )
  }

  const t = s.theme
  const blockNames = ['DSP', 'DENJS + APDP + DITN', 'CHPG', 'Monaco Telecom', 'Finance', 'Privé hors finance']
  return (
    <aside className="panel">
      <div className="panel-head"><b>Options générales</b><button onClick={props.onClose}>✕</button></div>
      <div className="field">
        <label>Thème</label>
        <div className="seg">
          {(['dark', 'light'] as const).map((m) => <button key={m} className={t.mode === m ? 'on' : ''} onClick={() => s.setTheme({ mode: m })}>{m === 'dark' ? 'Sombre' : 'Clair'}</button>)}
        </div>
      </div>
      <h4>Couleurs des scénarios</h4>
      {SCENARIOS.map((n, i) => (
        <div className="field row" key={n}>
          <input type="color" value={t.scenarioColors[i]} onChange={(e) => s.setTheme({ scenarioColors: t.scenarioColors.map((c, j) => (j === i ? e.target.value : c)) })} />
          <label>{n}</label>
        </div>
      ))}
      <h4>Couleurs des blocs / séries</h4>
      {blockNames.map((n, i) => (
        <div className="field row" key={n}>
          <input type="color" value={t.blockColors[i]} onChange={(e) => s.setTheme({ blockColors: t.blockColors.map((c, j) => (j === i ? e.target.value : c)) })} />
          <label>{n}</label>
        </div>
      ))}
      <h4>Modèle</h4>
      <div className="field row">
        <input id="fix" type="checkbox" checked={s.options.fixChpg} onChange={(e) => s.setOptions({ fixChpg: e.target.checked })} />
        <label htmlFor="fix">Corriger CHPG : appliquer le « surcroît santé » au besoin métier (sans effet dans l'Excel actuel)</label>
      </div>
      <h4>Mise en page &amp; hypothèses</h4>
      <div className="btns">
        <button onClick={props.onExport}>⬇ Exporter la config (JSON)</button>
        <button onClick={props.onImport}>⬆ Importer une config</button>
        <button onClick={s.resetParams}>↺ Hypothèses = Excel</button>
        <button className="danger" onClick={() => { if (confirm('Rétablir la mise en page et les couleurs par défaut ?')) s.resetLayout() }}>Rétablir la mise en page</button>
      </div>
      <p className="hint">La configuration (hypothèses, positions, tailles, couleurs) est enregistrée automatiquement dans ce navigateur. Exportez-la pour la sauvegarder ou la partager.</p>
    </aside>
  )
}

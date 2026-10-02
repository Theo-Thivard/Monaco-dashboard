import { getModel } from '../core/model'
import type { Env } from './env'

export const SOURCE_LABEL = { github: 'GitHub (version en ligne, lue au lancement)', bundled: 'copie déployée avec le site', file: 'fichier local' } as const

/** Source du modèle : fichier Excel, origine, contrôles de cohérence, valeurs de base lues, correspondance hypothèses ↔ cellules. */
export function ModelInfo({ env }: { env: Env }) {
  const m = getModel()
  const { meta, diagnostics, wb } = m
  const when = new Date(meta.loadedAt).toLocaleString('fr-FR')
  const hyps = Object.entries(m.hypAddr)
  return (
    <div className="modelinfo">
      <dl className="mi-facts">
        <dt>Fichier</dt><dd><a href={__MODEL_REPO_URL__} target="_blank" rel="noreferrer">{meta.fileName}</a></dd>
        <dt>Origine</dt><dd>{SOURCE_LABEL[meta.source]}</dd>
        {meta.lastModified && <><dt>Dernière modification</dt><dd>{new Date(meta.lastModified).toLocaleString('fr-FR')}</dd></>}
        <dt>Lu le</dt><dd>{when}</dd>
        <dt>Contenu</dt><dd>{wb.sheets.length} onglets · {wb.formulaCount} formules lues et recalculées par le tableau de bord</dd>
      </dl>
      <h5>Contrôles</h5>
      {diagnostics.length === 0
        ? <p className="mi-ok">✓ Toutes les formules ont été lues et recalculées ; les totaux sont cohérents avec la somme des blocs et avec l'onglet de synthèse.</p>
        : <ul className="mi-diag">{diagnostics.map((d, i) => <li key={i} className={d.level}>{d.level === 'error' ? '✕' : d.level === 'warning' ? '⚠' : 'ℹ'} {d.message}{d.where ? ` (${d.where})` : ''}</li>)}</ul>}
      <details>
        <summary>Valeurs de base lues dans l'Excel ({m.fixedInputs.length})</summary>
        <p className="muted small">Constantes de l'Excel qui alimentent le résultat sans être pilotables dans le tableau de bord (baselines, effectifs…). Modifiez-les dans l'Excel.</p>
        <table className="data"><tbody>{m.fixedInputs.map((f) => <tr key={f.where}><th scope="row">{f.label}</th><td>{f.value.toLocaleString('fr-FR', { maximumFractionDigits: 6 })}</td><td className="muted">{f.where.split('!')[1]}</td></tr>)}</tbody></table>
      </details>
      <details>
        <summary>Correspondance hypothèses ↔ cellules ({hyps.length})</summary>
        <p className="muted small">Chaque hypothèse du tableau de bord est reliée à sa ligne de l'Excel par son intitulé : insérer des lignes ne casse pas le lien.</p>
        <table className="data"><tbody>{hyps.map(([id, cells]) => <tr key={id}><th scope="row">{env.hypLabel(id)}</th><td className="muted">{cells.join(', ')}</td></tr>)}</tbody></table>
      </details>
    </div>
  )
}

import type { Env } from './env'
import type { PreparedDataset } from './prepare'

/** Tableau d'un jeu de données : mêmes séries, mêmes valeurs, même formateur que le graphique. */
export function DataTable({ prepared, env, decimals }: { prepared: PreparedDataset; env: Env; decimals?: number }) {
  const { ds } = prepared
  const o = { decimals }
  const transposed = ds.kind === 'timeseries' // lignes = années
  const showTotals = !transposed && ds.kind !== 'bridge' && ds.kind !== 'sensitivity' && ds.series.every((s) => s.total !== undefined)
  const signed = (i: number) => ds.kind === 'sensitivity' || (ds.kind === 'bridge' && ds.steps?.[i] === 'delta')

  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th />
            {ds.series.map((s) => (
              <th key={s.id}><span className="swatch" style={{ background: prepared.colors[s.id] }} />{s.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ds.categories.map((c, i) => (
            <tr key={c + i}>
              <th scope="row">{c}</th>
              {ds.series.map((s) => (
                <td key={s.id}>{env.fmt(s.format ?? ds.format, s.values[i], { ...o, unit: false, sign: signed(i) })}</td>
              ))}
            </tr>
          ))}
        </tbody>
        {showTotals && (
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              {ds.series.map((s) => <td key={s.id}>{env.fmt(s.format ?? ds.format, s.total!, { ...o, unit: false })}</td>)}
            </tr>
          </tfoot>
        )}
      </table>
      <div className="table-unit">{env.unit(ds.format)}</div>
    </div>
  )
}

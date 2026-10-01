import { groupBlocks, SCENARIOS } from '../model'
import { useStore } from '../store'

const f2 = (v: number) => (v / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function DataTable() {
  const { results, theme } = useStore()
  const g = results.map(groupBlocks)
  const rows = g[0].map((b, i) => ({ label: b.label, base: b.base, tot: g.map((x) => x[i].total), adr: g.map((x) => x[i].addressable) }))
  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + f(r), 0)
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th rowSpan={2}>Bloc</th><th rowSpan={2}>2026</th>
            <th colSpan={3}>Besoin total 2035</th><th colSpan={3}>Demande adressable 2035</th>
          </tr>
          <tr>
            {[0, 1].flatMap((k) => SCENARIOS.map((s, i) => <th key={k + s} style={{ color: theme.scenarioColors[i] }}>{s}</th>))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}><td>{r.label}</td><td>{f2(r.base)}</td>{r.tot.map((v, i) => <td key={'t' + i}>{f2(v)}</td>)}{r.adr.map((v, i) => <td key={'a' + i}>{f2(v)}</td>)}</tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td>Total</td><td>{f2(sum((r) => r.base))}</td>{[0, 1, 2].map((i) => <td key={'t' + i}>{f2(sum((r) => r.tot[i]))}</td>)}{[0, 1, 2].map((i) => <td key={'a' + i}>{f2(sum((r) => r.adr[i]))}</td>)}</tr>
        </tfoot>
      </table>
    </div>
  )
}

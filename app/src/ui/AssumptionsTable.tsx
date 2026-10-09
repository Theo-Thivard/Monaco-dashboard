import { isDeadHyp } from '../core/actors'
import { CATEGORIES, HYPS } from '../core/hypotheses'
import type { Env } from './env'

/** Registre complet des hypothèses : valeurs courantes, défaut Excel, plage, source. */
export function AssumptionsTable({ env }: { env: Env }) {
  const { snap } = env
  return (
    <div className="table-wrap">
      <table className="data assumptions">
        <thead>
          <tr><th>Hypothèse</th><th>{env.scenarioName(0)}</th><th>{env.scenarioName(1)}</th><th>{env.scenarioName(2)}</th><th>Plage</th><th>Source</th></tr>
        </thead>
        <tbody>
          {CATEGORIES.map((c) => (
            <FragmentRows key={c.id} title={c.title}>
              {HYPS.filter((h) => h.category === c.id).map((h) => {
                const cur = snap.params[h.id]
                const cells = h.single ? [cur[0]] : cur
                return (
                  <tr key={h.id}>
                    <th scope="row">{env.hypLabel(h.id)}{h.note && <span className="tag" title={h.note}> ⓘ</span>}{isDeadHyp(h.id) && <span className="tag" title="Sans effet dans l'Excel actuel"> ⚠ sans effet</span>}</th>
                    {h.single
                      ? <td colSpan={3} className="center">{cell(env, h.id, cells[0], h.def[0])}</td>
                      : cells.map((v, i) => <td key={i}>{cell(env, h.id, v, h.def[i])}</td>)}
                    <td className="muted">{h.control === 'radio' ? '—' : `${env.fmtHypValue(h.id, h.min)} – ${env.fmtHypValue(h.id, h.max)}`}</td>
                    <td className="muted">{h.source}{h.excelRow !== '—' ? ` · L.${h.excelRow}` : ''}</td>
                  </tr>
                )
              })}
            </FragmentRows>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const cell = (env: Env, id: string, v: number, def: number) => (
  <span className={v !== def ? 'mod' : ''} title={v !== def ? `Valeur Excel : ${env.fmtHypValue(id, def)}` : undefined}>{env.fmtHypValue(id, v)}</span>
)

function FragmentRows({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <tr className="cat-row"><td colSpan={6}>{title}</td></tr>
      {children}
    </>
  )
}

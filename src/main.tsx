import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { loadModel } from './core/modelLoader'
import { ModelError, setModel } from './core/model'

const root = createRoot(document.getElementById('root')!)

function Boot({ children }: { children: React.ReactNode }) {
  return <div className="boot"><div className="boot-card">{children}</div></div>
}

root.render(<Boot><h1>Chargement du modèle Excel…</h1><p>Lecture des valeurs et des formules du classeur.</p></Boot>)

async function start() {
  try {
    setModel(await loadModel())
  } catch (e) {
    const diag = (e as { diagnostics?: { level: string; message: string; where?: string }[] }).diagnostics ?? []
    root.render(
      <Boot>
        <h1>Le modèle Excel n'a pas pu être chargé</h1>
        <p>{e instanceof ModelError ? e.message : String(e)}</p>
        {diag.length > 0 && <ul>{diag.map((d, i) => <li key={i}>{d.message}{d.where ? <> (<code>{d.where}</code>)</> : null}</li>)}</ul>}
        <p>Le dashboard lit l'Excel par ses intitulés de lignes et de colonnes : vérifiez qu'ils n'ont pas été renommés, ou demandez la mise à jour du dashboard.</p>
      </Boot>,
    )
    return
  }
  // le store lit les valeurs par défaut de l'Excel au chargement du module : on ne l'importe qu'une fois le modèle prêt
  const { default: App } = await import('./App')
  root.render(<StrictMode><App /></StrictMode>)
}
void start()

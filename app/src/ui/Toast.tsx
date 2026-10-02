import { useUI } from '../state/store'

export function Toast() {
  const t = useUI().toast
  if (!t) return null
  return (
    <div className="toast" role="status" key={t.id}>
      <span>{t.msg}</span>
      {t.undo && <button onClick={t.undo}>Annuler</button>}
    </div>
  )
}

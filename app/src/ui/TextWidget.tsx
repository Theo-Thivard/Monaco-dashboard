/** Texte simple : paragraphes et puces (« - »). */
export function TextWidget({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/)
  return (
    <div className="prose">
      {blocks.map((b, i) => {
        const lines = b.split('\n')
        if (lines.every((l) => l.trim().startsWith('- '))) return <ul key={i}>{lines.map((l, j) => <li key={j}>{l.replace(/^\s*-\s*/, '')}</li>)}</ul>
        return <p key={i}>{b}</p>
      })}
    </div>
  )
}

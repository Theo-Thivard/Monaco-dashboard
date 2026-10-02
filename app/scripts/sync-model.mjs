// Copie le classeur Excel du dépôt (Monaco_Besoins_IT_v<N>.xlsx, version la plus élevée) vers public/model.xlsx :
// c'est la copie « embarquée » que le dashboard lit au lancement si la version en ligne (GitHub) est inaccessible.
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
// le classeur est à la racine du dépôt (un niveau au-dessus de ce dossier) ; anciennes dispositions : ici
const modelDir = [join(root, '..'), root].find((d) => readdirSync(d).some((f) => /^Monaco_Besoins_IT_v\d+\.xlsx$/.test(f))) ?? join(root, '..')
const files = readdirSync(modelDir).filter((f) => /^Monaco_Besoins_IT_v\d+\.xlsx$/.test(f))
  .sort((a, b) => Number(b.match(/v(\d+)/)[1]) - Number(a.match(/v(\d+)/)[1]))
if (!files.length) { console.error('Aucun fichier Monaco_Besoins_IT_v<N>.xlsx à la racine du dépôt.'); process.exit(1) }
mkdirSync(join(root, 'public'), { recursive: true })
copyFileSync(join(modelDir, files[0]), join(root, 'public', 'model.xlsx'))
console.log(`Modèle Excel embarqué : ${files[0]}`)

// Les tests chargent le vrai classeur Excel du dépôt, comme le fait l'application au lancement.
import { readFileSync, readdirSync } from 'node:fs'
import { buildModel, setModel } from '../core/model'

// classeur à la racine du dépôt (au-dessus du dossier app/)
const root = new URL('../../../', import.meta.url)
const file = readdirSync(root).filter((f) => /^Monaco_Besoins_IT_v\d+\.xlsx$/.test(f)).sort((a, b) => Number(b.match(/v(\d+)/)![1]) - Number(a.match(/v(\d+)/)![1]))[0]
setModel(buildModel(readFileSync(new URL(file, root)), { fileName: file, source: 'file', loadedAt: 0 }))

// Met à jour, dans le README, la liste des affichages enregistrés (app/variants/index.json) avec un lien cliquable chacun.
// Le texte entre <!-- AFFICHAGES:DEBUT --> et <!-- AFFICHAGES:FIN --> est entièrement réécrit ; le reste du README n'est pas touché.
// Usage : node app/scripts/update-readme.mjs   (depuis la racine du dépôt ; lancé automatiquement à chaque publication)
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const app = join(dirname(fileURLToPath(import.meta.url)), '..')
const readme = join(app, '..', 'README.md')
const SITE = 'https://theo-thivard.github.io/Monaco-dashboard/'
const variants = JSON.parse(readFileSync(join(app, 'variants', 'index.json'), 'utf8'))

const rows = variants.slice().reverse().map((v) => `| [${v.label}](${SITE}${v.slug}/) | ${v.base.toUpperCase()} | ${v.created} |`)
const block = [
  '<!--AFFICHAGES:DEBUT-->',
  rows.length
    ? ['| Affichage enregistré (cliquez pour ouvrir) | Version de base | Créé le |', '|---|---|---|', ...rows].join('\n')
    : '_Aucun affichage enregistré pour l\'instant._',
  '<!--AFFICHAGES:FIN-->',
].join('\n')

const text = readFileSync(readme, 'utf8')
const re = /<!--AFFICHAGES:DEBUT-->[\s\S]*?<!--AFFICHAGES:FIN-->/
// Repères absents (section retirée du README) : rien à mettre à jour, et ce n'est pas une erreur — la publication du site ne doit pas échouer pour ça.
if (!re.test(text)) { console.log('Repères <!--AFFICHAGES:DEBUT--> / <!--AFFICHAGES:FIN--> absents du README : liste des affichages ignorée.'); process.exit(0) }
const next = text.replace(re, block)
if (next !== text) { writeFileSync(readme, next); console.log('README mis à jour.') } else console.log('README déjà à jour.')

// Ajoute aux versions ARCHIVÉES (figées) un bandeau discret « Autres versions » pour revenir à la version actuelle.
// Usage : node scripts/inject-banner.mjs <dist> <préfixe, p. ex. /Monaco-dashboard> <slug> [<slug> …]
// Idempotent : un bandeau déjà présent n'est pas dupliqué.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const [dist, prefix, ...slugs] = process.argv.slice(2)
const read = (p, d) => { try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return d } }
const current = read('version.json', { slug: 'v7', label: 'V7' })
const archived = read('versions.json', [])
const variants = read('variants/index.json', [])
const entries = [
  { label: `${current.label} (actuelle)`, path: '' },
  ...variants.map((v) => ({ label: v.label, path: `${v.slug}/` })),
  ...archived.slice().reverse().map((v) => ({ label: v.label, path: `${v.slug}/` })),
]
const MARK = '<!--monaco-versions-->'
const banner = (slug) => `${MARK}
<style>
#mv{position:fixed;right:14px;bottom:14px;z-index:2147483000;font:13px/1.4 system-ui,sans-serif}
#mv button{background:#0b2545;color:#fff;border:0;border-radius:999px;padding:8px 14px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.25)}
#mv ul{display:none;list-style:none;margin:0 0 8px;padding:6px;background:#fff;border:1px solid #d5d9e0;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.18)}
#mv.open ul{display:block}
#mv a{display:block;padding:6px 12px;color:#1d2433;text-decoration:none;border-radius:4px;white-space:nowrap}
#mv a:hover{background:#eef1f6}#mv a.cur{font-weight:600;color:#0b2545}
@media print{#mv{display:none}}
</style>
<div id="mv"><ul>${entries.map((e) => `<a href="${prefix}/${e.path}"${e.path === `${slug}/` ? ' class="cur"' : ''}>${e.label}${e.path === `${slug}/` ? ' · affichée' : ''}</a>`).map((a) => `<li>${a}</li>`).join('')}</ul><button type="button" aria-haspopup="true">Autres versions ▴</button></div>
<script>document.querySelector('#mv button').onclick=function(){document.getElementById('mv').classList.toggle('open')}</script>
`

for (const slug of slugs) {
  const file = `${dist}/${slug}/index.html`
  if (!existsSync(file)) continue
  const html = readFileSync(file, 'utf8')
  if (html.includes(MARK)) continue
  writeFileSync(file, html.includes('</body>') ? html.replace('</body>', `${banner(slug)}</body>`) : html + banner(slug))
}

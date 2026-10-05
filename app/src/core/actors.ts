// Registre des acteurs (blocs d'entités du modèle). Source unique pour la navigation,
// les pages « Acteurs » et la liste des hypothèses qui comptent pour chaque acteur
// (cette liste est vérifiée par un test contre le moteur).

import type { BlockResult, Entity, ScenarioResult } from './engine'
import { computeAll } from './engine'
import { defaultParams, HYPS, withValue, type Params } from './hypotheses'
import { getModel } from './model'

export interface ActorDef {
  id: Entity
  /** identifiant d'URL */
  slug: string
  /** libellé complet (navigation, titres) */
  label: string
  /** libellé court (graphiques) */
  short: string
  group: 'public' | 'private'
  description: string
  /** résumé de ce qui détermine le besoin (la formule exacte est lue dans l'Excel) */
  method: string
}

export const ACTOR_GROUPS: { id: 'public' | 'private'; title: string }[] = [
  { id: 'public', title: 'Secteur public & opérateur' },
  { id: 'private', title: 'Secteur privé' },
]

export const ACTORS: ActorDef[] = [
  {
    id: 'DSP', slug: 'dsp', label: 'DSP', short: 'DSP', group: 'public',
    description: 'Direction de la Sûreté Publique',
    method: 'Socle bureautique des agents et applications métier de vidéosurveillance (parc de caméras, débit par caméra), puis surcouche IA.',
  },
  {
    id: 'AUTRES', slug: 'autres-entites-publiques', label: 'Autres entités publiques', short: 'Autres entités publiques', group: 'public',
    description: 'Autres entités publiques (dont APDP, Caisses sociales, DENJS).',
    method: 'Projection générique du secteur public : croissance des effectifs et de l\'intensité numérique, puis surcouche IA.',
  },
  {
    id: 'POMP', slug: 'pompiers', label: 'Corps Sapeurs Pompiers', short: 'Sapeurs Pompiers', group: 'public',
    description: 'Corps des Sapeurs Pompiers',
    method: 'Croissance de l\'activité et de l\'intensité numérique, surcroît métier propre aux Pompiers, puis surcouche IA.',
  },
  {
    id: 'DITN', slug: 'ditn', label: 'DITN', short: 'DITN', group: 'public',
    description: 'Délégation Interministérielle chargée de la Transition Numérique.',
    method: 'Projection générique du secteur public : croissance des effectifs et de l\'intensité numérique, puis surcouche IA.',
  },
  {
    id: 'CHPG', slug: 'chpg', label: 'CHPG', short: 'CHPG', group: 'public',
    description: 'Centre Hospitalier Princesse Grace',
    method: 'Activité hospitalière et digitalisation de la santé, puis surcouche IA.',
  },
  {
    id: 'MT', slug: 'monaco-telecom', label: 'Monaco Telecom', short: 'Monaco Telecom', group: 'public',
    description: 'Besoins propres de Monaco Telecom',
    method: 'Croissance des effectifs et de l\'intensité du privé hors finance, surcouche IA du privé hors finance ; part captable du socle conventionnelle (secteur public).',
  },
  {
    id: 'FIN', slug: 'finance', label: 'Finance', short: 'Finance', group: 'private',
    description: 'Secteur financier monégasque',
    method: 'Salariés × puissance IT par salarié (baseline), croissance des effectifs et de l\'intensité (finance), surcouche IA ; part captable propre au socle et à l\'IA.',
  },
  {
    id: 'PRIV', slug: 'prive-hors-finance', label: 'Privé hors finance', short: 'Privé hors finance', group: 'private',
    description: 'Secteur privé hors finance',
    method: 'Salariés × puissance IT par salarié (baseline), croissance des effectifs et de l\'intensité (hors finance), surcouche IA ; part captable propre au socle et à l\'IA.',
  },
]

export const ACTOR_BY_ID: Record<Entity, ActorDef> = Object.fromEntries(ACTORS.map((a) => [a.id, a])) as Record<Entity, ActorDef>
export const ACTOR_BY_SLUG: Record<string, ActorDef> = Object.fromEntries(ACTORS.map((a) => [a.slug, a]))

export const actorBlock = (r: ScenarioResult, id: Entity): BlockResult => r.blocks.find((b) => b.id === id)!

/**
 * Hypothèses qui font réellement varier un acteur : déterminées en interrogeant l'Excel (on perturbe chaque hypothèse
 * et on regarde quels acteurs bougent). Elles suivent donc automatiquement les formules de l'Excel.
 */
const cache = new WeakMap<object, Record<Entity, string[]>>()
export function actorHyps(id: Entity): string[] {
  const m = getModel()
  let c = cache.get(m)
  if (!c) {
    c = Object.fromEntries(ACTORS.map((a) => [a.id, [] as string[]])) as Record<Entity, string[]>
    const base: Params = defaultParams()
    const ref = computeAll(base)
    for (const h of HYPS) {
      const arr = base[h.id]
      const step = 0.1 * (h.max - h.min)
      let q: Params = base
      arr.forEach((v, i) => { q = withValue(q, h.id, i, v + step <= h.max ? v + step : v - step) })
      const alt = computeAll(q)
      for (const a of ACTORS) {
        const moved = [0, 1, 2].some((s) => {
          const x = actorBlock(alt[s], a.id), y = actorBlock(ref[s], a.id)
          return Math.abs(x.addressable - y.addressable) > 1e-9 || Math.abs(x.total - y.total) > 1e-9
        })
        if (moved) c[a.id].push(h.id)
      }
    }
    cache.set(m, c)
  }
  return c[id]
}

/** Hypothèses qui ne font bouger aucun acteur dans l'Excel actuel (p. ex. facteur multiplié par 0 après une modification de formule). */
export function deadHyps(): string[] {
  const used = new Set(ACTORS.flatMap((a) => actorHyps(a.id)))
  return HYPS.filter((h) => !used.has(h.id)).map((h) => h.id)
}
export const isDeadHyp = (id: string) => deadHyps().includes(id)

/** Réglage d'affichage des acteurs : ordre manuel (null = classement automatique décroissant) et acteurs masqués. */
export interface ActorPrefs { order: string[] | null; hidden: string[] }
/** Acteurs à afficher : masqués retirés ; ordre manuel s'il existe, sinon plus important d'abord (`value` décroissant). */
export function arrangeActors(prefs: ActorPrefs | undefined, value: (id: Entity) => number): Entity[] {
  const ids = ACTORS.map((a) => a.id).filter((id) => !prefs?.hidden.includes(id))
  const order = prefs?.order
  if (order) {
    const pos = (id: string) => { const i = order.indexOf(id); return i < 0 ? order.length + ACTORS.findIndex((a) => a.id === id) : i }
    return ids.sort((a, b) => pos(a) - pos(b))
  }
  return ids.sort((a, b) => value(b) - value(a))
}

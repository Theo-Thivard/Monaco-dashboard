import { describe, expect, it } from 'vitest'
import { ACTORS, ACTOR_BY_SLUG, actorBlock } from './actors'
import { computeScenario, ENTITIES } from './engine'
import { defaultParams, HYPS, withValue } from './hypotheses'

describe('registre des acteurs', () => {
  it('couvre exactement les blocs du modèle, slugs uniques', () => {
    expect(ACTORS.map((a) => a.id).sort()).toEqual([...ENTITIES].sort())
    expect(new Set(ACTORS.map((a) => a.slug)).size).toBe(ACTORS.length)
    for (const a of ACTORS) expect(ACTOR_BY_SLUG[a.slug].id).toBe(a.id)
  })

  // La liste d'hypothèses déclarée pour chaque acteur doit être EXACTEMENT l'ensemble de celles qui agissent
  // sur son besoin dans le moteur (la baseline compte : une hypothèse de baseline agit sur le besoin de l'acteur).
  it.each(ACTORS)('hypothèses de $label = hypothèses qui agissent dans le moteur', (actor) => {
    // deux états de méthode : le surcroît santé du CHPG n'agit que si « fixChpg » est activé
    const bases = [defaultParams(), withValue(defaultParams(), 'fixChpg', 0, 1)]
    const acting = new Set<string>()
    for (const base of bases) for (const h of HYPS) {
      // on teste chaque scénario : certaines hypothèses (p. ex. part adressable = 1 partout) ne bougent qu'à la baisse
      for (const s of [0, 1, 2]) {
        const v = h.single ? h.def[0] : h.def[s]
        const alt = h.control === 'radio' ? 1 - v : v + (v + (h.max - h.min) * 0.1 <= h.max ? 1 : -1) * (h.max - h.min) * 0.1
        const q = withValue(base, h.id, s, alt)
        const a = actorBlock(computeScenario(q, s), actor.id)
        const b = actorBlock(computeScenario(base, s), actor.id)
        if (Math.abs(a.addressable - b.addressable) > 1e-9 || Math.abs(a.total - b.total) > 1e-9) acting.add(h.id)
      }
    }
    expect([...acting].sort()).toEqual([...actor.hyps].sort())
  })
})

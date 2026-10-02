import { describe, expect, it } from 'vitest'
import { ACTORS, ACTOR_BY_SLUG, actorBlock, actorHyps } from './actors'
import { computeScenario, ENTITIES } from './engine'
import { defaultParams, HYPS, withValue } from './hypotheses'

describe('registre des acteurs', () => {
  it('couvre exactement les blocs du modèle, slugs uniques', () => {
    expect(ACTORS.map((a) => a.id).sort()).toEqual([...ENTITIES].sort())
    expect(new Set(ACTORS.map((a) => a.slug)).size).toBe(ACTORS.length)
    for (const a of ACTORS) expect(ACTOR_BY_SLUG[a.slug].id).toBe(a.id)
  })

  // Les hypothèses d'un acteur sont déterminées en interrogeant l'Excel : ici on vérifie la cohérence avec un test indépendant
  // (chaque hypothèse perturbée seule, dans chaque scénario) et quelques invariants métier.
  it.each(ACTORS)('hypothèses de $label = celles qui font réellement bouger l\'acteur', (actor) => {
    const base = defaultParams()
    const acting = new Set<string>()
    for (const h of HYPS) {
      for (const s of [0, 1, 2]) {
        const v = h.single ? h.def[0] : h.def[s]
        const alt = v + (v + (h.max - h.min) * 0.1 <= h.max ? 1 : -1) * (h.max - h.min) * 0.1
        const q = withValue(base, h.id, s, alt)
        const a = actorBlock(computeScenario(q, s), actor.id)
        const b = actorBlock(computeScenario(base, s), actor.id)
        if (Math.abs(a.addressable - b.addressable) > 1e-9 || Math.abs(a.total - b.total) > 1e-9) acting.add(h.id)
      }
    }
    expect([...acting].sort()).toEqual([...actorHyps(actor.id)].sort())
  })
})

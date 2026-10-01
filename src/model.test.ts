import { describe, expect, it } from 'vitest'
import { computeAll, defaultParams, computeScenario, groupBlocks } from './model'

// Valeurs de référence lues dans l'Excel (3_Output, valeurs calculées)
describe('modèle = Excel', () => {
  const r = computeAll(defaultParams())
  it('besoin total 2035 (MW)', () => {
    expect(r[0].total / 1000).toBeCloseTo(3.4177521013510312, 9)
    expect(r[1].total / 1000).toBeCloseTo(4.596242318192619, 9)
    expect(r[2].total / 1000).toBeCloseTo(6.372319811833375, 9)
  })
  it('demande adressable 2035 (MW)', () => {
    expect(r[0].addressable / 1000).toBeCloseTo(1.074571255414435, 9)
    expect(r[1].addressable / 1000).toBeCloseTo(1.8029989796641472, 9)
    expect(r[2].addressable / 1000).toBeCloseTo(3.5032891953120533, 9)
  })
  it('baseline 2026 (MW)', () => {
    expect(r[1].base / 1000).toBeCloseTo(2.46032, 9)
  })
  it('détail par groupe (central)', () => {
    const g = groupBlocks(r[1]).map((x) => x.addressable / 1000)
    expect(g[0]).toBeCloseTo(0.38532602837246177, 9)
    expect(g[1]).toBeCloseTo(0.1622636001416805, 9) // DENJS + APDP + DITN
    expect(g[4]).toBeCloseTo(0.2648391979621528, 9)
    expect(g[5]).toBeCloseTo(0.6118558423984622, 9)
  })
  it('trajectoire : 2026 = baseline, 2035 = Excel', () => {
    expect(computeScenario(defaultParams(), 1, 0).total).toBeCloseTo(2460.32, 6)
    expect(computeScenario(defaultParams(), 1, 9).total).toBeCloseTo(4596.242318192619, 6)
  })
})

import { describe, expect, it } from 'vitest'
import { createDefaultConfig } from './defaults'
import { chartTypo, defaultTypography, sanitizeTypography, typographyChanges } from './typography'
import { sanitizeConfig } from '../state/store'

describe('typographie', () => {
  it('une configuration ancienne (sans typographie) reçoit les valeurs par défaut', () => {
    const old = createDefaultConfig() as unknown as { theme: Record<string, unknown> }
    delete old.theme.typo
    expect(sanitizeConfig(old).theme.typo).toEqual(defaultTypography())
  })
  it('valeurs invalides ignorées, tailles bornées', () => {
    const t = sanitizeTypography({ titles: { size: 9, bold: true }, labels: { size: 'x', bold: 3 }, nope: { size: 2 } })
    expect(t.titles).toEqual({ size: 2, bold: true })
    expect(t.labels).toEqual({ size: 1, bold: false })
  })
  it('le zoom global se combine avec celui de la catégorie pour les graphiques', () => {
    const t = defaultTypography(); t.labels.size = 1.5; t.figures.bold = true
    const c = chartTypo(t, 1.2)
    expect(c.labels).toBeCloseTo(1.8); expect(c.figures).toBeCloseTo(1.2)
    expect(c).toMatchObject({ figuresBold: true, labelsBold: false })
    expect(typographyChanges(t)).toBe(2)
  })
})

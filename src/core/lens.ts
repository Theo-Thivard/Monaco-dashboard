// « Lentille » d'analyse : ce que l'on regarde.
//   need        = besoins IT GÉNÉRÉS à Monaco (livrable 2) : puissance IT que l'économie monégasque génère en 2035
//   addressable = besoins ADRESSABLES (livrable 3) : part de ces besoins hébergeable à Monaco
export type Lens = 'need' | 'addressable'
export const LENSES: Lens[] = ['need', 'addressable']
export const LENS_LABEL: Record<Lens, string> = { need: 'Besoins générés', addressable: 'Besoins adressables' }
export const LENS_HINT: Record<Lens, string> = { need: 'Livrable 2 · puissance IT générée à Monaco', addressable: 'Livrable 3 · part hébergeable à Monaco' }

/** Valeur d'un résultat (scénario, bloc ou acteur) selon la lentille. */
export const lensValue = (x: { total: number; addressable: number }, lens: Lens): number => (lens === 'need' ? x.total : x.addressable)

// Noms d'affichage des trois scénarios (l'Excel garde ses colonnes Bas / Central / Haut : seul l'affichage change).
// Chaque nom reste modifiable dans le tableau de bord (⚙ › Personnaliser › Formats › Libellés).

export const DEFAULT_SCENARIO_NAMES = ['Scénario de base', 'Scénario d\'accélération', 'Scénario de rupture'] as const

/** Dans une phrase : « le scénario d'accélération » (le nom commence déjà par « Scénario » : on évite « scénario Scénario… »). */
export function asScenario(name: string): string {
  return /^sc[ée]nario\b/i.test(name) ? name.charAt(0).toLowerCase() + name.slice(1) : `scénario ${name}`
}

/** Comme titre : « Scénario de base » (ajoute « Scénario » devant un nom qui ne le contient pas : « Bas » → « Scénario Bas »). */
export function scenarioTitle(name: string): string {
  return /^sc[ée]nario\b/i.test(name) ? name : `Scénario ${name}`
}

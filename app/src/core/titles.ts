// Légende des titres « [unité ; date] » : le jeton {unité} est remplacé à l'affichage par l'unité du graphique
// (suit donc le réglage MW / kW et le suffixe « IT »).

/** Remplace {unité} ; sans unité, retire aussi le séparateur : « [{unité} ; 2035] » → « [2035] ». */
export function fillUnit(s: string, unit: string): string {
  if (!s.includes('{unité}')) return s
  return unit ? s.replace(/\{unité\}/g, unit) : s.replace(/\{unité\}\s*;\s*/g, '').replace(/\{unité\}/g, '')
}

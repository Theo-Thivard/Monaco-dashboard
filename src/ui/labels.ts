import { OUTPUT_GROUPS } from '../core/engine'

/** Libellés personnalisables et leur valeur par défaut. */
export const LABEL_DEFS: { group: string; key: string; def: string }[] = [
  ...['Bas', 'Central', 'Haut'].map((d, i) => ({ group: 'Scénarios', key: `scenario:${i}`, def: d })),
  ...OUTPUT_GROUPS.map((g) => ({ group: 'Blocs', key: `block:${g.id}`, def: g.label })),
  { group: 'Séries', key: 'series:base', def: 'Besoin 2026' },
  { group: 'Séries', key: 'series:need', def: 'Besoin total 2035' },
  { group: 'Séries', key: 'series:addr', def: 'Demande adressable 2035' },
  { group: 'Séries', key: 'series:socle', def: 'Socle hors IA' },
  { group: 'Séries', key: 'series:ai', def: 'Surcouche IA' },
  { group: 'Séries', key: 'series:rate', def: 'Taux adressable' },
  { group: 'Séries', key: 'series:low', def: 'Valeur basse' },
  { group: 'Séries', key: 'series:high', def: 'Valeur haute' },
  { group: 'Cascade', key: 'bridge:base', def: 'Besoin 2026' },
  { group: 'Cascade', key: 'bridge:act', def: 'Effectifs & activité' },
  { group: 'Cascade', key: 'bridge:int', def: 'Intensité numérique' },
  { group: 'Cascade', key: 'bridge:ia', def: 'Surcouche IA' },
  { group: 'Cascade', key: 'bridge:total', def: 'Besoin 2035' },
  { group: 'Cascade', key: 'bridge:out', def: 'Hors Monaco' },
  { group: 'Cascade', key: 'bridge:addr', def: 'Adressable 2035' },
  { group: 'Écarts', key: 'whatChanged:ref', def: 'Référence' },
  { group: 'Écarts', key: 'whatChanged:cross', def: 'Effets croisés' },
  { group: 'Écarts', key: 'whatChanged:cur', def: 'Scénario actuel' },
]

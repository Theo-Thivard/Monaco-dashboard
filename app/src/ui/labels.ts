import { ACTORS } from '../core/actors'
import { ACTOR_KPI_DEFS } from '../core/kpis'
import { LENS_HINT, LENS_LABEL } from '../core/lens'
import { DEFAULT_SCENARIO_NAMES } from '../core/scenarios'
import { OUTPUT_GROUPS } from '../core/engine'

/** Titre du panneau des trois scénarios, au format « … [unité ; date] » ({unité} suit le réglage MW / kW). */
export const SCENPANEL_TITLE_NEED = 'Besoin IT généré à Monaco [{unité} ; 2035]'
export const SCENPANEL_TITLE_ADDR = 'Demande adressable à Monaco [{unité} ; 2035]'

/** Texte sous chaque valeur du panneau des scénarios (jetons : {2026} {hausse} {besoin} {taux} {valeur} ; **gras**). */
export const SCENPANEL_SUB_NEED = '2026 : {2026} · **{hausse}** d\'ici 2035'
export const SCENPANEL_SUB_ADDR = 'Besoin {besoin} · taux {taux}'

/** Libellés personnalisables et leur valeur par défaut. */
export const LABEL_DEFS: { group: string; key: string; def: string }[] = [
  { group: 'Navigation et en-têtes', key: 'nav:global', def: 'Globale' },
  { group: 'Navigation et en-têtes', key: 'nav:scenario', def: 'Scénario' },
  { group: 'Navigation et en-têtes', key: 'nav:actors', def: 'Acteurs' },
  { group: 'Navigation et en-têtes', key: 'lens:need', def: LENS_LABEL.need },
  { group: 'Navigation et en-têtes', key: 'lens:addressable', def: LENS_LABEL.addressable },
  { group: 'Navigation et en-têtes', key: 'lens:needHint', def: LENS_HINT.need },
  { group: 'Navigation et en-têtes', key: 'lens:addressableHint', def: LENS_HINT.addressable },
  { group: 'Navigation et en-têtes', key: 'ctx:global', def: 'Vue d\'ensemble des trois scénarios' },
  { group: 'Panneau des trois scénarios', key: 'scenpanel:need', def: SCENPANEL_TITLE_NEED },
  { group: 'Panneau des trois scénarios', key: 'scenpanel:addr', def: SCENPANEL_TITLE_ADDR },
  { group: 'Panneau des trois scénarios', key: 'scenpanel:go', def: 'Détail →' },
  ...[0, 1, 2].map((i) => ({ group: 'Panneau des trois scénarios', key: `scenpanel:sub:${i}`, def: SCENPANEL_SUB_NEED })),
  ...[0, 1, 2].map((i) => ({ group: 'Panneau des trois scénarios', key: `scenpanel:subAddr:${i}`, def: SCENPANEL_SUB_ADDR })),
  ...ACTOR_KPI_DEFS.map((k) => ({ group: 'Indicateurs d\'acteur', key: `actorkpi:${k.id}`, def: k.label })),
  ...ACTORS.map((a) => ({ group: 'Descriptions des acteurs', key: `actor:desc:${a.id}`, def: a.description })),
  ...ACTORS.map((a) => ({ group: 'Noms des acteurs', key: `actor:${a.id}`, def: a.label })),
  ...DEFAULT_SCENARIO_NAMES.map((d, i) => ({ group: 'Scénarios', key: `scenario:${i}`, def: d })),
  ...OUTPUT_GROUPS.map((g) => ({ group: 'Blocs', key: `block:${g.id}`, def: g.label })),
  { group: 'Séries', key: 'series:base', def: 'Besoin 2026' },
  { group: 'Séries', key: 'series:need', def: 'Besoin total 2035' },
  { group: 'Séries', key: 'series:addr', def: 'Demande adressable 2035' },
  { group: 'Séries', key: 'series:socle', def: 'Besoin hors IA' },
  { group: 'Séries', key: 'series:ai', def: 'Surcouche IA' },
  { group: 'Séries', key: 'series:rate', def: 'Taux adressable' },
  { group: 'Séries', key: 'series:low', def: 'Valeur basse' },
  { group: 'Séries', key: 'series:high', def: 'Valeur haute' },
  { group: 'Cascade', key: 'bridge:base', def: 'Besoin 2026' },
  { group: 'Cascade', key: 'bridge:act', def: 'Effectifs & activité' },
  { group: 'Cascade', key: 'bridge:int', def: 'Intensité numérique' },
  { group: 'Cascade', key: 'bridge:ia', def: 'Surcouche IA' },
  { group: 'Cascade', key: 'bridge:other', def: 'Autres effets (Excel)' },
  { group: 'Cascade', key: 'bridge:total', def: 'Besoin 2035' },
  { group: 'Cascade', key: 'bridge:out', def: 'Hors Monaco' },
  { group: 'Cascade', key: 'bridge:addr', def: 'Adressable 2035' },
]

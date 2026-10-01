// Registre des acteurs (blocs d'entités du modèle). Source unique pour la navigation,
// les pages « Acteurs » et la liste des hypothèses qui comptent pour chaque acteur
// (cette liste est vérifiée par un test contre le moteur).

import type { BlockResult, Entity, ScenarioResult } from './engine'

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
  /** comment le besoin de cet acteur est calculé */
  method: string
  /** hypothèses qui influencent cet acteur (vérifié par test) */
  hyps: string[]
}

export const ACTOR_GROUPS: { id: 'public' | 'private'; title: string }[] = [
  { id: 'public', title: 'Secteur public & opérateur' },
  { id: 'private', title: 'Secteur privé' },
]

const PUB_HYPS = ['gEffPub', 'gIntPub', 'iaPub', 'adrPub', 'adrIaPub']

export const ACTORS: ActorDef[] = [
  {
    id: 'DSP', slug: 'dsp', label: 'DSP', short: 'DSP', group: 'public',
    description: 'Direction de la Sûreté Publique : socle bureautique des agents et applications métier de vidéosurveillance.',
    method: 'Besoin non-métier (agents) = effectifs × intensité numérique ; besoin métier (vidéo) = parc de caméras × débit par caméra (passage de 2 MP à 8 MP). La surcouche IA s\'applique au besoin hors IA.',
    hyps: [...PUB_HYPS, 'wPub', 'camBase', 'camAdd', 'bitrate'],
  },
  {
    id: 'DENJS', slug: 'denjs', label: 'DENJS', short: 'DENJS', group: 'public',
    description: 'Direction de l\'Éducation Nationale, de la Jeunesse et des Sports.',
    method: 'Projection générique du secteur public : baseline 2026 × croissance des effectifs × croissance de l\'intensité numérique, puis surcouche IA.',
    hyps: PUB_HYPS,
  },
  {
    id: 'APDP', slug: 'apdp', label: 'APDP', short: 'APDP', group: 'public',
    description: 'Autorité de Protection des Données Personnelles.',
    method: 'Projection générique du secteur public : baseline 2026 × croissance des effectifs × croissance de l\'intensité numérique, puis surcouche IA.',
    hyps: PUB_HYPS,
  },
  {
    id: 'DITN', slug: 'ditn', label: 'DITN', short: 'DITN', group: 'public',
    description: 'Délégation Interministérielle chargée de la Transition Numérique.',
    method: 'Projection générique du secteur public : baseline 2026 × croissance des effectifs × croissance de l\'intensité numérique, puis surcouche IA.',
    hyps: PUB_HYPS,
  },
  {
    id: 'CHPG', slug: 'chpg', label: 'CHPG', short: 'CHPG', group: 'public',
    description: 'Centre Hospitalier Princesse Grace : activité hospitalière et digitalisation de la santé.',
    method: 'Besoin métier × croissance de l\'activité × intensité numérique, puis surcouche IA. Le surcroît « santé » n\'agit que si le traitement du CHPG est corrigé (voir Hypothèses).',
    hyps: ['gChpg', 'gIntPub', 'iaPub', 'adrPub', 'adrIaPub', 'santeChpg', 'fixChpg'],
  },
  {
    id: 'MT', slug: 'monaco-telecom', label: 'Monaco Telecom – besoins propres', short: 'Monaco Telecom', group: 'public',
    description: 'Besoins propres de l\'opérateur (10 % de la capacité commerciale installée), hors capacité commerciale.',
    method: 'Baseline × croissance des effectifs et de l\'intensité du privé hors finance, surcouche IA du privé hors finance ; part captable du socle conventionnelle (secteur public).',
    hyps: ['gEffPriv', 'gIntPriv', 'iaPriv', 'adrPub', 'adrIaPriv'],
  },
  {
    id: 'FIN', slug: 'finance', label: 'Finance', short: 'Finance', group: 'private',
    description: 'Secteur financier monégasque : salariés × puissance IT par salarié, plus data-intensif que le reste du privé.',
    method: 'Salariés × W IT par salarié (baseline), × croissance des effectifs et de l\'intensité (finance), puis surcouche IA ; part captable spécifique au socle et à l\'IA.',
    hyps: ['gEffFin', 'gIntFin', 'iaFin', 'adrFin', 'adrIaFin', 'wFin'],
  },
  {
    id: 'PRIV', slug: 'prive-hors-finance', label: 'Privé hors finance', short: 'Privé hors finance', group: 'private',
    description: 'Ensemble des salariés du secteur privé hors finance (IMSEE 2024).',
    method: 'Salariés × W IT par salarié (baseline), × croissance des effectifs et de l\'intensité (hors finance), puis surcouche IA ; part captable spécifique au socle et à l\'IA.',
    hyps: ['gEffPriv', 'gIntPriv', 'iaPriv', 'adrPriv', 'adrIaPriv', 'wPriv'],
  },
]

export const ACTOR_BY_ID: Record<Entity, ActorDef> = Object.fromEntries(ACTORS.map((a) => [a.id, a])) as Record<Entity, ActorDef>
export const ACTOR_BY_SLUG: Record<string, ActorDef> = Object.fromEntries(ACTORS.map((a) => [a.slug, a]))

export const actorBlock = (r: ScenarioResult, id: Entity): BlockResult => r.blocks.find((b) => b.id === id)!

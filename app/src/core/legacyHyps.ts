// Anciens identifiants d'hypothèses (versions ≤ v5 du dashboard) : ne sert QU'À retrouver les réglages enregistrés (curseurs modifiés,
// bandeaux, libellés personnalisés, liens partagés) après la lecture automatique des hypothèses. Rien ici n'est affiché : les noms,
// valeurs, unités et groupes viennent de l'Excel. Une hypothèse absente de cette liste reçoit un identifiant tiré de son intitulé.

export interface LegacyHyp { id: string; labels: string[]; section?: string }

export const LEGACY_HYPS: LegacyHyp[] = [
  { id: 'gEffPub', labels: ['Croissance annuelle effectifs publics'] },
  { id: 'gEffFin', labels: ['Croissance annuelle effectifs finance'] },
  { id: 'gEffPriv', labels: ['Croissance annuelle effectifs privé hors finance'] },
  { id: 'gIntPub', labels: ['Croissance annuelle des besoins IT hors IA – public', 'Croissance annuelle intensité numérique hors IA – public'] },
  { id: 'gIntFin', labels: ['Croissance annuelle des besoins IT hors IA – privé finance', 'Croissance annuelle intensité numérique hors IA – finance'] },
  { id: 'gIntPriv', labels: ['Croissance annuelle des besoins IT hors IA – privé hors finance', 'Croissance annuelle intensité numérique hors IA – hors finance'] },
  { id: 'iaPub', labels: ['Besoins IT additionnels liés à l’IA – public', 'Surcouche IA 2035 – public'] },
  { id: 'iaFin', labels: ['Besoins additionnels liés à l’IA – finance', 'Surcouche IA 2035 – finance'] },
  { id: 'iaPriv', labels: ['Besoins additionnels liés à l’IA – hors finance', 'Surcouche IA 2035 – hors finance'] },
  { id: 'adrPub', labels: ['Part adressable Monaco – public'] },
  { id: 'adrFin', labels: ['Part adressable Monaco – finance'] },
  { id: 'adrPriv', labels: ['Part adressable Monaco – privé hors finance'] },
  { id: 'adrIaPub', labels: ['Part adressable Monaco – surcouche IA public'] },
  { id: 'adrIaFin', labels: ['Part adressable Monaco – surcouche IA finance'] },
  { id: 'adrIaPriv', labels: ['Part adressable Monaco – surcouche IA hors finance'] },
  { id: 'camBase', labels: ['Caméras 2026'] },
  { id: 'camAdd', labels: ['Ajout annuel de caméras'] },
  { id: 'bitrate', labels: ['Facteur bitrate 8MP / 2MP'] },
  { id: 'gChpg', labels: ['Croissance annuelle activité CHPG'], section: 'Hypothèses CHPG' },
  { id: 'santeChpg', labels: ['Surcroît métier santé / digitalisation 2035'], section: 'Hypothèses CHPG' },
  { id: 'gPomp', labels: ['Croissance annuelle activité Pompiers'], section: 'Hypothèses Pompiers' },
  { id: 'santePomp', labels: ['Surcroît métier santé / digitalisation 2035'], section: 'Hypothèses Pompiers' },
  { id: 'wFin', labels: ['W IT / salarié finance – 2026'] },
  { id: 'wPriv', labels: ['W IT / salarié hors finance – 2026'] },
  { id: 'wPub', labels: ['W IT / agent public – socle non-métier DSP'] },
]

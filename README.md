# Monaco – Besoins IT 2035 · outil de conseil interactif

Dashboard interactif construit à partir de `Monaco_Besoins_IT_v2.xlsx` (demande IT de Monaco à l'horizon 2035,
trois scénarios Bas / Central / Haut), conçu pour être présenté et manipulé en direct avec un client.

## Trois niveaux de lecture
| Niveau | Où | Contenu |
|---|---|---|
| **1 – Vue client** (défaut) | page d'ouverture | message clé généré, 4 KPI avec écart vs référence, 6 leviers pilotables, sensibilité, « ce qui a changé », trajectoire, scénarios, cascade, répartition par bloc |
| **2 – Exploration** | sections repliables + bouton « Vue consultant » | analyse détaillée (tableau, trajectoire par bloc, socle vs IA…), registre complet des hypothèses avec sources, KPI personnalisables, type de graphique, 3 scénarios côte à côte |
| **3 – Configuration** | « Personnaliser », « Mise en page » | contenu, thème & jetons de design, formats & libellés, réinitialisations, import/export |

## Architecture : une seule source de vérité
```
Hypothèses ──► moteur ──► instantané ──► KPI / jeux de données ──► graphiques · tableaux · infobulles · message clé
core/hypotheses.ts  core/engine.ts  core/snapshot.ts  core/kpis.ts · core/datasets.ts · core/insights.ts
```
- `src/core/` — **pur, sans React, entièrement testé**.
  - `hypotheses.ts` : registre des hypothèses (libellé, catégorie, contrôle, bornes, défaut, source, ligne Excel).
  - `engine.ts` : formules de l'Excel (aucun arrondi).
  - `snapshot.ts` : tout ce qui dérive du modèle (scénarios, trajectoires, référence, sensibilité, attribution des écarts par valeurs de Shapley), calculé **une fois** par modification.
  - `kpis.ts` / `datasets.ts` : registres des indicateurs et des jeux de données ; chaque graphique, tableau et infobulle lit un jeu de données, jamais le modèle directement. Les types de graphiques proposés dépendent de la nature des données (`compatibleCharts`).
  - `format.ts` : **seul** endroit où l'on arrondit (affichage). Les calculs gardent la pleine précision.
- `src/config/` — configuration pilotée par données : `defaults.ts` (vue client par défaut : widgets, grille, KPI, leviers), `theme.ts` (jetons de design, variables CSS), `types.ts`.
- `src/state/store.ts` — état central (hypothèses + historique annuler/rétablir, référence, configuration), réinitialisations, import/export, lien de partage, comparaison avec le défaut.
- `src/ui/` — composants génériques ; aucun calcul, aucune couleur en dur.

## Fonctionnalités
- Hypothèses : curseur + champ numérique, bornes, repère de référence, écart vs référence, impact (MW) sur le résultat, source et contexte, notes du consultant, choix de méthode (boutons radio).
- Menus de visibilité des hypothèses et des KPI (par catégorie), ordre des KPI, libellés renommables.
- Scénario de référence : « définir l'état actuel comme référence » ; écarts affichés sur chaque KPI ; cascade « ce qui a changé » avec répartition équitable des effets croisés.
- Mise en page : déplacer / redimensionner (bords et coins), taille exacte, placement des widgets, ajout de graphiques et de notes, espacement, marges, arrondis, largeur de page.
- Apparence : thèmes clair (cabinet) et sombre, tous les jetons de couleur modifiables, couleurs par série.
- Formats : MW / kW, décimales, suffixe d'unité.
- Reset assumptions · Reset dashboard · Reset all, et résumé « configuration actuelle vs par défaut ».
- Annuler / rétablir (Ctrl+Z), lien de partage d'un scénario, export CSV (valeurs brutes), impression / PDF, plein écran.

## Qualité
`npm test` exécute 99 tests : fidélité à l'Excel, identités comptables, **cohérence KPI = graphiques = tableaux**
(jeux d'hypothèses par défaut et aléatoires), sensibilité, attribution des écarts, configuration, performance.

## Développement
```
npm install
npm run dev       # http://localhost:5173/Monaco-dashboard/
npm test
npm run build
```
Ajouter un KPI : une entrée dans `core/kpis.ts`. Une hypothèse : `core/hypotheses.ts`. Un graphique : un jeu de
données dans `core/datasets.ts` puis un widget dans `config/defaults.ts`.

## Déploiement
GitHub Pages via `.github/workflows/deploy.yml`, à chaque push sur `main`.

## Points d'attention sur l'Excel
- Le surcroît « santé » du CHPG (ligne 68) n'a aucun effet : `I63 = H13*H63*G63 + G13*F63*G63` avec `H13 = 0`. Le choix « Traitement du CHPG » permet de l'appliquer.
- La baseline 2026 utilise la colonne « Bas » des W IT / utilisateur (lignes 43-45) : ces hypothèses sont communes aux trois scénarios.
- La trajectoire annuelle 2026 → 2035 est une interpolation ajoutée par le dashboard ; seul 2035 est calculé par l'Excel.

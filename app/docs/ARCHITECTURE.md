# Référence technique

Document de référence pour la version actuelle (V5). Le tableau des versions est dans le [README](../README.md).

## Le dashboard lit l'Excel à chaque lancement
Le modèle de calcul **est** le classeur [`Monaco_Besoins_IT_v3.xlsx`](Monaco_Besoins_IT_v3.xlsx) : le dashboard lit *toutes* les valeurs **et toutes les formules** de tous les onglets, les recalcule lui-même avec les hypothèses que vous bougez, et n'écrit aucun calcul en dur.

**Pour mettre à jour le modèle** : remplacez le fichier dans le dépôt (GitHub › *Add file › Upload files*, même nom `Monaco_Besoins_IT_v3.xlsx` ; en cas de nouvelle version `…_v4.xlsx`, la plus élevée est utilisée). C'est tout.

| Vous modifiez dans l'Excel… | Effet sur le dashboard |
|---|---|
| une **valeur** (hypothèse Bas / Central / Haut, baseline, effectifs, caméras…) | reprise automatiquement ; les curseurs repartent de la nouvelle valeur |
| une **formule** (même une seule cellule, y compris l'ajout de `IF`, `ROUND`, `MAX`…) | reprise automatiquement : résultats, graphiques, cascades et pages acteurs suivent |
| une **ligne ou une colonne insérée** | sans effet : le lien Excel ↔ dashboard se fait par *intitulés* (colonne D, en-têtes de colonnes), pas par numéros de cellules |
| un **intitulé renommé** (p. ex. « Surcouche IA 2035 – public ») ou un **onglet supprimé** | le dashboard le dit clairement (écran d'erreur ou bandeau) au lieu d'afficher un résultat faux ; il suffit de rétablir l'intitulé ou de demander la mise à jour |
| un **nouvel acteur / une nouvelle hypothèse pilotable** | demande une évolution du dashboard (la valeur est lue automatiquement, mais il faut lui créer un contrôle / une page) |

Ce qui se passe au lancement : le dashboard tente d'abord la version **en ligne** du fichier (dépôt GitHub, branche `main` : visible dès le lancement suivant, sans attendre un déploiement) ; si elle est inaccessible (hors ligne, pare-feu) il utilise la copie déployée avec le site ; si la version en ligne est illisible ou incompatible, il retombe sur la copie en l'indiquant. L'origine du fichier est rappelée en bas de page et dans *Globale › Méthodologie › Source du modèle* (contrôles, valeurs de base lues, correspondance hypothèses ↔ cellules). Une hypothèse qui n'intervient plus dans les résultats après une modification de formule est signalée « ⚠ sans effet ».

Fonctions Excel prises en charge : opérateurs `+ - * / ^ & % = <> < > <= >=`, `SUM, PRODUCT, MIN, MAX, AVERAGE, COUNT, ABS, ROUND/UP/DOWN, INT, MOD, POWER, SQRT, EXP, LN, LOG, IF, IFS, IFERROR, IFNA, AND, OR, NOT, XLOOKUP, VLOOKUP, HLOOKUP, INDEX, MATCH, SUMPRODUCT, SUMIF, CHOOSE`, texte (`CONCAT, LEFT, RIGHT, MID, LEN…`). Une fonction inconnue est signalée par son nom.

## Navigation et lecture (V4)
Barre fixe : **Globale** · **Scénario ▾** · **Acteurs ▾** (+ ⚙). Sous la barre, deux onglets de lecture : **Besoins générés** (livrable 2, par défaut) et **Besoins adressables** (livrable 3). Toute la page suit l'onglet choisi (graphiques, chiffres, messages clés).

| Entrée | Contenu |
|---|---|
| **Globale** | trajectoire des trois scénarios en premier, panneau des trois chiffres 2035 (cliquables), message clé, contribution de chaque acteur, écart Haut − Bas ; détail et méthodologie repliés |
| **Scénario → Bas / Central / Haut** | message clé, KPI, curseurs d'hypothèses à gauche, cascade et trajectoire à droite (elles bougent en direct), répartition par bloc |
| **Acteurs →** | KPI de l'acteur, ses seules hypothèses, cascade et trajectoire propres |

Adresses partageables : `#/globale`, `#/scenario/central`, `#/acteur/dsp`. Pas d'écarts « vs référence » : les chiffres se lisent directement ; le repère « Excel » sous chaque curseur rappelle la valeur du classeur.

## Architecture : une seule source de vérité
```
Excel (valeurs + formules) ──► évaluateur ──► moteur ──► instantané ──► KPI / jeux de données ──► graphiques · tableaux · infobulles · message clé
core/hypotheses.ts  core/engine.ts  core/snapshot.ts  core/kpis.ts · core/datasets.ts · core/insights.ts
```
- `src/core/` — **pur, sans React, entièrement testé**.
  - `actors.ts` : registre des acteurs (libellé, groupe, description, méthode, hypothèses qui comptent) ; un test vérifie que la liste d'hypothèses de chaque acteur est exactement celle qui agit dans le moteur.
  - `xl/` : lecteur de classeurs et **évaluateur de formules Excel** (analyseur, compilateur, bibliothèque de fonctions), vérifié contre les valeurs enregistrées par Excel et contre LibreOffice.
  - `model.ts` : relie le classeur au dashboard par intitulés (hypothèses → cellules d'entrée, tableaux de résultats → blocs) et produit les diagnostics.
  - `hypotheses.ts` : interface des hypothèses pilotables (libellé, catégorie, contrôle, bornes). Valeur par défaut, source et ligne viennent de l'Excel.
  - `engine.ts` : met en forme les résultats lus dans l'Excel recalculé (aucune formule ici ; l'écart entre scénarios et la décomposition sont obtenus en recalculant l'Excel avec certaines hypothèses neutralisées).
  - `snapshot.ts` : tout ce qui dérive du modèle (scénarios, trajectoires, sensibilité) pour la lentille choisie (`lens.ts`), calculé **une fois** par modification.
  - `kpis.ts` / `datasets.ts` : registres des indicateurs et des jeux de données ; chaque graphique, tableau et infobulle lit un jeu de données, jamais le modèle directement. Les types de graphiques proposés dépendent de la nature des données (`compatibleCharts`).
  - `format.ts` : **seul** endroit où l'on arrondit (affichage). Les calculs gardent la pleine précision.
- `src/config/` — configuration pilotée par données : `defaults.ts` (vue client par défaut : widgets, grille, KPI, leviers), `theme.ts` (jetons de design, variables CSS), `types.ts`.
- `src/state/route.ts` — routes (`global`, `scenario`, `actor`) et adresses ; `src/state/store.ts` — état central (hypothèses + historique annuler/rétablir, lentille, configuration), réinitialisations, import/export, lien de partage, comparaison avec le défaut.
- `src/ui/` — composants génériques ; aucun calcul, aucune couleur en dur.

## Fonctionnalités
- Hypothèses : curseur + champ numérique, bornes, repère de la valeur Excel, impact (MW) sur le résultat, source et contexte, notes du consultant, choix de méthode (boutons radio).
- Menus de visibilité des hypothèses et des KPI (par catégorie), ordre des KPI, libellés renommables.
- Mise en page : déplacer / redimensionner (bords et coins), taille exacte, placement des widgets, ajout de graphiques et de notes, espacement, marges, arrondis, largeur de page.
- Apparence : thèmes clair (cabinet) et sombre, tous les jetons de couleur modifiables, couleurs par série.
- Formats : MW / kW, décimales, suffixe d'unité.
- Reset assumptions · Reset dashboard · Reset all, et résumé « configuration actuelle vs par défaut ».
- Annuler / rétablir (Ctrl+Z), lien de partage d'un scénario, export CSV (valeurs brutes), impression / PDF, plein écran.

## Qualité
`npm test` exécute plus de 340 tests : **chaque formule du classeur recalculée = valeur enregistrée par Excel**, évaluateur contre LibreOffice sur un classeur modifié (valeurs et formules), liaison par intitulés, fidélité à l'Excel, identités comptables, **cohérence KPI = graphiques = tableaux**
(jeux d'hypothèses par défaut et aléatoires, pour chaque scénario et chaque acteur), routes, sensibilité, configuration, performance.

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

## Points d'attention
- La trajectoire annuelle 2026 → 2035 est une interpolation ajoutée par le dashboard (croissance composée du besoin, montée linéaire de l'IA) ; seul 2035 est calculé par l'Excel.
- La cascade « effectifs / intensité / IA » est obtenue en recalculant l'Excel avec l'intensité numérique puis l'IA neutralisées : elle suit les formules, quelles qu'elles soient.
- Le classeur doit idéalement être enregistré par Excel (valeurs calculées incluses) ; sinon le dashboard recalcule tout lui-même, ce qui reste exact.
- Dépendance de lecture des fichiers : `xlsx` (SheetJS 0.18.5, dernière version publiée sur npm). Les avis de sécurité connus visent des fichiers non fiables ; ici le fichier est celui de votre dépôt.

## Enregistrer un affichage (copie de la version)
Vue consultant › ⚙ › « Enregistrer l'affichage sur GitHub… » : avec un jeton personnel (limité à ce dépôt, *Contents* et *Pull requests* en Read and write), le navigateur crée une branche, écrit `variants/<version>-<nom>.json` (la configuration) et `variants/index.json` (la liste), ouvre la pull request et la fusionne. Le déploiement publie alors `/<version>-<nom>/` : même code que la version d'origine, avec cet affichage par défaut. La version d'origine et les précédentes ne sont jamais modifiées ; toutes sont listées dans ⚙ › Versions et affichages. Code : `src/state/github.ts`, `scripts/build-versions.sh`.

## Typographie (V5)
Panneau flottant `src/ui/TypographyPanel.tsx` (bouton AA). Taille globale = `theme.metrics.fontScale` (échelle `html`) ; cinq catégories (`titles`, `subtitles`, `figures`, `labels`, `body`) dans `theme.typo` (taille ×, gras), définies dans `src/config/typography.ts`. Le texte de l'interface suit des variables CSS `--ts-<catégorie>` / `--tw-<catégorie>` (`styles.css`) ; les graphiques (pixels) reçoivent les mêmes réglages via `ChartEnv.typo`. Enregistré avec la configuration (affichages enregistrés compris).

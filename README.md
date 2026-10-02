# Monaco – Besoins IT 2035 · outil de conseil interactif

## 🔗 Accéder au dashboard

| Version | Lien | Contenu |
|---|---|---|
| **Actuelle** (mise à jour à chaque fusion dans `main`) | **[theo-thivard.github.io/Monaco-dashboard](https://theo-thivard.github.io/Monaco-dashboard/)** | Navigation à 3 niveaux : Globale · Scénario ▾ · Acteurs ▾ |
| V2 – archivée | […/Monaco-dashboard/v2/](https://theo-thivard.github.io/Monaco-dashboard/v2/) | Outil de conseil : vue client / consultant, une page |
| V1 – archivée | […/Monaco-dashboard/v1/](https://theo-thivard.github.io/Monaco-dashboard/v1/) | Curseurs d'hypothèses et graphiques en direct |

Accès direct aux pages de la version actuelle :
[Globale](https://theo-thivard.github.io/Monaco-dashboard/#/globale) ·
Scénario : [Bas](https://theo-thivard.github.io/Monaco-dashboard/#/scenario/bas) · [Central](https://theo-thivard.github.io/Monaco-dashboard/#/scenario/central) · [Haut](https://theo-thivard.github.io/Monaco-dashboard/#/scenario/haut) ·
Acteurs : [DSP](https://theo-thivard.github.io/Monaco-dashboard/#/acteur/dsp) · [DENJS](https://theo-thivard.github.io/Monaco-dashboard/#/acteur/denjs) · [APDP](https://theo-thivard.github.io/Monaco-dashboard/#/acteur/apdp) · [DITN](https://theo-thivard.github.io/Monaco-dashboard/#/acteur/ditn) · [CHPG](https://theo-thivard.github.io/Monaco-dashboard/#/acteur/chpg) · [Monaco Telecom](https://theo-thivard.github.io/Monaco-dashboard/#/acteur/monaco-telecom) · [Finance](https://theo-thivard.github.io/Monaco-dashboard/#/acteur/finance) · [Privé hors finance](https://theo-thivard.github.io/Monaco-dashboard/#/acteur/prive-hors-finance)

### Les anciennes versions ne sont jamais supprimées
Chaque version vit à sa propre adresse (`/v1/`, `/v2/`…). Quand un nouveau dashboard remplace la version actuelle, l'ancienne est
**figée dans une branche d'archive** (`archive/dashboard-v1`, `archive/dashboard-v2`…) et listée dans [`versions.json`](versions.json) ; le déploiement
([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), script [`scripts/build-versions.sh`](scripts/build-versions.sh)) la reconstruit
à chaque publication. Les prochaines versions seront ajoutées à ce tableau avec leur lien.

Dashboard interactif construit à partir de `Monaco_Besoins_IT_v2.xlsx` (demande IT de Monaco à l'horizon 2035,
trois scénarios Bas / Central / Haut), conçu pour être présenté et manipulé en direct avec un client.

## 📥 Le dashboard lit l'Excel à chaque lancement
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

## Navigation : Vue globale → Vue scénario → Vue acteur
Une barre fixe en haut, exactement trois entrées : **Globale** · **Scénario ▾** · **Acteurs ▾** (+ ⚙).

| Entrée | Contenu |
|---|---|
| **Globale** | vue Executive : message clé, une carte par scénario (cliquable), trajectoire et comparaison des trois scénarios, contribution de chaque acteur, écart Haut − Bas par acteur |
| **Scénario → Bas / Central / Haut** | pages détaillées : message clé, KPI, leviers pilotables (curseurs), sensibilité, « ce qui a changé », cascade, répartition par bloc ; analyse détaillée et méthodologie repliées |
| **Acteurs → DSP, DENJS, APDP, DITN, CHPG, Monaco Telecom – besoins propres, Finance, Privé hors finance** | pages légères : KPI de l'acteur, ses seules hypothèses, cascade et sensibilité propres, trajectoire et comparaison selon les scénarios, détail du calcul |

- Le contexte courant est toujours visible : l'entrée active affiche sa valeur dans la barre (« Scénario | Central », « Acteurs | DSP »), le fil d'Ariane indique la page (`Acteurs / DSP · Central`) et le menu ouvert coche la page courante.
- Sur une page acteur, un petit sélecteur **Bas / Central / Haut** permet de croiser acteur et scénario sans créer d'entrées de navigation.
- Adresses lisibles et partageables : `#/globale`, `#/scenario/central`, `#/acteur/dsp` (boutons précédent / suivant et liens directs fonctionnent).
- Menus : clavier (↑ ↓ Début Fin, Entrée, Échap), fermeture au clic extérieur, état coché, largeur adaptée aux libellés longs.
- Tout passe par les jetons de thème (Navy Consulting, Minimal, Executive, Financial, Modern, Warm, Sombre) : fond, texte, état actif, survol, menus, bordures, focus.
- **Une seule source de vérité** : les pages ne contiennent aucun calcul ; elles sélectionnent des données du même modèle (`scénario` = index 0..2, `acteur` = bloc du moteur). La configuration (mise en page, couleurs, widgets) est partagée par type de page : les trois scénarios ont la même disposition, comme les huit acteurs.

## Trois niveaux de lecture
| Niveau | Où | Contenu |
|---|---|---|
| **1 – Vue client** (défaut) | pages ouvertes par défaut | message clé généré, KPI avec écart vs référence, leviers pilotables, sensibilité, « ce qui a changé », graphiques principaux |
| **2 – Exploration** | sections repliables + vue consultant (⚙) | analyse détaillée, registre complet des hypothèses avec sources, KPI personnalisables, type de graphique |
| **3 – Configuration** | ⚙ → Personnaliser / Modifier la mise en page | contenu, jetons de design, formats & libellés, réinitialisations, import/export |

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
  - `snapshot.ts` : tout ce qui dérive du modèle (scénarios, trajectoires, référence, sensibilité, attribution des écarts par valeurs de Shapley), calculé **une fois** par modification.
  - `kpis.ts` / `datasets.ts` : registres des indicateurs et des jeux de données ; chaque graphique, tableau et infobulle lit un jeu de données, jamais le modèle directement. Les types de graphiques proposés dépendent de la nature des données (`compatibleCharts`).
  - `format.ts` : **seul** endroit où l'on arrondit (affichage). Les calculs gardent la pleine précision.
- `src/config/` — configuration pilotée par données : `defaults.ts` (vue client par défaut : widgets, grille, KPI, leviers), `theme.ts` (jetons de design, variables CSS), `types.ts`.
- `src/state/route.ts` — routes (`global`, `scenario`, `actor`) et adresses ; `src/state/store.ts` — état central (hypothèses + historique annuler/rétablir, référence, configuration), réinitialisations, import/export, lien de partage, comparaison avec le défaut.
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
`npm test` exécute plus de 340 tests : **chaque formule du classeur recalculée = valeur enregistrée par Excel**, évaluateur contre LibreOffice sur un classeur modifié (valeurs et formules), liaison par intitulés, fidélité à l'Excel, identités comptables, **cohérence KPI = graphiques = tableaux**
(jeux d'hypothèses par défaut et aléatoires, pour chaque scénario et chaque acteur), routes, sensibilité, attribution des écarts, configuration, performance.

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

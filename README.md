# Monaco – Besoins IT 2035

Dashboard interactif construit à partir du classeur Excel [`Monaco_Besoins_IT_v3.xlsx`](Monaco_Besoins_IT_v3.xlsx) (demande IT de Monaco à l'horizon 2035, scénarios Bas / Central / Haut).

## Historique des versions

| Version (cliquez pour ouvrir) | Ce qu'elle apporte par rapport aux précédentes |
|---|---|
| **[V6 · actuelle](https://theo-thivard.github.io/Monaco-dashboard/)** | Comme la V5, mais les **hypothèses sont épinglées dans un panneau à gauche**, présent sur toutes les pages (Globale, Scénario, Acteurs). Bouton ☰ pour l'afficher ou le masquer : le reste de l'affichage se décale. Sur une page acteur, seules les hypothèses de l'acteur sont proposées. |
| [V5](https://theo-thivard.github.io/Monaco-dashboard/v5/) | Tableau de bord **entièrement en français**, gros chiffres plus fins (2026 puis hausse en %), **graphiques classés du plus important au plus faible**, **ordre et visibilité des acteurs réglables**. Les hypothèses forment un **bloc** disponible sur toutes les pages, y compris Globale, qu'on peut ajouter, déplacer et régler comme un graphique. |
| [V4](https://theo-thivard.github.io/Monaco-dashboard/v4/) | Centrée sur le **livrable 2 : besoins générés à Monaco**. Onglets « Besoins générés » / « Besoins adressables ». Globale : trajectoire des 3 scénarios d'abord, chiffres 2035 regroupés. Curseurs à gauche, cascade et trajectoire à droite. Option « Enregistrer l'affichage sur GitHub ». Plus d'écarts « vs référence ». |
| [V3](https://theo-thivard.github.io/Monaco-dashboard/v3/) | **Lit l'Excel à chaque lancement** (valeurs *et* formules, recalculées dans le navigateur). Navigation à 3 niveaux : Globale · Scénario ▾ · Acteurs ▾ (8 pages acteur). |
| [V2](https://theo-thivard.github.io/Monaco-dashboard/v2/) | Outil de conseil : vue client / consultant, mise en page et thèmes personnalisables, réinitialisations, tests de cohérence. Une seule page. |
| [V1](https://theo-thivard.github.io/Monaco-dashboard/v1/) | Première version : curseurs d'hypothèses et graphiques en direct. |

**À savoir pour toutes les versions**
- **Trajectoire annuelle 2026 → 2035 = interpolation** (croissance composée du besoin, montée linéaire de l'IA). Seul 2035 est calculé par l'Excel ; ce principe est le même dans toutes les versions qui tracent une courbe annuelle.
- **Toutes les versions à partir de la V3** lisent l'Excel (valeurs et formules) à chaque ouverture : modifier le classeur dans GitHub met le dashboard à jour, sans rien d'autre à faire. Les V1 et V2, figées, ont le modèle de l'ancien Excel v2 en dur et **ne reflètent pas** la formule CHPG modifiée depuis.
- Toutes les versions restent en ligne à leur propre adresse ; un nouveau dashboard n'efface jamais les précédents.

## Mettre à jour le modèle
Remplacez le fichier dans le dépôt (*Add file › Upload files*, **même nom** `Monaco_Besoins_IT_v3.xlsx` ; si vous créez `…_v4.xlsx`, le plus élevé est utilisé). Le dashboard reprend valeurs et formules au lancement suivant. Détails et limites : [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Pour les développeurs
```
npm install
npm run dev     # http://localhost:5173/Monaco-dashboard/
npm test
npm run build
```
Le déploiement (GitHub Pages) se fait à chaque fusion dans `main` ; les anciennes versions sont reconstruites depuis les branches `archive/dashboard-vN` listées dans [`versions.json`](versions.json). Architecture : [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

# Monaco – Besoins IT 2035

Dashboard interactif construit à partir du classeur Excel [`Monaco_Besoins_IT_v3.xlsx`](Monaco_Besoins_IT_v3.xlsx) (demande IT de Monaco à l'horizon 2035, scénarios Bas / Central / Haut).

## Historique des versions

| Version (cliquez pour ouvrir) | Ce qu'elle apporte par rapport aux précédentes |
|---|---|
| **[V7 · actuelle](https://theo-thivard.github.io/Monaco-dashboard/)** | Comme la V6, avec : **texte sous chaque valeur des 3 scénarios modifiable**, **bornes min/max des axes réglables**, valeurs finales visibles en mode aires, légendes qui ne recouvrent plus les graphiques, **blocs déplaçables d'une partie à l'autre** de la page, noms d'acteurs réduits à la signification des initiales, et **enregistrement d'un affichage comme nouvelle version** (« V7 · nom », pull request et fusion automatiques, menu ⚙ › Versions et affichages). |
| [V6](https://theo-thivard.github.io/Monaco-dashboard/v6/) | V5 avec **panneau d'hypothèses épinglé à gauche** (☰), tous les textes modifiables (message clé avec chiffres vivants), Globale : chiffres et commentaire en haut puis courbe. Garde l'affichage personnalisé enregistré (« v1 main »). |
| [V5](https://theo-thivard.github.io/Monaco-dashboard/v5/) | Tableau de bord **entièrement en français**, gros chiffres plus fins (2026 puis hausse en %), **graphiques classés du plus important au plus faible**, **ordre et visibilité des acteurs réglables**. Les hypothèses forment un **bloc** disponible sur toutes les pages, y compris Globale, qu'on peut ajouter, déplacer et régler comme un graphique. |
| [V4](https://theo-thivard.github.io/Monaco-dashboard/v4/) | Centrée sur le **livrable 2 : besoins générés à Monaco**. Onglets « Besoins générés » / « Besoins adressables ». Globale : trajectoire des 3 scénarios d'abord, chiffres 2035 regroupés. Curseurs à gauche, cascade et trajectoire à droite. Option « Enregistrer l'affichage sur GitHub ». Plus d'écarts « vs référence ». |
| [V3](https://theo-thivard.github.io/Monaco-dashboard/v3/) | **Lit l'Excel à chaque lancement** (valeurs *et* formules, recalculées dans le navigateur). Navigation à 3 niveaux : Globale · Scénario ▾ · Acteurs ▾ (8 pages acteur). |
| [V2](https://theo-thivard.github.io/Monaco-dashboard/v2/) | Outil de conseil : vue client / consultant, mise en page et thèmes personnalisables, réinitialisations, tests de cohérence. Une seule page. |
| [V1](https://theo-thivard.github.io/Monaco-dashboard/v1/) | Première version : curseurs d'hypothèses et graphiques en direct. |

**À savoir pour toutes les versions**
- **Trajectoire annuelle 2026 → 2035 = interpolation** (croissance composée du besoin, montée linéaire de l'IA). Seul 2035 est calculé par l'Excel ; ce principe est le même dans toutes les versions qui tracent une courbe annuelle.
- **Toutes les versions à partir de la V3** lisent l'Excel (valeurs et formules) à chaque ouverture : modifier le classeur dans GitHub met le dashboard à jour, sans rien d'autre à faire. Les V1 et V2, figées, ont le modèle de l'ancien Excel v2 en dur et **ne reflètent pas** la formule CHPG modifiée depuis.
- Toutes les versions restent en ligne à leur propre adresse ; un nouveau dashboard n'efface jamais les précédents.

**Mes affichages enregistrés** (copies d'une version avec une mise en page personnalisée, nommées « V6 · nom ») : ils sont listés dans le menu ⚙ › *Versions et affichages* du tableau de bord, avec toutes les versions ci-dessus.

## Mettre à jour le modèle
Remplacez le fichier dans le dépôt (*Add file › Upload files*, **même nom** `Monaco_Besoins_IT_v3.xlsx` ; si vous créez `…_v4.xlsx`, le plus élevé est utilisé). Le dashboard reprend valeurs et formules au lancement suivant. Détails et limites : [app/docs/ARCHITECTURE.md](app/docs/ARCHITECTURE.md).

## Organisation du dépôt
- **`Monaco_Besoins_IT_v3.xlsx`** : votre modèle Excel (le seul fichier à modifier à la main).
- **`app/`** : tout le code du tableau de bord, les affichages enregistrés (`app/variants/`) et la documentation technique.
- **`.github/`** : la publication automatique du site.

## Pour les développeurs
```
cd app
npm install
npm run dev     # http://localhost:5173/Monaco-dashboard/
npm test
npm run build
```
Le déploiement (GitHub Pages) se fait à chaque fusion dans `main` ; les anciennes versions sont reconstruites depuis les branches `archive/dashboard-vN` listées dans [`app/versions.json`](app/versions.json). Architecture : [app/docs/ARCHITECTURE.md](app/docs/ARCHITECTURE.md).

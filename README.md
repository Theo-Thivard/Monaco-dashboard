# Monaco – Besoins IT 2035

Dashboard interactif construit à partir du classeur Excel [`Monaco_Besoins_IT_v3.xlsx`](Monaco_Besoins_IT_v3.xlsx) (demande IT de Monaco à l'horizon 2035, scénarios Bas / Central / Haut).

## Historique des versions

| Version &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Ce qu'elle apporte par rapport aux précédentes |
|---|---|
| [V4](https://theo-thivard.github.io/Monaco-dashboard/) | Comme la V3, avec en plus : un **panneau « Texte »** (bouton **AA** dans la barre du haut : taille du texte de tout le tableau de bord, puis par catégorie, avec le gras) ; **légende « [unité ; date] »** sur tous les titres (ex. « Évolution du besoin [MW IT ; 2026-2035] », l'unité suit le réglage MW / kW) ; **case « Afficher la valeur initiale » dans les paramètres de chaque graphique** (invisible en vue client ; valeur 2026 au départ des courbes, repère 2026 sur les barres, barre 2026 grisée dans « Répartition par bloc et par scénario ») ; **bandeaux d'hypothèses indépendants** selon la page (Besoins générés : intensités numériques et surcouches IA ; Besoins adressables : toutes les parts captables ; chaque acteur a le sien), toujours modifiables par « Afficher / masquer » ; sélecteur **« Curseurs des 3 scénarios : Groupés / Indépendants »** ; **unité modifiable dans chaque cellule de chiffres** (vue consultant : clic sur l'unité, champ vidé = pas d'unité) ; affichage par défaut de la Globale resserré (chiffres clés, évolution du besoin, puis « Décomposition de la demande » : qui porte la demande et répartition par bloc et par scénario, avec la répartition 2026) ; valeur 2026 avant celles de 2035 dans les indicateurs ; « Taux de croissance annuel moyen du besoin » (jamais abrégé) ; menu client réduit à quatre actions (plein écran, vue consultant, imprimer, résultats CSV pour Excel) ; « Trois scénarios, un même point de départ » et « Besoin par scénario » (page acteur) retirés de l'affichage par défaut (toujours disponibles en mode mise en page). |
| [V3](https://theo-thivard.github.io/Monaco-dashboard/v3/); <br> [V3 · plein ecran](https://theo-thivard.github.io/Monaco-dashboard/v3-plein-ecran/) | Deux lectures du livrable 2 (**Besoins générés** / **Besoins adressables**), **tout en français**, graphiques **classés du plus important au plus faible**, **panneau d'hypothèses épinglé à gauche** (☰) avec modification des trois scénarios ensemble ou séparément, **tous les textes modifiables** (message clé avec chiffres vivants, texte sous chaque valeur), axes réglables, ordre et visibilité des acteurs, blocs déplaçables, et **enregistrement d'un affichage comme nouvelle version** (menu ⚙ › Versions et affichages en vue consultant). |
| [V2](https://theo-thivard.github.io/Monaco-dashboard/v2/) | **Lit l'Excel à chaque lancement** (valeurs *et* formules, recalculées dans le navigateur). Navigation à 3 niveaux : Globale · Scénario ▾ · Acteurs ▾ (8 pages acteur). |
| [V1](https://theo-thivard.github.io/Monaco-dashboard/v1/) | Première version : curseurs d'hypothèses et graphiques en direct. |

**À savoir pour toutes les versions**
- **Trajectoire annuelle 2026 → 2035 = interpolation** (croissance composée du besoin, montée linéaire de l'IA). Seul 2035 est calculé par l'Excel ; ce principe est le même dans toutes les versions qui tracent une courbe annuelle.
- **Toutes les versions à partir de la V2** lisent l'Excel (valeurs et formules) à chaque ouverture : modifier le classeur dans GitHub met le dashboard à jour, sans rien d'autre à faire. La V1, figée, a le modèle de l'ancien Excel v2 en dur et **ne reflète pas** la formule CHPG modifiée depuis.
- **Toutes les versions et tous leurs affichages suivent le dernier classeur Excel** (N le plus élevé) : seul leur code reste figé. La V1, qui a son modèle en dur, fait exception.
- Toutes les versions restent en ligne à leur propre adresse ; un nouveau dashboard n'efface jamais les précédents.

## Mettre à jour le modèle
Remplacez le fichier dans le dépôt (*Add file › Upload files*, **même nom** `Monaco_Besoins_IT_v3.xlsx` ; si vous créez `…_v4.xlsx`, le plus élevé est utilisé). Le dashboard reprend valeurs et formules au lancement suivant. Détails et limites : [app/docs/ARCHITECTURE.md](app/docs/ARCHITECTURE.md).

## Organisation du dépôt
- **`Monaco_Besoins_IT_v3.xlsx`** : votre modèle Excel (le seul fichier à modifier à la main).
- **`app/`** : tout le code du tableau de bord, les affichages enregistrés (`app/variants/`) et la documentation technique.
- **`.github/`** : la publication automatique du site.

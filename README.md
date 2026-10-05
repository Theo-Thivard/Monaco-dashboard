# Monaco – Besoins IT 2035

Dashboard interactif construit à partir du classeur Excel [`Monaco_Besoins_IT_v3.xlsx`](Monaco_Besoins_IT_v3.xlsx) (demande IT de Monaco à l'horizon 2035, scénarios Bas / Central / Haut).

## Historique des versions

| Version &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Ce qu'elle apporte par rapport aux précédentes |
|---|---|
| [V5](https://theo-thivard.github.io/Monaco-dashboard/);  <br> affichage par défaut : celui de la V4 · plein ecran | Comme la V4, avec en plus un **panneau « Texte »** (bouton **AA** dans la barre du haut) : taille du texte de **tout le tableau de bord d'un coup** (Standard / Grand / Très grand ou curseur), puis **par catégorie** (titres, sous-titres, chiffres clés, légendes, texte courant) avec un bouton **B** pour le gras de chaque catégorie ou de tout. S'applique aussi aux graphiques ; le panneau se déplace à la souris ; réglages conservés dans les affichages enregistrés. |
| [V4](https://theo-thivard.github.io/Monaco-dashboard/);  <br> [V4 · plein ecran](https://theo-thivard.github.io/Monaco-dashboard/v4-plein-ecran/); <br> [V4 · 2eme affichage main](https://theo-thivard.github.io/Monaco-dashboard/v4-2eme-affichage-main/) | La plus complète. Comme la V3 (livrable 2, deux lectures), avec : **tout en français**, graphiques **classés du plus important au plus faible**, **panneau d'hypothèses épinglé à gauche** (☰) avec modification des trois scénarios ensemble ou séparément, **tous les textes modifiables** (message clé avec chiffres vivants, texte sous chaque valeur), axes réglables, réglages de graphiques propres à chaque lecture, ordre et visibilité des acteurs, blocs déplaçables d'une partie à l'autre (demi-hauteurs possibles), et **enregistrement d'un affichage comme nouvelle version** (« V4 · nom », menu ⚙ › Versions et affichages en vue consultant). |
| [V3](https://theo-thivard.github.io/Monaco-dashboard/v3/) | Centrée sur le **livrable 2 : besoins générés à Monaco**. Onglets « Besoins générés » / « Besoins adressables ». Globale : trajectoire des 3 scénarios d'abord, chiffres 2035 regroupés. Curseurs d'hypothèses à gauche, cascade et trajectoire à droite. |
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

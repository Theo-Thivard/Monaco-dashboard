# Monaco – Besoins IT 2035

Dashboard interactif construit à partir du classeur Excel [`Monaco_Besoins_IT_v3.xlsx`](Monaco_Besoins_IT_v3.xlsx) (demande IT de Monaco à l'horizon 2035, scénarios Bas / Central / Haut).

## Historique des versions

| Version &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Ce qu'elle apporte par rapport aux précédentes |
|---|---|
| [V4.couleurs_2](https://theo-thivard.github.io/Monaco-dashboard/v4-couleurs-2/#/globale)| Affichage de la V4 enregistré comme version à part entière (même code, mise en page 19h01). |
| [V4.couleurs_3](https://theo-thivard.github.io/Monaco-dashboard/v4-couleurs-3/#/scenario/central)| Affichage de la V4 enregistré comme version à part entière (même code, mise en page 19h01). |
| [V4](https://theo-thivard.github.io/Monaco-dashboard/) | Modification de la taille du texte ; **légende « [unité ; date] »** ; valeur 2026 au départ des courbes; **bandeaux d'hypothèses indépendants** (générés/adressables); **unité modifiable dans chaque cellule de chiffres**; menu client réduit à quatre actions. |

**À savoir pour toutes les versions**
- **Trajectoire annuelle 2026 → 2035 = interpolation** (croissance composée du besoin, montée linéaire de l'IA). Seul 2035 est calculé par l'Excel ; ce principe est le même dans toutes les versions qui tracent une courbe annuelle.
- **Toutes les versions à partir de la V2** lisent l'Excel (valeurs et formules) à chaque ouverture : modifier le classeur dans GitHub met le dashboard à jour, sans rien d'autre à faire. La V1, figée, a le modèle de l'ancien Excel v2 en dur et **ne reflète pas** la formule CHPG modifiée depuis.
- **Toutes les versions et tous leurs affichages suivent le dernier classeur Excel** (N le plus élevé) : seul leur code reste figé. La V1, qui a son modèle en dur, fait exception.
- Toutes les versions restent en ligne à leur propre adresse ; un nouveau dashboard n'efface jamais les précédents.

## Mettre à jour le modèle
Remplacez le fichier dans le dépôt (*Add file › Upload files*, **même nom** `Monaco_Besoins_IT_v3.xlsx` ; si vous créez `…_v4.xlsx`, le plus élevé est utilisé). Le dashboard reprend valeurs et formules au lancement suivant. Le dashboard lit lui-même les hypothèses de l'onglet `1_Inputs&Hyp` (noms, valeurs, unités, groupes) : renommer, ajouter ou retirer une ligne d'un tableau d'hypothèses suffit, à condition de respecter les conventions de structure décrites dans la documentation. Détails et limites : [app/docs/ARCHITECTURE.md](app/docs/ARCHITECTURE.md).

## Organisation du dépôt
- **`Monaco_Besoins_IT_v3.xlsx`** : votre modèle Excel (le seul fichier à modifier à la main).
- **`app/`** : tout le code du tableau de bord, les affichages enregistrés (`app/variants/`) et la documentation technique.
- **`.github/`** : la publication automatique du site.

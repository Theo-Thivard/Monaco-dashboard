/// <reference types="vite/client" />
declare const __MODEL_FILE__: string
/** slug de la version du code (p. ex. « v6 ») */
declare const __APP_BASE__: string
/** slug de cette publication : la version (« v6 ») ou un affichage enregistré (« v6-vue-client ») */
declare const __APP_SLUG__: string
/** affichage enregistré appliqué par défaut (null pour la version d'origine) */
declare const __VARIANT_CONFIG__: unknown
declare const __REGISTRY__: { slug: string; label: string; path: string; kind: 'version' | 'affichage' }[]
declare const __SITE_ROOT__: string
declare const __MODEL_LIVE_URL__: string
declare const __MODEL_REPO_URL__: string

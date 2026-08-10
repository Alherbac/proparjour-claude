/**
 * Zone de couverture de la plateforme (lancement : Île-de-France uniquement).
 * La liste des communes n'est plus figée ici — voir
 * `VilleAutocompleteIdf` (src/components/ville-autocomplete-idf.tsx),
 * qui interroge l'API officielle geo.api.gouv.fr (région 11) pour
 * couvrir l'intégralité des communes d'IDF, toujours à jour.
 */

export const REGIONS_COUVERTES = ["Île-de-France"] as const;

export const MESSAGE_HORS_ZONE =
  "Bientôt disponible dans votre ville — pour l'instant, le service est disponible uniquement en Île-de-France.";

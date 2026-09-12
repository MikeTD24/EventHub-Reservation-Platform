export interface Categorie {
  id: number;
  nom: string;
}

/**
 * Données envoyées lors de la création ou de la modification
 * d’une catégorie.
 */
export interface CategoriePayload {
  nom: string;
}

/**
 * Réponse renvoyée par l’API après une mutation.
 */
export interface CategorieResponse {
  message: string;
  categorie: Categorie;
}

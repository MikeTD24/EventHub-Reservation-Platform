import { Categorie } from './categorie.model';

export interface Evenement {
  id: number;
  titre: string;
  description: string | null;
  lieu: string;

  /*
   * Une date reçue dans une réponse JSON est une chaîne,
   * même si PostgreSQL la stocke comme une véritable date.
   */
  date_evenement: string;

  places_totales: number;
  places_occupees: number;
  places_restantes: number;
  id_categorie: number;
  categorie: Categorie;
}

export interface EvenementPayload {
  titre: string;
  description: string | null;
  lieu: string;
  date_evenement: string;
  places_totales: number;
  id_categorie: number;
}

export interface EvenementResponse {
  message: string;
  evenement: Evenement;
}

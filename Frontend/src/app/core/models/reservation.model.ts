import { Evenement } from './evenement.model';
import { Utilisateur } from './utilisateur.model';

export type ReservationStatut = 'confirmee' | 'annulee';

export interface Reservation {
  id: number;
  nombre_places: number;
  statut: ReservationStatut;
  date_reservation: string;
  id_utilisateur: number;
  id_evenement: number;

  /*
   * L’événement est présent dans la réponse de la liste,
   * mais pas obligatoirement dans une réponse de création.
   */
  evenement?: Evenement;
}

/**
 * Réservation enrichie avec l’identité publique
 * de l’utilisateur pour l’espace administrateur.
 */
export interface ReservationParticipant extends Reservation {
  utilisateur: Pick<Utilisateur, 'id' | 'nom' | 'email'>;
}

/**
 * Réponse de l’API pour la liste des participants
 * associés à un événement.
 */
export interface ReservationsEvenementResponse {
  evenement: Evenement;
  reservations: ReservationParticipant[];
}

export interface ReservationPayload {
  id_evenement: number;
  nombre_places: number;
}

export interface ReservationUpdatePayload {
  nombre_places: number;
}

export interface ReservationResponse {
  message: string;
  reservation: Reservation;
  places_restantes: number;
}

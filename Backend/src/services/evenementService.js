import { col, fn } from 'sequelize';

import { Reservation } from '../models/index.js';

/**
 * Calcule les places occupées pour un événement précis.
 */
export const getPlacesOccupees = async (idEvenement) => {
  const total = await Reservation.sum('nombre_places', {
    where: {
      id_evenement: idEvenement,
      statut: 'confirmee',
    },
  });

  // SUM retourne null lorsqu'aucune réservation n'existe.
  return Number(total ?? 0);
};

/**
 * Calcule les places occupées de tous les événements en une seule requête.
 */
export const getPlacesOccupeesParEvenement = async () => {
  const resultats = await Reservation.findAll({
    attributes: ['id_evenement', [fn('SUM', col('nombre_places')), 'places_occupees']],
    where: {
      statut: 'confirmee',
    },
    group: ['id_evenement'],
    raw: true,
  });

  return new Map(
    resultats.map((resultat) => [Number(resultat.id_evenement), Number(resultat.places_occupees)]),
  );
};

/**
 * Ajoute les valeurs calculées à un événement.
 */
export const ajouterDisponibilite = (evenement, placesOccupees = 0) => {
  const donnees = evenement.toJSON ? evenement.toJSON() : evenement;

  return {
    ...donnees,
    places_occupees: placesOccupees,
    places_restantes: donnees.places_totales - placesOccupees,
  };
};

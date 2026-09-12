import { Op, ValidationError } from 'sequelize';

import { sequelize, Evenement, Reservation, Categorie, Utilisateur } from '../models/index.js';
import {
  ajouterDisponibilite,
  getPlacesOccupeesParEvenement,
} from '../services/evenementService.js';

/**
 * Convertit et valide un identifiant.
 */
const parseId = (valeur) => {
  const id = Number(valeur);

  return Number.isInteger(id) && id > 0 ? id : null;
};

/**
 * Transforme une erreur technique en réponse HTTP.
 */
const handleReservationError = (error, res) => {
  if (error instanceof ValidationError) {
    return res.status(400).json({
      message: error.errors?.[0]?.message ?? 'Données de réservation invalides.',
    });
  }

  console.error('Erreur concernant les réservations :', error);

  return res.status(500).json({
    message: 'Une erreur interne est survenue.',
  });
};

/**
 * GET /api/reservations
 * Retourne uniquement les réservations de l’utilisateur connecté.
 */
export const getMesReservations = async (req, res) => {
  try {
    const reservations = await Reservation.findAll({
      where: {
        id_utilisateur: req.user.id,
      },
      include: {
        model: Evenement,
        as: 'evenement',
        include: {
          model: Categorie,
          as: 'categorie',
          attributes: ['id', 'nom'],
        },
      },
      order: [['date_reservation', 'DESC']],
    });

    /*
     * Une réservation contient les données de son événement, mais les valeurs
     * de disponibilité ne sont pas stockées directement dans la table.
     * Elles sont donc calculées à partir des réservations encore confirmées.
     */
    const placesParEvenement = await getPlacesOccupeesParEvenement();

    const reservationsAvecDisponibilite = reservations.map((reservation) => {
      const donnees = reservation.toJSON();

      if (!donnees.evenement) {
        return donnees;
      }

      const placesOccupees = placesParEvenement.get(donnees.id_evenement) ?? 0;

      return {
        ...donnees,
        evenement: ajouterDisponibilite(donnees.evenement, placesOccupees),
      };
    });

    return res.status(200).json(reservationsAvecDisponibilite);
  } catch (error) {
    return handleReservationError(error, res);
  }
};

/**
 * GET /api/events/:id/reservations
 * Retourne à l’administrateur les réservations et les participants
 * associés à un événement précis.
 */
export const getReservationsByEvenement = async (req, res) => {
  try {
    const idEvenement = parseId(req.params.id);

    if (!idEvenement) {
      return res.status(400).json({
        message: 'Identifiant d’événement invalide.',
      });
    }

    const evenement = await Evenement.findByPk(idEvenement, {
      include: {
        model: Categorie,
        as: 'categorie',
        attributes: ['id', 'nom'],
      },
    });

    if (!evenement) {
      return res.status(404).json({
        message: 'Événement introuvable.',
      });
    }

    /*
     * Seules les informations publiques utiles de l’utilisateur
     * sont retournées. Le mot de passe n’est jamais exposé.
     */
    const reservations = await Reservation.findAll({
      where: {
        id_evenement: idEvenement,
      },
      include: {
        model: Utilisateur,
        as: 'utilisateur',
        attributes: ['id', 'nom', 'email'],
      },
      order: [['date_reservation', 'DESC']],
    });

    /*
     * Les réservations annulées restent visibles dans l’historique,
     * mais elles ne consomment plus de places.
     */
    const placesOccupees = reservations.reduce((total, reservation) => {
      if (reservation.statut !== 'confirmee') {
        return total;
      }

      return total + Number(reservation.nombre_places);
    }, 0);

    return res.status(200).json({
      evenement: ajouterDisponibilite(evenement, placesOccupees),
      reservations,
    });
  } catch (error) {
    return handleReservationError(error, res);
  }
};

/**
 * POST /api/reservations
 * Crée une réservation pour l’utilisateur connecté.
 */
export const createReservation = async (req, res) => {
  const idEvenement = parseId(req.body.id_evenement);
  const nombrePlaces = Number(req.body.nombre_places);

  if (!idEvenement) {
    return res.status(400).json({
      message: 'Identifiant d’événement invalide.',
    });
  }

  if (!Number.isInteger(nombrePlaces) || nombrePlaces < 1) {
    return res.status(400).json({
      message: 'Le nombre de places doit être un entier supérieur ou égal à 1.',
    });
  }

  const transaction = await sequelize.transaction();

  try {
    /*
     * Le verrou empêche deux réservations simultanées de lire
     * la même disponibilité avant leur enregistrement.
     */
    const evenement = await Evenement.findByPk(idEvenement, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!evenement) {
      await transaction.rollback();

      return res.status(404).json({
        message: 'Événement introuvable.',
      });
    }

    if (new Date(evenement.date_evenement) <= new Date()) {
      await transaction.rollback();

      return res.status(409).json({
        message: 'Il est impossible de réserver un événement déjà commencé.',
      });
    }

    /*
     * Un utilisateur ne peut posséder qu’une seule réservation confirmée
     * pour un même événement. Pour changer le nombre de places, il doit
     * modifier cette réservation existante.
     */
    const reservationExistante = await Reservation.findOne({
      where: {
        id_utilisateur: req.user.id,
        id_evenement: idEvenement,
        statut: 'confirmee',
      },
      transaction,
    });

    if (reservationExistante) {
      await transaction.rollback();

      return res.status(409).json({
        message:
          'Vous possédez déjà une réservation confirmée pour cet événement. Modifiez-la au lieu d’en créer une nouvelle.',
      });
    }

    const totalReserve = await Reservation.sum('nombre_places', {
      where: {
        id_evenement: idEvenement,
        statut: 'confirmee',
      },
      transaction,
    });

    const placesOccupees = Number(totalReserve ?? 0);
    const placesRestantes = evenement.places_totales - placesOccupees;

    if (nombrePlaces > placesRestantes) {
      await transaction.rollback();

      return res.status(409).json({
        message: 'Nombre de places disponibles insuffisant.',
        places_restantes: placesRestantes,
      });
    }

    const reservation = await Reservation.create(
      {
        nombre_places: nombrePlaces,
        statut: 'confirmee',
        id_utilisateur: req.user.id,
        id_evenement: idEvenement,
      },
      {
        transaction,
      },
    );

    await transaction.commit();

    return res.status(201).json({
      message: 'Réservation créée avec succès.',
      reservation,
      places_restantes: placesRestantes - nombrePlaces,
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    return handleReservationError(error, res);
  }
};

/**
 * PUT /api/reservations/:id
 * Modifie le nombre de places d’une réservation appartenant
 * à l’utilisateur connecté.
 */
export const updateReservation = async (req, res) => {
  const id = parseId(req.params.id);
  const nombrePlaces = Number(req.body.nombre_places);

  if (!id) {
    return res.status(400).json({
      message: 'Identifiant de réservation invalide.',
    });
  }

  if (!Number.isInteger(nombrePlaces) || nombrePlaces < 1) {
    return res.status(400).json({
      message: 'Le nombre de places doit être un entier supérieur ou égal à 1.',
    });
  }

  const transaction = await sequelize.transaction();

  try {
    /*
     * L’identifiant de l’utilisateur vient du JWT.
     * Alice ne peut donc pas modifier la réservation d’un autre compte.
     */
    const reservation = await Reservation.findOne({
      where: {
        id,
        id_utilisateur: req.user.id,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!reservation) {
      await transaction.rollback();

      return res.status(404).json({
        message: 'Réservation introuvable.',
      });
    }

    if (reservation.statut === 'annulee') {
      await transaction.rollback();

      return res.status(409).json({
        message: 'Une réservation annulée ne peut plus être modifiée.',
      });
    }

    /*
     * Tous les traitements de capacité verrouillent le même événement.
     * Cela évite des modifications simultanées incompatibles.
     */
    const evenement = await Evenement.findByPk(reservation.id_evenement, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!evenement) {
      await transaction.rollback();

      return res.status(404).json({
        message: 'Événement introuvable.',
      });
    }

    if (new Date(evenement.date_evenement) <= new Date()) {
      await transaction.rollback();

      return res.status(409).json({
        message: 'Une réservation ne peut plus être modifiée après le début de l’événement.',
      });
    }

    /*
     * On additionne toutes les réservations confirmées,
     * sauf celle que nous sommes en train de modifier.
     */
    const totalAutresReservations = await Reservation.sum('nombre_places', {
      where: {
        id_evenement: evenement.id,
        statut: 'confirmee',
        id: {
          [Op.ne]: reservation.id,
        },
      },
      transaction,
    });

    const placesOccupeesParLesAutres = Number(totalAutresReservations ?? 0);

    const maximumDisponible = evenement.places_totales - placesOccupeesParLesAutres;

    if (nombrePlaces > maximumDisponible) {
      await transaction.rollback();

      return res.status(409).json({
        message: 'Nombre de places disponibles insuffisant.',
        maximum_disponible: maximumDisponible,
      });
    }

    await reservation.update(
      {
        nombre_places: nombrePlaces,
      },
      {
        transaction,
      },
    );

    await transaction.commit();

    return res.status(200).json({
      message: 'Réservation modifiée avec succès.',
      reservation,
      places_restantes: maximumDisponible - nombrePlaces,
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    return handleReservationError(error, res);
  }
};

/**
 * PATCH /api/reservations/:id/cancel
 * Annule une réservation appartenant à l’utilisateur connecté.
 */
export const cancelReservation = async (req, res) => {
  const id = parseId(req.params.id);

  if (!id) {
    return res.status(400).json({
      message: 'Identifiant de réservation invalide.',
    });
  }

  const transaction = await sequelize.transaction();

  try {
    /*
     * La recherche combine l’identifiant de la réservation
     * et celui de l’utilisateur contenu dans le JWT.
     */
    const reservation = await Reservation.findOne({
      where: {
        id,
        id_utilisateur: req.user.id,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!reservation) {
      await transaction.rollback();

      return res.status(404).json({
        message: 'Réservation introuvable.',
      });
    }

    if (reservation.statut === 'annulee') {
      await transaction.rollback();

      return res.status(409).json({
        message: 'Cette réservation est déjà annulée.',
      });
    }

    /*
     * L’événement est verrouillé afin que le calcul des places
     * reste cohérent pendant l’annulation.
     */
    const evenement = await Evenement.findByPk(reservation.id_evenement, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!evenement) {
      await transaction.rollback();

      return res.status(404).json({
        message: 'Événement introuvable.',
      });
    }

    if (new Date(evenement.date_evenement) <= new Date()) {
      await transaction.rollback();

      return res.status(409).json({
        message: 'Une réservation ne peut plus être annulée après le début de l’événement.',
      });
    }

    /*
     * On calcule les places actuellement occupées avant
     * de retirer celles de la réservation annulée.
     */
    const totalReserve = await Reservation.sum('nombre_places', {
      where: {
        id_evenement: evenement.id,
        statut: 'confirmee',
      },
      transaction,
    });

    const placesOccupees = Number(totalReserve ?? 0);

    await reservation.update(
      {
        statut: 'annulee',
      },
      {
        transaction,
      },
    );

    const nouvellesPlacesOccupees = placesOccupees - reservation.nombre_places;

    const placesRestantes = evenement.places_totales - nouvellesPlacesOccupees;

    await transaction.commit();

    return res.status(200).json({
      message: 'Réservation annulée avec succès.',
      reservation,
      places_restantes: placesRestantes,
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    return handleReservationError(error, res);
  }
};

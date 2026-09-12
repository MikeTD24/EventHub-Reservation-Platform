/**
 * Ajout des imports et fonctions utilitaires
 */
import { ValidationError } from 'sequelize';

import { Categorie, Evenement } from '../models/index.js';

import {
  ajouterDisponibilite,
  getPlacesOccupees,
  getPlacesOccupeesParEvenement,
} from '../services/evenementService.js';

/**
 * Convertit et valide un identifiant reçu dans l'URL.
 */
const parseId = (valeur) => {
  const id = Number(valeur);

  return Number.isInteger(id) && id > 0 ? id : null;
};

/**
 * Valide et normalise les données d'un événement.
 */
const normaliserEvenement = (body) => {
  const titre = typeof body.titre === 'string' ? body.titre.trim() : '';

  const lieu = typeof body.lieu === 'string' ? body.lieu.trim() : '';

  const description =
    body.description == null
      ? null
      : typeof body.description === 'string'
        ? body.description.trim()
        : null;

  const dateEvenement = new Date(body.date_evenement);
  const placesTotales = Number(body.places_totales);
  const idCategorie = Number(body.id_categorie);

  if (!titre || !lieu) {
    return {
      erreur: 'Le titre et le lieu sont obligatoires.',
    };
  }

  if (Number.isNaN(dateEvenement.getTime())) {
    return {
      erreur: 'La date de l’événement est invalide.',
    };
  }

  if (!Number.isInteger(placesTotales) || placesTotales < 1) {
    return {
      erreur: 'Le nombre total de places doit être un entier supérieur ou égal à 1.',
    };
  }

  if (!Number.isInteger(idCategorie) || idCategorie < 1) {
    return {
      erreur: 'L’identifiant de la catégorie est invalide.',
    };
  }

  return {
    donnees: {
      titre,
      description,
      lieu,
      date_evenement: dateEvenement,
      places_totales: placesTotales,
      id_categorie: idCategorie,
    },
  };
};

/**
 * Transforme une erreur technique en réponse HTTP.
 */
const handleEvenementError = (error, res) => {
  if (error instanceof ValidationError) {
    return res.status(400).json({
      message: error.errors[0]?.message ?? 'Données invalides.',
    });
  }

  console.error('Erreur concernant les événements :', error);

  return res.status(500).json({
    message: 'Une erreur interne est survenue.',
  });
};
/**
 * GET /api/events ; Ajout de la liste des événements
 */
export const getEvenements = async (req, res) => {
  try {
    const [evenements, placesParEvenement] = await Promise.all([
      Evenement.findAll({
        include: {
          model: Categorie,
          as: 'categorie',
          attributes: ['id', 'nom'],
        },
        order: [['date_evenement', 'ASC']],
      }),

      getPlacesOccupeesParEvenement(),
    ]);

    const resultat = evenements.map((evenement) => {
      const placesOccupees = placesParEvenement.get(evenement.id) ?? 0;

      return ajouterDisponibilite(evenement, placesOccupees);
    });

    return res.status(200).json(resultat);
  } catch (error) {
    return handleEvenementError(error, res);
  }
};
/**
 * GET /api/events/:id ; Ajout du détail
 */
export const getEvenementById = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "Identifiant d'événement invalide.",
      });
    }

    const evenement = await Evenement.findByPk(id, {
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

    const placesOccupees = await getPlacesOccupees(id);

    return res.status(200).json(ajouterDisponibilite(evenement, placesOccupees));
  } catch (error) {
    return handleEvenementError(error, res);
  }
};
/**
 * POST /api/events ; Ajout de la création
 */
export const createEvenement = async (req, res) => {
  try {
    const { donnees, erreur } = normaliserEvenement(req.body);

    if (erreur) {
      return res.status(400).json({
        message: erreur,
      });
    }

    const categorie = await Categorie.findByPk(donnees.id_categorie);

    if (!categorie) {
      return res.status(400).json({
        message: 'La catégorie sélectionnée n’existe pas.',
      });
    }

    const evenementCree = await Evenement.create(donnees);

    const evenement = await Evenement.findByPk(evenementCree.id, {
      include: {
        model: Categorie,
        as: 'categorie',
        attributes: ['id', 'nom'],
      },
    });

    return res.status(201).json({
      message: 'Événement créé avec succès.',
      evenement: ajouterDisponibilite(evenement, 0),
    });
  } catch (error) {
    return handleEvenementError(error, res);
  }
};
/**
 * PUT /api/events/:id ; Ajout de la modification
 */
export const updateEvenement = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: 'Identifiant d’événement invalide.',
      });
    }

    const evenement = await Evenement.findByPk(id);

    if (!evenement) {
      return res.status(404).json({
        message: 'Événement introuvable.',
      });
    }

    const { donnees, erreur } = normaliserEvenement(req.body);

    if (erreur) {
      return res.status(400).json({
        message: erreur,
      });
    }

    const categorie = await Categorie.findByPk(donnees.id_categorie);

    if (!categorie) {
      return res.status(400).json({
        message: 'La catégorie sélectionnée n’existe pas.',
      });
    }

    const placesOccupees = await getPlacesOccupees(id);

    // La capacité ne peut pas devenir inférieure aux réservations actives.
    if (donnees.places_totales < placesOccupees) {
      return res.status(409).json({
        message: 'La capacité ne peut pas être inférieure au nombre de places déjà réservées.',
        places_occupees: placesOccupees,
      });
    }

    await evenement.update(donnees);

    const evenementActualise = await Evenement.findByPk(id, {
      include: {
        model: Categorie,
        as: 'categorie',
        attributes: ['id', 'nom'],
      },
    });

    return res.status(200).json({
      message: 'Événement modifié avec succès.',
      evenement: ajouterDisponibilite(evenementActualise, placesOccupees),
    });
  } catch (error) {
    return handleEvenementError(error, res);
  }
};
/**
 * DELETE /api/events/:id ; Ajout de la suppression
 */
export const deleteEvenement = async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: 'Identifiant d’événement invalide.',
      });
    }

    const evenement = await Evenement.findByPk(id);

    if (!evenement) {
      return res.status(404).json({
        message: 'Événement introuvable.',
      });
    }

    await evenement.destroy();

    return res.status(200).json({
      message: 'Événement supprimé avec succès.',
    });
  } catch (error) {
    return handleEvenementError(error, res);
  }
};

import { ForeignKeyConstraintError, UniqueConstraintError, ValidationError } from 'sequelize';

import { Categorie, Evenement } from '../models/index.js';

/**
 * Transforme les principales erreurs Sequelize en réponses HTTP lisibles.
 */
const handleCategorieError = (error, res) => {
  if (error instanceof UniqueConstraintError) {
    return res.status(409).json({
      message: 'Cette catégorie existe déjà.',
    });
  }

  if (error instanceof ForeignKeyConstraintError) {
    return res.status(409).json({
      message: 'Impossible de supprimer cette catégorie car elle contient des événements.',
    });
  }

  if (error instanceof ValidationError) {
    return res.status(400).json({
      message: error.errors[0]?.message ?? 'Données invalides.',
    });
  }

  console.error('Erreur concernant les catégories :', error);

  return res.status(500).json({
    message: 'Une erreur interne est survenue.',
  });
};

/**
 * GET /api/categories
 */
export const getCategories = async (req, res) => {
  try {
    const categories = await Categorie.findAll({
      order: [['nom', 'ASC']],
    });

    return res.status(200).json(categories);
  } catch (error) {
    return handleCategorieError(error, res);
  }
};

/**
 * POST /api/categories
 */
export const createCategorie = async (req, res) => {
  try {
    const nom = typeof req.body.nom === 'string' ? req.body.nom.trim() : '';

    if (!nom) {
      return res.status(400).json({
        message: 'Le nom de la catégorie est obligatoire.',
      });
    }

    const categorie = await Categorie.create({ nom });

    return res.status(201).json({
      message: 'Catégorie créée avec succès.',
      categorie,
    });
  } catch (error) {
    return handleCategorieError(error, res);
  }
};

/**
 * PUT /api/categories/:id
 */
export const updateCategorie = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const nom = typeof req.body.nom === 'string' ? req.body.nom.trim() : '';

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        message: 'Identifiant de catégorie invalide.',
      });
    }

    if (!nom) {
      return res.status(400).json({
        message: 'Le nom de la catégorie est obligatoire.',
      });
    }

    const categorie = await Categorie.findByPk(id);

    if (!categorie) {
      return res.status(404).json({
        message: 'Catégorie introuvable.',
      });
    }

    categorie.nom = nom;
    await categorie.save();

    return res.status(200).json({
      message: 'Catégorie modifiée avec succès.',
      categorie,
    });
  } catch (error) {
    return handleCategorieError(error, res);
  }
};

/**
 * DELETE /api/categories/:id
 */
export const deleteCategorie = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({
        message: 'Identifiant de catégorie invalide.',
      });
    }

    const categorie = await Categorie.findByPk(id);

    if (!categorie) {
      return res.status(404).json({
        message: 'Catégorie introuvable.',
      });
    }

    /*
     * Une catégorie utilisée ne doit pas être supprimée.
     * Ce contrôle produit une réponse métier claire avant que
     * la contrainte de clé étrangère PostgreSQL intervienne.
     */
    const nombreEvenements = await Evenement.count({
      where: {
        id_categorie: id,
      },
    });

    if (nombreEvenements > 0) {
      return res.status(409).json({
        message: 'Impossible de supprimer cette catégorie car elle contient des événements.',
        nombre_evenements: nombreEvenements,
      });
    }

    await categorie.destroy();

    return res.status(200).json({
      message: 'Catégorie supprimée avec succès.',
    });
  } catch (error) {
    return handleCategorieError(error, res);
  }
};

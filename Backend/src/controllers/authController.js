import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UniqueConstraintError, ValidationError } from 'sequelize';

import { Utilisateur } from '../models/index.js';

export const register = async (req, res) => {
  try {
    // Récupère les informations envoyées dans le corps de la requête.
    const { nom, email, mot_de_passe } = req.body;

    // Vérifie la présence et le type des champs obligatoires.
    if (typeof nom !== 'string' || typeof email !== 'string' || typeof mot_de_passe !== 'string') {
      return res.status(400).json({
        message: 'Le nom, l’email et le mot de passe sont obligatoires.',
      });
    }

    if (mot_de_passe.length < 8) {
      return res.status(400).json({
        message: 'Le mot de passe doit contenir au moins 8 caractères.',
      });
    }

    // Évite les doublons liés aux majuscules ou aux espaces.
    const emailNormalise = email.trim().toLowerCase();

    const utilisateurExistant = await Utilisateur.findOne({
      where: {
        email: emailNormalise,
      },
    });

    if (utilisateurExistant) {
      return res.status(409).json({
        message: 'Un compte utilise déjà cette adresse email.',
      });
    }

    // Transforme le mot de passe en hash avant son enregistrement.
    const motDePasseHache = await bcrypt.hash(mot_de_passe, 10);

    const utilisateur = await Utilisateur.create({
      nom: nom.trim(),
      email: emailNormalise,
      mot_de_passe: motDePasseHache,

      // Une inscription publique crée toujours un simple utilisateur.
      role: 'user',
    });

    return res.status(201).json({
      message: 'Compte créé avec succès.',
      utilisateur: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        email: utilisateur.email,
        role: utilisateur.role,
      },
    });
  } catch (error) {
    // Protège aussi contre deux inscriptions simultanées avec le même email.
    if (error instanceof UniqueConstraintError) {
      return res.status(409).json({
        message: 'Un compte utilise déjà cette adresse email.',
      });
    }

    // Transforme les erreurs de validation Sequelize en réponse HTTP 400.
    if (error instanceof ValidationError) {
      return res.status(400).json({
        message: error.errors[0]?.message ?? 'Données invalides.',
      });
    }

    console.error('Erreur pendant l’inscription :', error);

    return res.status(500).json({
      message: 'Une erreur interne est survenue.',
    });
  }
};

//fonction login
export const login = async (req, res) => {
  try {
    const { email, mot_de_passe } = req.body;

    if (typeof email !== 'string' || typeof mot_de_passe !== 'string') {
      return res.status(400).json({
        message: 'L’email et le mot de passe sont obligatoires.',
      });
    }

    const emailNormalise = email.trim().toLowerCase();

    const utilisateur = await Utilisateur.findOne({
      where: {
        email: emailNormalise,
      },
    });

    // Le même message est utilisé si l'email ou le mot de passe est incorrect.
    if (!utilisateur) {
      return res.status(401).json({
        message: 'Email ou mot de passe incorrect.',
      });
    }

    const motDePasseValide = await bcrypt.compare(mot_de_passe, utilisateur.mot_de_passe);

    if (!motDePasseValide) {
      return res.status(401).json({
        message: 'Email ou mot de passe incorrect.',
      });
    }

    const token = jwt.sign(
      {
        id: utilisateur.id,
        role: utilisateur.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      },
    );

    return res.status(200).json({
      message: 'Connexion réussie.',
      token,
      utilisateur: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        email: utilisateur.email,
        role: utilisateur.role,
      },
    });
  } catch (error) {
    console.error('Erreur pendant la connexion :', error);

    return res.status(500).json({
      message: 'Une erreur interne est survenue.',
    });
  }
};

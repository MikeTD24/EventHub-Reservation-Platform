import { Router } from 'express';

import {
  getEvenements,
  getEvenementById,
  createEvenement,
  updateEvenement,
  deleteEvenement,
} from '../controllers/evenementController.js';

import { getReservationsByEvenement } from '../controllers/reservationController.js';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// Consultation publique des événements et de leur détail.
router.get('/', getEvenements);
router.get('/:id', getEvenementById);

// Toutes les routes des événements nécessitent une authentification.
router.use(authenticateToken);

/*
 * Consulte les participants d’un événement.
 * Cette information est réservée aux administrateurs.
 */
router.get('/:id/reservations', requireAdmin, getReservationsByEvenement);

// Gestion : administrateur uniquement.
router.post('/', requireAdmin, createEvenement);
router.put('/:id', requireAdmin, updateEvenement);
router.delete('/:id', requireAdmin, deleteEvenement);

export default router;

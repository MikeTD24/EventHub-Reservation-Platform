import { Router } from 'express';

import {
  createReservation,
  getMesReservations,
  updateReservation,
  cancelReservation,
} from '../controllers/reservationController.js';

import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

/*
 * Toutes les routes de réservation nécessitent
 * un utilisateur authentifié.
 */
router.use(authenticateToken);

/*
 * Consulte uniquement les réservations appartenant
 * à l’utilisateur identifié par le JWT.
 */
router.get('/', getMesReservations);

/*
 * Crée une réservation au nom de l’utilisateur
 * actuellement connecté.
 */
router.post('/', createReservation);

/*
 * Modifie une réservation appartenant à l’utilisateur connecté.
 */
router.put('/:id', updateReservation);

/*
 * Annule une réservation appartenant à l’utilisateur connecté.
 */
router.patch('/:id/cancel', cancelReservation);

export default router;

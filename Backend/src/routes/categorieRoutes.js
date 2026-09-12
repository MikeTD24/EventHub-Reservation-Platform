import { Router } from 'express';

import {
  createCategorie,
  deleteCategorie,
  getCategories,
  updateCategorie,
} from '../controllers/categorieController.js';

import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// Toutes les routes déclarées après cette ligne exigent un JWT.
router.use(authenticateToken);

router.get('/', getCategories);

router.post('/', requireAdmin, createCategorie);
router.put('/:id', requireAdmin, updateCategorie);
router.delete('/:id', requireAdmin, deleteCategorie);

export default router;

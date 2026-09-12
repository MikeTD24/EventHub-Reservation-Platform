import { Router } from 'express';

import { login, register } from '../controllers/authController.js';

const router = Router();

// POST /api/auth/register
router.post('/register', register);
router.post('/login', login);

export default router;

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import categorieRoutes from './routes/categorieRoutes.js';
import evenementRoutes from './routes/evenementRoutes.js';
import reservationRoutes from './routes/reservationRoutes.js';

const app = express();

// Autorise Angular à communiquer avec l'API.
app.use(cors());

// Permet à Express de lire le JSON envoyé dans req.body.
// Ce middleware doit être placé avant les routes.
app.use(express.json());

// Toutes les routes de authRoutes commenceront par /api/auth.
app.use('/api/auth', authRoutes);
app.use('/api/categories', categorieRoutes);
app.use('/api/events', evenementRoutes);
app.use('/api/reservations', reservationRoutes);

// Route de vérification de l'API.
app.get('/api/health', (req, res) => {
  res.status(200).json({
    message: 'API opérationnelle',
  });
});

export default app;

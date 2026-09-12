import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

// En production, Express sert aussi le build Angular. Le fallback renvoie
// index.html pour laisser Angular Router gérer les routes côté client.
if (process.env.NODE_ENV === 'production') {
  const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
  const frontendDirectory = path.resolve(currentDirectory, '../../Frontend/dist/frontend/browser');

  app.use(express.static(frontendDirectory));

  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) {
      return next();
    }

    return res.sendFile(path.join(frontendDirectory, 'index.html'));
  });
}

export default app;

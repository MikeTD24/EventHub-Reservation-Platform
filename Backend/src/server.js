import app from './app.js';
import { seedDemoData } from './config/seedDemoData.js';
import { sequelize } from './models/index.js';

const PORT = Number(process.env.PORT) || 3000;

const startServer = async () => {
  try {
    // Vérifie la connexion et crée les tables manquantes avant d'accepter
    // des requêtes HTTP. Aucune table existante n'est supprimée ou altérée.
    await sequelize.authenticate();
    await sequelize.sync();

    if (process.env.SEED_DEMO_DATA === 'true') {
      await seedDemoData();
    }

    console.log('Connexion PostgreSQL réussie');

    app.listen(PORT, () => {
      console.log(`Serveur démarré sur http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Impossible de démarrer le serveur :', error.message);
    process.exit(1);
  }
};

startServer();

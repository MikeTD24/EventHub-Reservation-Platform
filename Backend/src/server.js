import app from './app.js';
import sequelize from './config/database.js';

const PORT = Number(process.env.PORT) || 3000;

const startServer = async () => {
  try {
    // Vérifie la connexion avant d'accepter des requêtes HTTP.
    await sequelize.authenticate();
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

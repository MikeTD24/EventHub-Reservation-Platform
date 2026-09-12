import { sequelize } from '../models/index.js';

const syncDatabase = async () => {
  try {
    // Vérifie d'abord que PostgreSQL est accessible.
    await sequelize.authenticate();
    console.log('Connexion PostgreSQL réussie');

    // Crée uniquement les tables qui n'existent pas encore.
    await sequelize.sync();
    console.log('Tables synchronisées avec succès');
  } catch (error) {
    console.error('Erreur de synchronisation :', error.message);
    process.exitCode = 1;
  } finally {
    // Ferme la connexion, car ce script doit se terminer après son travail.
    await sequelize.close();
  }
};

syncDatabase();

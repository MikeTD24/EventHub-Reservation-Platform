import { Sequelize } from 'sequelize';

const options = {
  dialect: 'postgres',
  logging: false,
};

// Les plateformes d'hébergement fournissent généralement une URL complète.
// En local, les variables DB_* du fichier .env restent utilisées.
const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, options)
  : new Sequelize({
      ...options,
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
    });

export default sequelize;

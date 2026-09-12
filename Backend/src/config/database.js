import { Sequelize } from 'sequelize';

// Création de la connexion Sequelize vers PostgreSQL.
// Les variables sont chargées au démarrage avec --env-file=.env.
const sequelize = new Sequelize({
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  dialect: 'postgres',
  logging: false,
});

export default sequelize;

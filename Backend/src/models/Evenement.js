import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Evenement = sequelize.define(
  'Evenement',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    titre: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    lieu: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },

    date_evenement: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    places_totales: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 1,
      },
    },

    id_categorie: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: 'evenements',
    timestamps: false,
  },
);

export default Evenement;

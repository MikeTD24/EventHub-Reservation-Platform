import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Reservation = sequelize.define(
  'Reservation',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    nombre_places: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 1,
      },
    },

    statut: {
      type: DataTypes.ENUM('confirmee', 'annulee'),
      allowNull: false,
      defaultValue: 'confirmee',
    },

    date_reservation: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    id_utilisateur: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    id_evenement: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: 'reservations',
    timestamps: false,
  },
);

export default Reservation;

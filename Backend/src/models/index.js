import sequelize from '../config/database.js';

import Utilisateur from './Utilisateur.js';
import Categorie from './Categorie.js';
import Evenement from './Evenement.js';
import Reservation from './Reservation.js';

// Une catégorie contient plusieurs événements.
Categorie.hasMany(Evenement, {
  as: 'evenements',
  foreignKey: 'id_categorie',
  onUpdate: 'CASCADE',
  onDelete: 'RESTRICT',
});

// Un événement appartient à une seule catégorie.
Evenement.belongsTo(Categorie, {
  as: 'categorie',
  foreignKey: 'id_categorie',
  onUpdate: 'CASCADE',
  onDelete: 'RESTRICT',
});

// Un utilisateur peut effectuer plusieurs réservations.
Utilisateur.hasMany(Reservation, {
  as: 'reservations',
  foreignKey: 'id_utilisateur',
  onUpdate: 'CASCADE',
  onDelete: 'CASCADE',
});

// Une réservation appartient à un seul utilisateur.
Reservation.belongsTo(Utilisateur, {
  as: 'utilisateur',
  foreignKey: 'id_utilisateur',
  onUpdate: 'CASCADE',
  onDelete: 'CASCADE',
});

// Un événement peut recevoir plusieurs réservations.
Evenement.hasMany(Reservation, {
  as: 'reservations',
  foreignKey: 'id_evenement',
  onUpdate: 'CASCADE',
  onDelete: 'CASCADE',
});

// Une réservation concerne un seul événement.
Reservation.belongsTo(Evenement, {
  as: 'evenement',
  foreignKey: 'id_evenement',
  onUpdate: 'CASCADE',
  onDelete: 'CASCADE',
});

export { sequelize, Utilisateur, Categorie, Evenement, Reservation };

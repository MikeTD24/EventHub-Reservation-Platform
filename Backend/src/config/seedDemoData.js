import bcrypt from 'bcrypt';

import { Categorie, Evenement, Reservation, Utilisateur } from '../models/index.js';

const dateRelative = (nombreDeJours, heure = 19) => {
  const date = new Date();

  date.setUTCDate(date.getUTCDate() + nombreDeJours);
  date.setUTCHours(heure, 0, 0, 0);

  return date;
};

/**
 * Ajoute un jeu de données idempotent à une base de démonstration vide.
 * Cette fonction n'est exécutée que lorsque SEED_DEMO_DATA=true.
 */
export const seedDemoData = async () => {
  const categories = {};

  for (const nom of ['Concert', 'Conférence', 'Théâtre', 'Sports']) {
    const [categorie] = await Categorie.findOrCreate({ where: { nom } });
    categories[nom] = categorie;
  }

  const evenements = [
    {
      titre: 'Festival Jazz de Bruxelles',
      description: 'Une grande soirée consacrée au jazz au cœur de Bruxelles.',
      lieu: 'Bruxelles-Centre',
      date_evenement: dateRelative(75, 20),
      places_totales: 120,
      id_categorie: categories.Concert.id,
    },
    {
      titre: 'Atelier Angular',
      description: 'Un atelier pratique consacré aux formulaires réactifs Angular.',
      lieu: 'Bruxelles',
      date_evenement: dateRelative(45, 13),
      places_totales: 36,
      id_categorie: categories['Conférence'].id,
    },
    {
      titre: 'ZINC',
      description: 'Une création théâtrale contemporaine présentée à Liège.',
      lieu: 'Liège',
      date_evenement: dateRelative(20, 18),
      places_totales: 1,
      id_categorie: categories['Théâtre'].id,
    },
    {
      titre: 'Belgische Pro League',
      description: 'Une rencontre sportive ajoutée pour tester le filtre des événements terminés.',
      lieu: 'Malines',
      date_evenement: dateRelative(-7, 19),
      places_totales: 5,
      id_categorie: categories.Sports.id,
    },
  ];

  const evenementsCrees = {};

  for (const donnees of evenements) {
    const [evenement] = await Evenement.findOrCreate({
      where: { titre: donnees.titre },
      defaults: donnees,
    });

    evenementsCrees[donnees.titre] = evenement;
  }

  // Ce compte technique rend l'événement ZINC complet afin d'illustrer
  // le calcul des disponibilités sans exposer d'identifiants de connexion.
  const motDePasseTechnique = await bcrypt.hash(
    process.env.DEMO_SEED_PASSWORD ?? process.env.JWT_SECRET,
    10,
  );

  const [utilisateurDemo] = await Utilisateur.findOrCreate({
    where: { email: 'participant.demo@eventhub.local' },
    defaults: {
      nom: 'Participant Démo',
      mot_de_passe: motDePasseTechnique,
      role: 'user',
    },
  });

  await Reservation.findOrCreate({
    where: {
      id_utilisateur: utilisateurDemo.id,
      id_evenement: evenementsCrees.ZINC.id,
    },
    defaults: {
      nombre_places: 1,
      statut: 'confirmee',
    },
  });

  const emailAdmin = process.env.DEMO_ADMIN_EMAIL?.trim().toLowerCase();
  const motDePasseAdmin = process.env.DEMO_ADMIN_PASSWORD;

  if (emailAdmin && motDePasseAdmin) {
    const motDePasseHache = await bcrypt.hash(motDePasseAdmin, 10);
    const [administrateur, cree] = await Utilisateur.findOrCreate({
      where: { email: emailAdmin },
      defaults: {
        nom: 'Administrateur EventHub',
        mot_de_passe: motDePasseHache,
        role: 'admin',
      },
    });

    if (!cree) {
      await administrateur.update({
        mot_de_passe: motDePasseHache,
        role: 'admin',
      });
    }
  }

  console.log('Données de démonstration disponibles');
};

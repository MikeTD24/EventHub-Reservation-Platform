import { Routes } from '@angular/router';

import { Login } from './features/auth/pages/login/login';
import { Register } from './features/auth/pages/register/register';
import { EventDetail } from './features/events/pages/event-detail/event-detail';
import { EventList } from './features/events/pages/event-list/event-list';
import { MyReservations } from './features/reservations/pages/my-reservations/my-reservations';
import { NotFound } from './shared/pages/not-found/not-found';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { AdminCategories } from './features/admin/pages/admin-categories/admin-categories';
import { AdminEventList } from './features/admin/pages/admin-event-list/admin-event-list';
import { AdminEventForm } from './features/admin/pages/admin-event-form/admin-event-form';
import { AdminEventParticipants } from './features/admin/pages/admin-event-participants/admin-event-participants';

export const routes: Routes = [
  /*
   * L’adresse principale redirige vers la liste des événements.
   */
  {
    path: '',
    redirectTo: 'evenements',
    pathMatch: 'full',
  },

  {
    path: 'connexion',
    component: Login,
    title: 'Connexion',
  },
  {
    path: 'inscription',
    component: Register,
    title: 'Inscription',
  },
  {
    path: 'evenements',
    component: EventList,
    title: 'Événements',
  },
  {
    path: 'evenements/:id',
    component: EventDetail,
    title: 'Détail de l’événement',
  },
  {
    path: 'mes-reservations',
    component: MyReservations,
    canActivate: [authGuard],
    title: 'Mes réservations',
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    children: [
      {
        path: '',
        redirectTo: 'evenements',
        pathMatch: 'full',
      },
      {
        path: 'evenements',
        component: AdminEventList,
        title: 'Gestion des événements',
      },
      {
        path: 'evenements/nouveau',
        component: AdminEventForm,
        title: 'Créer un événement',
      },
      {
        path: 'evenements/:id/modifier',
        component: AdminEventForm,
        title: 'Modifier un événement',
      },
      {
        path: 'categories',
        component: AdminCategories,
        title: 'Gestion des catégories',
      },
      {
        path: 'evenements/:id/reservations',
        component: AdminEventParticipants,
        title: 'Participants de l’événement',
      },
    ],
  },

  /*
   * Cette route doit rester en dernière position.
   * Elle intercepte toutes les adresses inconnues.
   */
  {
    path: '**',
    component: NotFound,
    title: 'Page introuvable',
  },
];

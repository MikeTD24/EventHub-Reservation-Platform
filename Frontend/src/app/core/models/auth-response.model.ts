import { Utilisateur } from './utilisateur.model';

export interface AuthResponse {
  message: string;
  token: string;
  utilisateur: Utilisateur;
}

export interface RegisterResponse {
  message: string;
  utilisateur: Utilisateur;
}

export interface LoginPayload {
  email: string;
  mot_de_passe: string;
}

export interface RegisterPayload {
  nom: string;
  email: string;
  mot_de_passe: string;
}

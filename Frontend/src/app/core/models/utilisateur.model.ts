export type UserRole = 'user' | 'admin';

export interface Utilisateur {
  id: number;
  nom: string;
  email: string;
  role: UserRole;
}

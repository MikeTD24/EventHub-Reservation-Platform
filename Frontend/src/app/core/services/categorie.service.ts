import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiMessage } from '../models/api-response.model';
import { Categorie, CategoriePayload, CategorieResponse } from '../models/categorie.model';

@Injectable({
  providedIn: 'root',
})
export class CategorieService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = 'http://localhost:3000/api/categories';

  /**
   * Récupère toutes les catégories, triées par le backend.
   */
  getCategories(): Observable<Categorie[]> {
    return this.http.get<Categorie[]>(this.apiUrl);
  }

  /**
   * Crée une nouvelle catégorie.
   * Le backend réserve cette opération aux administrateurs.
   */
  createCategorie(payload: CategoriePayload): Observable<CategorieResponse> {
    return this.http.post<CategorieResponse>(this.apiUrl, payload);
  }

  /**
   * Modifie le nom d’une catégorie existante.
   */
  updateCategorie(id: number, payload: CategoriePayload): Observable<CategorieResponse> {
    return this.http.put<CategorieResponse>(`${this.apiUrl}/${id}`, payload);
  }

  /**
   * Supprime une catégorie ne contenant aucun événement.
   */
  deleteCategorie(id: number): Observable<ApiMessage> {
    return this.http.delete<ApiMessage>(`${this.apiUrl}/${id}`);
  }
}

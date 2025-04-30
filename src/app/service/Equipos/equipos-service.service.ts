import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EquiposServiceService {

  private apiUrl = 'http://localhost:8080/api/equipos'; // URL de la API
  
  private equiposCache: any[] | null = null; // Cache para almacenar los equipos

  constructor(private http: HttpClient) { }

  clearCache(): void {
      this.equiposCache = null; // Limpiar el caché
    }
  
  private handleError(error: HttpErrorResponse) {
      console.error('Error en la solicitud:', error.message);
      return throwError(() => new Error('Error en la solicitud; por favor, inténtelo de nuevo más tarde.'));
  }

  getEquipos(Razon: string, NombreLocal: string): Observable<string[]> {
      const params = new HttpParams()
        .set('Razon', Razon)
        .set('NombreLocal', NombreLocal);
      return this.http.get<string[]>(this.apiUrl, { params }).pipe(
        map(response => {
          this.equiposCache = [...response];
           return response; // Devolver la respuesta sin modificarla
        }), catchError(this.handleError)
      );
    }
}

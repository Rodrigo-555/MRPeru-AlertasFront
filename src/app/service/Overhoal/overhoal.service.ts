import { Injectable } from '@angular/core';
import { Equipos } from '../../interface/equipos.interface.o';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OverhoalService {

  private apiUrl = 'http://localhost:8080/api/Overhoal';
  
    private equiposCache: Equipos[] | null = null; 
    
    constructor(private http: HttpClient) { }
  
    clearCache(): void {
        this.equiposCache = null; // Limpiar el caché
    }
    
    private handleError(error: HttpErrorResponse) {
          console.error('Error en la solicitud:', error.message);
          return throwError(() => new Error('Error en la solicitud; por favor, inténtelo de nuevo más tarde.'));
    }
  
    getProximoServicio(CategoriaDesc: string): Observable<Equipos[]> {
      const params = new HttpParams()
        .set('CategoriaDesc', CategoriaDesc);
    
      console.log('Llamando a API con parámetros:', params.toString());
    
      return this.http.get<Equipos[]>(this.apiUrl, { params }).pipe(
        map((response: Equipos[]) => {
          console.log('Respuesta del servicio:', response);
          this.equiposCache = [...response];
          return response;
        }),
        catchError(error => {
          console.error('Error detallado:', error);
          return this.handleError(error);
        })
      );
    }
}

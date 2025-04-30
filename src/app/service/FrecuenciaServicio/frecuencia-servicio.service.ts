import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Equipos } from '../../interface/equipos.interface.fs';
import { catchError, map, Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FrecuenciaServicioService {

  private apiUrl = 'http://localhost:8080/api/frecuenciaServicio';

  private equiposCache: Equipos[] | null = null; 

  constructor(private http: HttpClient) { }

  clearCache(): void {
    this.equiposCache = null; // Limpiar el caché
  }

  private handleError(error: HttpErrorResponse) {
      console.error('Error en la solicitud:', error.message);
      return throwError(() => new Error('Error en la solicitud; por favor, inténtelo de nuevo más tarde.'));
  }


  getFrecuenciaServicio(NombreLocal: string): Observable<Equipos[]> {
      const params = new HttpParams().set('NombreLocal', NombreLocal);
      return this.http.get<Equipos[]>(this.apiUrl, { params }).pipe(
        map(response => {
          this.equiposCache = [...response];
           return response; // Devolver la respuesta sin modificarla
        }), catchError(this.handleError)
    );
  }

  getEquipoDetalle(nombrePlanta: string, equipoId: string): Observable<Equipos> {
    return this.http.get<Equipos>(
      `${this.apiUrl}/equipos/${encodeURIComponent(nombrePlanta)}/${encodeURIComponent(equipoId)}`
    );
  }

  getAllEquiposByCliente(clienteId: string): Observable<Equipos[]> {
    return this.http.get<Equipos[]>(`${this.apiUrl}/cliente-equipos/${encodeURIComponent(clienteId)}`);
  }
}

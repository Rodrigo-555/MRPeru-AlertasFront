import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Equipos } from '../../interface/equipos.interface.ps';
import { catchError, map, Observable, of, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProximoServicioService {

  private apiUrl = 'http://localhost:8080/api/ProximoServicio';

  private equiposCache: Equipos[] | null = null; 
  
  constructor(private http: HttpClient) { }

  clearCache(): void {
      this.equiposCache = null; // Limpiar el caché
  }
  
  private handleError(error: HttpErrorResponse) {
        console.error('Error en la solicitud:', error.message);
        return throwError(() => new Error('Error en la solicitud; por favor, inténtelo de nuevo más tarde.'));
  }

  getProximoServicio(NombreCliente: string, NombrePlanta: string): Observable<Equipos[]> {
    const params = new HttpParams()
      .set('NombreCliente', NombreCliente)
      .set('NombrePlanta', NombrePlanta);
  
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

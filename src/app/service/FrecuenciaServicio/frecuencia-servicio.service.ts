import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Equipos } from '../../interface/equipos.interface.fs';
import { catchError, map, Observable, of, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FrecuenciaServicioService {

  private apiUrl = 'http://localhost:8080/api/frecuenciaServicio';

  private equiposCache: Equipos[] | null = null; 

  private equiposPorLocalCache: { [localName: string]: Equipos[] } = {};
  private equiposClienteCache: { [clienteName: string]: Equipos[] } = {};

  constructor(private http: HttpClient) { }

  clearCache(): void {
    this.equiposCache = null;
    this.equiposPorLocalCache = {};
    this.equiposClienteCache = {};
  }

  private handleError(error: HttpErrorResponse) {
    console.error('Error en la solicitud:', error.message);
    return throwError(() => new Error('Error en la solicitud; por favor, inténtelo de nuevo más tarde.'));
  }

  getEquiposTotales(Razon: string): Observable<Equipos[]> {
    // Verificar el caché por cliente
    if (this.equiposClienteCache[Razon]) {
      console.log(`Usando caché para equipos del cliente ${Razon}`);
      return of([...this.equiposClienteCache[Razon]]);
    }

    const params = new HttpParams().set('Razon', Razon);
    return this.http.get<Equipos[]>(`${this.apiUrl}/equipostotales`, { params }).pipe(
      map(response => {
        // Almacenar en ambos cachés
        this.equiposCache = [...response];
        this.equiposClienteCache[Razon] = [...response];
        return response;
      }), catchError(this.handleError)
    );
  }

  getFrecuenciaServicio(NombreLocal: string, Razon?: string): Observable<Equipos[]> {
    // Verificar si ya tenemos estos datos en caché
    if (this.equiposPorLocalCache[NombreLocal]) {
      console.log(`Usando caché para equipos de ${NombreLocal}`);
      return of([...this.equiposPorLocalCache[NombreLocal]]);
    }

    // Construir los parámetros según los datos disponibles
    let params = new HttpParams().set('NombreLocal', NombreLocal);
    if (Razon) {
      params = params.set('Razon', Razon);
    }
    
    return this.http.get<Equipos[]>(`${this.apiUrl}/equiposlocales`, { params }).pipe(
      map(response => {
        // Almacenar en caché
        this.equiposPorLocalCache[NombreLocal] = [...response];
        return response;
      }), 
      catchError(this.handleError)
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

  clearLocalCache(NombreLocal?: string): void {
    if (NombreLocal) {
      delete this.equiposPorLocalCache[NombreLocal];
      console.log(`Caché limpiado para ${NombreLocal}`);
    } else {
      this.equiposPorLocalCache = {};
      this.equiposCache = null;
      this.equiposClienteCache = {};
      console.log('Toda la caché ha sido limpiada');
    }
  }
}
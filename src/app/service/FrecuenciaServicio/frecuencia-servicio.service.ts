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
    return this.http.get<any[]>(`${this.apiUrl}/equipostotales`, { params }).pipe(
      map(response => {
        // Normalizar los datos - mapear HorometroUltimoServicio a horometro
        const equiposNormalizados = response.map(item => {
          return {
            ...item,
            // Asegurarse de que horometro siempre exista
            horometro: item.HorometroUltimoServicio || item.horometroUltimoServicio || 0
          };
        });
        
        // Almacenar en ambos cachés
        this.equiposCache = [...equiposNormalizados];
        this.equiposClienteCache[Razon] = [...equiposNormalizados];
        return equiposNormalizados;
      }), 
      catchError(this.handleError)
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

  getEquipoIndividual(nombreLocal: string, razon: string, maquina: string): Observable<Equipos> {
    const params = new HttpParams()
      .set('NombreLocal', nombreLocal)
      .set('Razon', razon)
      .set('Maquina', maquina);
    
    return this.http.get<Equipos>(`${this.apiUrl}/equiposIndividuales`, { params }).pipe(
      map(response => {
        // Asegurar que la propiedad local esté establecida
        return { ...response, local: nombreLocal };
      }),
      catchError(this.handleError)
    );
  }

  getEquipoDetalle(nombrePlanta: string, equipoId: string): Observable<Equipos> {
    console.log(`Buscando equipo: ${equipoId} en planta: ${nombrePlanta}`);
    
    // Usar el endpoint existente para obtener todos los equipos de la planta
    return this.getFrecuenciaServicio(nombrePlanta).pipe(
      map(equipos => {
        // Buscar el equipo específico en la lista de equipos de la planta
        const equipoEncontrado = equipos.find(equipo => 
          equipo.serie === equipoId || equipo.referencia === equipoId);
          
        if (!equipoEncontrado) {
          throw new Error(`Equipo ${equipoId} no encontrado en ${nombrePlanta}`);
        }
        
        return equipoEncontrado;
      })
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
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Cliente } from '../../interface/clientes.interface.';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, retry, delay } from 'rxjs/operators';
import { Detalles } from '../../interface/detalles.interface';

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private apiUrl = 'http://localhost:8080/api/clientes'; // URL de la API
  private clientesCache: Map<string, Cliente[]> = new Map(); // Cache mejorado usando Map
  private detallesCache: Map<string, Detalles[]> = new Map(); // Cache para detalles

  constructor(private http: HttpClient) { }

  clearCache(): void {
    this.clientesCache.clear();
    this.detallesCache.clear();
  }

  private handleError(error: HttpErrorResponse, operacion: string = 'operación') {
    // Log del error con más contexto
    console.error(`Error en ${operacion}:`, error.message);
    console.error('Estado HTTP:', error.status);
    console.error('URL:', error.url);
    
    // Mensajes específicos según el código de error
    let errorMessage = 'Error en la solicitud; por favor, inténtelo de nuevo más tarde.';
    
    if (error.status === 0) {
      errorMessage = 'No se puede conectar al servidor. Verifique su conexión de red.';
    } else if (error.status === 404) {
      errorMessage = 'Recurso no encontrado. Verifique la URL del servicio.';
    } else if (error.status === 500) {
      errorMessage = 'Error interno del servidor. Intente más tarde o contacte a soporte técnico.';
    }
    
    // Notificación visual (opcional)
    this.mostrarNotificacionError(errorMessage);
    
    // Retornar un observable con el mensaje de error
    return throwError(() => new Error(errorMessage));
  }

  // Método para mostrar una notificación visual (implementa según tu UI)
  private mostrarNotificacionError(mensaje: string): void {
    console.warn('Notificación de error:', mensaje);
    // Aquí podrías implementar un toast, alert o cualquier notificación visual
  }

  getClientes(CategoriaDesc: string): Observable<Cliente[]> {
    // Verificar primero si tenemos los datos en caché
    if (this.clientesCache.has(CategoriaDesc)) {
      console.log(`Usando caché para clientes de categoría: ${CategoriaDesc}`);
      return of(this.clientesCache.get(CategoriaDesc)!);
    }

    const params = new HttpParams().set('CategoriaDesc', CategoriaDesc);
    
    return this.http.get<Cliente[]>(this.apiUrl, { params }).pipe(
      // Reintentar automáticamente hasta 2 veces con un retraso de 1 segundo
      retry({ count: 2, delay: 1000 }),
      map(response => {
        // Guardar en caché
        this.clientesCache.set(CategoriaDesc, [...response]);
        return response;
      }),
      catchError(error => this.handleError(error, `getClientes(${CategoriaDesc})`))
    );
  }

  getDetallesClientes(Razon: string): Observable<Detalles[]> {
    // Si el input está vacío o no es válido, retornar un array vacío
    if (!Razon || Razon.trim() === '') {
      return of([]);
    }
    
    // Normalizar la clave de caché para evitar duplicados
    const cacheKey = Razon.trim().toLowerCase();
    
    // Verificar primero si tenemos los datos en caché
    if (this.detallesCache.has(cacheKey)) {
      return of(this.detallesCache.get(cacheKey)!);
    }
    
    const params = new HttpParams().set('Razon', Razon);
    
    return this.http.get<Detalles[]>(`${this.apiUrl}/locales`, { params }).pipe(
      // Reducir a un solo reintento para evitar sobrecarga
      retry(1),
      map(response => {
        // Guardar en caché usando la clave normalizada
        this.detallesCache.set(cacheKey, response);
        return response;
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          return of([]);
        }
        return this.handleError(error, `getDetallesClientes(${Razon})`);
      })
    );
  }
  
  // Método alternativo que implementa un fallback con datos mockeados en caso de error
  getDetallesClientesConFallback(Razon: string): Observable<Detalles[]> {
    return this.getDetallesClientes(Razon).pipe(
      catchError(error => {
        console.warn(`Usando datos locales para ${Razon} debido a un error:`, error);
        // Retornar datos predeterminados temporales si hay un error
        return of([{
          id: 0,
          nombre: Razon,
          ruc: 'Sin información',
          // Otros campos necesarios según tu interfaz...
        }] as unknown as Detalles[]);
      })
    );
  }

  precargarRUCsEficiente(clientes: Cliente[]): void {
    // Limitar el número de solicitudes paralelas
    const batchSize = 5;
    const clientesSinRUC = clientes.filter(c => !c.ruc);
    
    // Procesamos por lotes para no saturar el servidor
    for (let i = 0; i < clientesSinRUC.length; i += batchSize) {
      const lote = clientesSinRUC.slice(i, i + batchSize);
      setTimeout(() => {
        lote.forEach(cliente => {
          // Comprobar de nuevo por si acaso se ha cargado mientras tanto
          if (!cliente.ruc) {
            this.getDetallesClientesConFallback(cliente.nombre)
              .subscribe(data => {
                if (data && data.length > 0) {
                  cliente.ruc = data[0].ruc || '';
                }
              });
          }
        });
      }, i * 100); // Espaciamos las solicitudes
    }
  }
}
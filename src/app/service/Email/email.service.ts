import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private apiUrl = 'http://localhost:8080/api/alertas';

  constructor(private http: HttpClient) { }

  // Enviar alertas para todos los equipos de un cliente
  enviarAlertasEquipos(razon: string, diasAnticipacion: number = 7): Observable<any> {
    const params = new HttpParams()
      .set('razon', razon)
      .set('diasAnticipacion', diasAnticipacion.toString());

    console.log(`Enviando solicitud a ${this.apiUrl}/enviar-alertas-equipos con parámetros:`, params.toString());

    return this.http.post(`${this.apiUrl}/enviar-alertas-equipos`, null, { params })
      .pipe(
        tap(response => console.log('Alertas enviadas:', response)),
        catchError(this.handleError)
      );
  }
  

  // Enviar alertas para los equipos de un local específico
  enviarAlertasLocal(nombreLocal: string, razon: string, diasAnticipacion: number = 7): Observable<any> {
    const params = new HttpParams()
      .set('nombreLocal', nombreLocal)
      .set('razon', razon)
      .set('diasAnticipacion', diasAnticipacion.toString());

    console.log(`Enviando solicitud a ${this.apiUrl}/enviar-alertas-local con parámetros:`, params.toString());

    return this.http.post(`${this.apiUrl}/enviar-alertas-local`, null, { params })
      .pipe(
        tap(response => console.log('Alertas locales enviadas:', response)),
        catchError(this.handleError)
      );
  }

  // Enviar alerta para un equipo específico usando el nuevo endpoint manual
  enviarAlertaEquipo(nombrePlanta: string, equipoId: string, email: string, tipoEquipo?: string, serie?: string, fechaProxima?: string): Observable<any> {
    console.log(`Enviando alerta manual para equipo ${equipoId} en ${nombrePlanta}, email: ${email}`);
    
    // Construir los parámetros para la solicitud
    let params = new HttpParams()
      .set('nombrePlanta', nombrePlanta)
      .set('referencia', equipoId)
      .set('email', email);
    
    // Añadir los parámetros opcionales si están disponibles
    if (tipoEquipo) params = params.set('tipoEquipo', tipoEquipo);
    if (serie) params = params.set('serie', serie);
    if (fechaProxima) params = params.set('fechaProxima', fechaProxima);
    
    // Si no se proporciona tipo de equipo o serie, utilizar valores por defecto
    if (!tipoEquipo) params = params.set('tipoEquipo', 'Compresor');
    if (!serie) params = params.set('serie', equipoId);
    
    return this.http.post(`${this.apiUrl}/enviar-alerta-manual`, null, { params })
      .pipe(
        tap(response => console.log('Alerta equipo enviada:', response)),
        catchError(this.handleError)
      );
  }

  // Enviar correo de prueba
  enviarCorreoPrueba(correoDestino: string): Observable<any> {
    const params = new HttpParams().set('correoDestino', correoDestino);
    
    console.log(`Enviando correo de prueba a ${correoDestino}`);
    
    return this.http.post(`${this.apiUrl}/prueba-correo`, null, { params })
      .pipe(
        tap(response => console.log('Correo de prueba enviado:', response)),
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Error desconocido';
    
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else if (error.status === 0) {
      // Error de conexión
      errorMessage = 'No se pudo conectar con el servidor. Verifique que el servidor backend esté en ejecución y sea accesible.';
      console.error('Detalles del error de conexión:', error);
    } else {
      // Error del servidor
      errorMessage = `El servidor respondió con código ${error.status}: ${error.statusText}`;
      if (error.error && error.error.message) {
        errorMessage += ` - ${error.error.message}`;
      }
    }
    
    console.error('Error en el servicio de email:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
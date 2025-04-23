import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Cliente } from '../../interface/clientes.interface.';
import { catchError, map, Observable, throwError } from 'rxjs';
import { response } from 'express';


@Injectable({
  providedIn: 'root'
})
export class ClienteService {

  private apiUrl = 'http://localhost:8080/api/clientes'; // URL de la API

  private clientesCache: Cliente[] | null = null; // Cache para almacenar los clientes


  constructor(private http: HttpClient) { }

  clearCache(): void {
    this.clientesCache = null; // Limpiar el caché
  }

  private handleError(error: HttpErrorResponse) {
    console.error('Error en la solicitud:', error.message);
    return throwError(() => new Error('Error en la solicitud; por favor, inténtelo de nuevo más tarde.'));
  }

  getClientes(CategoriaDesc: string): Observable<Cliente[]> {
    const params = new HttpParams().set('CategoriaDesc', CategoriaDesc);
    return this.http.get<Cliente[]>(this.apiUrl, { params }).pipe(
      map(response => {
        this.clientesCache = [...response];
         return response; // Devolver la respuesta sin modificarla
      }), catchError(this.handleError)
    );
  }
}

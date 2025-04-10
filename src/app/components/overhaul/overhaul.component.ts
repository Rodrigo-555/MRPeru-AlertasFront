import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ClienteNode, ClientesData } from '../../interface/clientes.interface.fs';
import { Equipos, PlantasData, Planta } from '../../interface/equipos.interface.fs';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-overhaul',
  standalone: true,
  imports: [CommonModule,HttpClientModule, FormsModule],
  templateUrl: './overhaul.component.html',
  styleUrl: './overhaul.component.scss'
})
export class OverhaulComponent implements OnInit {

  clientesData!: ClienteNode[];
    plantas: Planta[] = [];
    equiposOriginales: Equipos[] = [];
    equiposFiltrados: Equipos[] = [];
  
    plantaSeleccionada: string | null = null;
  
  
    constructor(private http: HttpClient) {}
  
    equipoSeleccionado: any = null;
  
    ngOnInit(): void {
      this.loadClientesData();
    }
  
    /**
     * Carga el árbol de clientes desde el JSON.
     */
    parseDate(dateString: string): Date {
      const [day, month, year] = dateString.split('/').map(Number);
      return new Date(year, month - 1, day);
    }
  
  
    filtrarPorPlanta(nombrePlanta: string): void {
      this.plantaSeleccionada = nombrePlanta;
      const planta = this.plantas.find(p => p.nombre === nombrePlanta);
      this.equiposOriginales = planta ? planta.equipos : [];
    }
  
  
    private loadClientesData(): void {
      this.http.get<ClientesData>('assets/json/clientes-data-ps.json').subscribe({
        next: (data) => this.clientesData = data.clientes,
        error: (err) => console.error('Error fetching clientes:', err)
      });
    }

      /**
       * Funciones trackBy para optimizar los *ngFor del template.
       */
      trackByCliente(index: number, item: ClienteNode): string {
        return item.nombre;
      }
    
      trackBySubcliente(index: number, item: any): string {
        return item.nombre;
      }
    
      trackByPlanta(index: number, item: any): string {
        return item.nombre;
      }
    
      trackByEquipo(index: number, item: Equipos): string {
        // Se asume que 'referencia' es un identificador único
        return item.referencia;
      }

}

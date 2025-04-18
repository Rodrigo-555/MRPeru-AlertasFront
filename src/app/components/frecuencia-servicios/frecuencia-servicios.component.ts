import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ClienteNode, ClientesData } from '../../interface/clientes.interface.fs';
import { Equipos, PlantasData, Planta } from '../../interface/equipos.interface.fs';

@Component({
  selector: 'app-frecuencia-servicios',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './frecuencia-servicios.component.html',
  styleUrls: ['./frecuencia-servicios.component.scss']
})
export class FrecuenciaServiciosComponent implements OnInit {
  clientesData!: ClienteNode[];
  plantas: Planta[] = [];
  plantasData!: PlantasData;
  equiposOriginales: Equipos[] = [];
  equiposFiltrados: Equipos[] = [];

  // Variables para filtros
  estadoSeleccionado: string = '';
  estadoMantenimientoSeleccionado: string = '';
  busquedaCliente: string = '';
  plantaSeleccionada: string | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadClientesData();
    this.loadPlantasData();
  }

  /**
   * Carga el árbol de clientes desde el JSON.
   */
  private loadClientesData(): void {
    this.http.get<ClientesData>('assets/json/clientes-data-fs.json').subscribe({
      next: (data) => this.clientesData = data.clientes,
      error: (err) => console.error('Error fetching clientes:', err)
    });
  }

  /**
   * Carga los equipos y plantas, y establece por defecto la primera planta.
   */
  private loadPlantasData(): void {
    this.http.get<PlantasData>('assets/json/equipos-data-fs.json').subscribe({
      next: (data:PlantasData) => {
        this.plantasData = data;
        if (this.plantasData.plantas.length > 0) {
          this.filtrarPorPlanta(this.plantasData.plantas[0].nombre);
        }
      },
      error: (err) => console.error('Error fetching equipos:', err)
    });
  }

  /**
   * Filtra los equipos por la planta seleccionada y actualiza el listado.
   * @param nombrePlanta Nombre de la planta a filtrar.
   */
  filtrarPorPlanta(nombrePlanta: string): void {
    this.plantaSeleccionada = nombrePlanta;
    const planta = this.plantasData.plantas.find(p => p.nombre === nombrePlanta);
    this.equiposOriginales = planta ? planta.equipos : [];
    this.filtrarEquipos();
  }

  /**
   * Aplica los filtros de estado, mantenimiento y búsqueda de cliente a la lista de equipos.
   */
  filtrarEquipos(): void {
    this.equiposFiltrados = this.equiposOriginales.filter(equipo => {
      const coincideEstado = !this.estadoSeleccionado || equipo.estado === this.estadoSeleccionado;
      const coincideMantenimiento = !this.estadoMantenimientoSeleccionado || equipo.estado_mantenimiento === this.estadoMantenimientoSeleccionado;
      const coincideCliente = !this.busquedaCliente || equipo.contacto.toLowerCase().includes(this.busquedaCliente.toLowerCase());
      return coincideEstado && coincideMantenimiento && coincideCliente;
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

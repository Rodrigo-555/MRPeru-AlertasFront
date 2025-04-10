import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ClienteNode, ClientesData } from '../../interface/clientes.interface.ps';
import { Equipos, PlantasData, Planta } from '../../interface/equipos.interface.ps';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-proximo-servicio',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './proximo-servicio.component.html',
  styleUrls: ['./proximo-servicio.component.scss']
})
export class ProximoServicioComponent implements OnInit {

  clientesData!: ClienteNode[];
  plantas: Planta[] = [];
  plantasData!: PlantasData;
  equiposOriginales: Equipos[] = [];
  equiposFiltrados: Equipos[] = [];

  // Variable para el filtro de fecha (formato "YYYY-MM")
  fechaFiltro: string = '';

  // Conservamos la variable para la planta seleccionada
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
    this.http.get<ClientesData>('assets/json/clientes-data-ps.json').subscribe({
      next: (data) => this.clientesData = data.clientes,
      error: (err) => console.error('Error fetching clientes:', err)
    });
  }

  /**
   * Carga los equipos y plantas, y establece por defecto la primera planta.
   */
  private loadPlantasData(): void {
    this.http.get<PlantasData>('assets/json/equipos-data-ps.json').subscribe({
      next: (data: PlantasData) => {
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
   * Filtra los equipos según el año y mes seleccionado en la variable `fechaFiltro`.
   * Se compara el valor del input (formato "YYYY-MM") con la parte correspondiente de `fecha_notificacion`.
   * Si no se ingresa ningún valor, se muestran todos los equipos.
   */
  filtrarEquipos(): void {
    if (!this.fechaFiltro) {
      this.equiposFiltrados = [...this.equiposOriginales];
      return;
    }

    // El input de tipo "month" devuelve una cadena en formato "YYYY-MM"
    const filtro = this.fechaFiltro; // Ejemplo: "2023-10"

    this.equiposFiltrados = this.equiposOriginales.filter(equipo => {
      // Extrae la parte "YYYY-MM" de la fecha (formato: "YYYY-MM-DD")
      const fechaEquipoYM = equipo.fecha_notificacion.substring(0, 7);
      return fechaEquipoYM === filtro;
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

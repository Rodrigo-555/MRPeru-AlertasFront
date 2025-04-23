import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Equipos, Planta } from '../../interface/equipos.interface.fs';
import { ClienteService } from '../../service/Clientes/cliente.service';
import { FrecuenciaServicioService } from '../../service/FrecuenciaServicio/frecuencia-servicio.service';
import { Cliente } from '../../interface/clientes.interface.';

@Component({
  selector: 'app-frecuencia-servicios',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './frecuencia-servicios.component.html',
  styleUrls: ['./frecuencia-servicios.component.scss']
})
export class FrecuenciaServiciosComponent implements OnInit {
  clienteCategories: any[] = [];
  equiposOriginales: Equipos[] = [];
  equiposFiltrados: Equipos[] = [];

  // Variables para filtros
  estadoSeleccionado: string = '';
  estadoMantenimientoSeleccionado: string = '';
  busquedaContacto: string = '';
  plantaSeleccionada: string | null = null;

  constructor(
    private http: HttpClient, 
    private cdr: ChangeDetectorRef, 
    private clienteService: ClienteService, 
    private frecuenciaServicioService: FrecuenciaServicioService
  ) {}

  ngOnInit() {
    this.loadClientes();
  }

  private loadClientes(): void {
    const categories = [
      { name: "Clientes con Servicios Regulares", title: "Clientes con Servicios Regulares" },
      { name: "Clientes con Servicios No-Regulares", title: "Clientes con Servicios No-Regulares" },
      { name: "Clientes con Servicios Antiguos-Recientes", title: "Clientes con Servicios Antiguos-Recientes" },
      { name: "Clientes con Servicios Antiguos", title: "Clientes con Servicios Antiguos" },
      { name: "Clientes sin servicios", title: "Clientes sin servicios" },
      { name: "No Es Cliente", title: "No Es Cliente" },
    ];

    categories.forEach(category => {
      this.clienteService.getClientes(category.name).subscribe(
        (data: Cliente[]) => {
          this.clienteCategories.push({ title: category.title, clientes: data });
          this.cdr.detectChanges();
        },
        error => {
          console.error(`Error al cargar los clientes de ${category.name}:`, error);
        }
      );
    });
  }

  private cargarEquiposFrecuenciaServicio(nombrePlanta: string): void {
    this.frecuenciaServicioService.getFrecuenciaServicio(nombrePlanta).subscribe(
      (data: Equipos[]) => {
        this.equiposOriginales = data;
        this.equiposFiltrados = [...this.equiposOriginales];
        this.cdr.detectChanges();
      },
      error => {
        console.error('Error al cargar los equipos:', error);
      }
    );
  }

  seleccionarPlanta(nombrePlanta: string): void {
    this.plantaSeleccionada = nombrePlanta;
    this.cargarEquiposFrecuenciaServicio(nombrePlanta);
  }

  filtrarEquipos(): void {
    this.equiposFiltrados = this.equiposOriginales.filter(equipo => {
      const coincideEstado = !this.estadoSeleccionado || equipo.estado === this.estadoSeleccionado;
      const coincideMantenimiento = !this.estadoMantenimientoSeleccionado || equipo.estadoMantenimiento === this.estadoMantenimientoSeleccionado;
      const coincideCliente = !this.busquedaContacto || equipo.contacto.toLowerCase().includes(this.busquedaContacto.toLowerCase());
      return coincideEstado && coincideMantenimiento && coincideCliente;
    });
  }

  trackByCliente(index: number, item: Cliente): string {
    return item.nombre;
  }

  trackByPlanta(index: number, item: Planta): string {
    return item.nombre;
  }

  trackByEquipo(index: number, item: Equipos): string {
    return item.referencia;
  }
}

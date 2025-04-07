import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http'; // 👈 Importa esto
import { ClienteNode, ClientesData } from '../../interface/clientes.interface';
import { Equipos, EquiposData, Planta } from '../../interface/equipos.interface'; // Asegúrate de que la ruta sea correcta

@Component({
  selector: 'app-frecuencia-servicios',
  standalone: true,
  imports: [CommonModule, HttpClientModule,FormsModule], 
  templateUrl: './frecuencia-servicios.component.html',
  styleUrl: './frecuencia-servicios.component.scss'
})
export class FrecuenciaServiciosComponent implements OnInit {

  clientesData!: ClienteNode[];
  plantas: Planta[] = [];
  equiposOriginales: Equipos[] = [];
  equiposFiltrados: Equipos[] = [];

  // Nuevas variables de filtro
  estadoSeleccionado: string = '';
  estadoMantenimientoSeleccionado: string = '';
  busquedaCliente: string = '';

  plantaSeleccionada: string | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // Cargar el árbol de clientes
    this.http.get<ClientesData>('assets/json/clientes-data.json').subscribe({
      next: (data) => {
        this.clientesData = data.clientes;
      },
      error: (err) => console.error('Error fetching clientes:', err)
    });

    // Cargar equipos reestructurados
    this.http.get<EquiposData>('assets/json/equipos-data.json').subscribe({
      next: (data) => {
        this.plantas = data.plantas;
        // Por defecto, muestra los equipos de la primera planta si existe
        if (this.plantas.length > 0) {
          this.filtrarPorPlanta(this.plantas[0].nombre);
        }
      },
      error: (err) => console.error('Error fetching equipos:', err)
    });
  }

  filtrarPorPlanta(nombrePlanta: string): void {
    this.plantaSeleccionada = nombrePlanta;
    const planta = this.plantas.find(p => p.nombre === nombrePlanta);
    this.equiposOriginales = planta ? planta.equipos : [];
    this.filtrarEquipos();
  }
  

  filtrarEquipos(): void {
    this.equiposFiltrados = this.equiposOriginales.filter(equipo => {
      const coincideEstado = this.estadoSeleccionado === '' || equipo.estado === this.estadoSeleccionado;
      const coincideMantenimiento = this.estadoMantenimientoSeleccionado === '' || equipo.estado_mantenimiento === this.estadoMantenimientoSeleccionado;
      const coincideCliente = this.busquedaCliente === '' || equipo.contacto.toLowerCase().includes(this.busquedaCliente.toLowerCase());
      return coincideEstado && coincideMantenimiento && coincideCliente;
    });
  }
}

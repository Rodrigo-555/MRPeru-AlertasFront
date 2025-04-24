import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Cliente } from '../../interface/clientes.interface.';
import { ClienteService } from '../../service/Clientes/cliente.service';
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

    ClientesRegulares!: Cliente[];
    ClientesNoRegulares!: Cliente[];
    ClientesAntiguosRecientes!: Cliente[];
    ClientesAntiguos!: Cliente[];
    ClientesSinServicio!: Cliente[];
    NoEsCliente!: Cliente[];

  //clientesData!: ClienteNode[];
  plantas: Planta[] = [];
  plantasData!: PlantasData;
  equiposOriginales: Equipos[] = [];
  equiposFiltrados: Equipos[] = [];

  // Variable para el filtro de fecha (formato "YYYY-MM")
  fechaFiltro: string = '';

  // Conservamos la variable para la planta seleccionada
  plantaSeleccionada: string | null = null;



  constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private clienteService: ClienteService) {}

  ngOnInit(): void {
    this.cargarClientesRegulares();
    this.cargarClientesNoRegulares();
    this.cargarClientesAntiguosRecientes();
    this.cargarClientesAntiguos();
    this.cargarClientesSinServicio();
    this.cargarNoEsCliente();
    this.loadPlantasData();
  }

  
   /**
   * Carga el árbol de clientes desde el JSON.
   */
  private cargarClientesRegulares(): void {
    this.clienteService.getClientes("Clientes con Servicios Regulares").subscribe(
      (data: Cliente[]) => {
        this.ClientesRegulares = data; // Guardamos el resultado en la propiedad "clientes"
        this.cdr.detectChanges(); // Detectamos cambios manualmente
      },
      error => {
        console.error('Error al cargar los clientes:', error);
      }
    );
  }

  private cargarClientesNoRegulares(): void {
    this.clienteService.getClientes("Clientes con Servicios No-Regulares").subscribe(
      (data: Cliente[]) => {
        this.ClientesNoRegulares = data; // Guardamos el resultado en la propiedad "clientes"
        this.cdr.detectChanges(); // Detectamos cambios manualmente
      },
      error => {
        console.error('Error al cargar los clientes:', error);
      }
    );
  }

  private cargarClientesAntiguosRecientes(): void {
    this.clienteService.getClientes("Clientes con Servicios Antiguos-Recientes").subscribe(
      (data: Cliente[]) => {
        this.ClientesAntiguosRecientes = data; // Guardamos el resultado en la propiedad "clientes"
        this.cdr.detectChanges(); // Detectamos cambios manualmente
      },
      error => {
        console.error('Error al cargar los clientes:', error);
      }
    );
  }

  private cargarClientesAntiguos(): void {
    this.clienteService.getClientes("Clientes con Servicios Antiguos").subscribe(
      (data: Cliente[]) => {
        this.ClientesAntiguos = data; // Guardamos el resultado en la propiedad "clientes"
        this.cdr.detectChanges(); // Detectamos cambios manualmente
      },
      error => {
        console.error('Error al cargar los clientes:', error);
      }
    );
  }

  private cargarClientesSinServicio(): void {
    this.clienteService.getClientes("Clientes sin servicios").subscribe(
      (data: Cliente[]) => {
        this.ClientesSinServicio = data; // Guardamos el resultado en la propiedad "clientes"
        this.cdr.detectChanges(); // Detectamos cambios manualmente
      },
      error => {
        console.error('Error al cargar los clientes:', error);
      }
    );
  }

  private cargarNoEsCliente(): void {
    this.clienteService.getClientes("No Es Cliente").subscribe(
      (data: Cliente[]) => {
        this.NoEsCliente = data; // Guardamos el resultado en la propiedad "clientes"
        this.cdr.detectChanges(); // Detectamos cambios manualmente
      },
      error => {
        console.error('Error al cargar los clientes:', error);
      }
    );
  }

  
  //Carga los equipos y plantas, y establece por defecto la primera planta.
  
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
   */
  filtrarEquipos(): void {
    if (!this.fechaFiltro) {
      this.equiposFiltrados = [...this.equiposOriginales];
      return;
    }

    const filtro = this.fechaFiltro; // Formato "YYYY-MM"
    this.equiposFiltrados = this.equiposOriginales.filter(equipo => {
      // Extrae la parte "YYYY-MM" de la fecha (formato "YYYY-MM-DD")
      const fechaEquipoYM = equipo.fecha_notificacion.substring(0, 7);
      return fechaEquipoYM === filtro;
    });
  }



  /**
   * Funciones trackBy para optimizar los *ngFor del template.
   */
  //trackByCliente(index: number, item: ClienteNode): string {
  //  return item.nombre;
  //}

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

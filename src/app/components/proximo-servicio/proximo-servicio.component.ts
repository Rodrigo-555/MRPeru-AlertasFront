import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, QueryList, ViewChildren, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Cliente } from '../../interface/clientes.interface.';
import { ClienteService } from '../../service/Clientes/cliente.service';
import { Equipos, EquiposPorPlanta, Planta } from '../../interface/equipos.interface.ps';
import { ProximoServicioService } from '../../service/ProximoServicio/proximo-servicio.service';

@Component({
  selector: 'app-proximo-servicio',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './proximo-servicio.component.html',
  styleUrls: ['./proximo-servicio.component.scss']
})
export class ProximoServicioComponent implements OnInit {
  
  @ViewChildren('categoryDetails') categoryDetails!: QueryList<ElementRef>;
  @ViewChildren('clienteDetails') clienteDetails!: QueryList<ElementRef>;

  clienteCategories: any[] = [];

  plantas: Planta[] = [];
  EquiposPorPlanta!: EquiposPorPlanta;
  equiposOriginales: Equipos[] = [];
  equiposFiltrados: Equipos[] = [];

  // Variables para filtros
  fechaFiltro: string = '';
  busquedaTexto: string = '';
  plantaSeleccionada: string | null = null;

  // Variables para ordenamiento
  campoOrdenamiento: string = '';
  ordenAscendente: boolean = true;

  // Variables para paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 10;
columnas: any;

  constructor(
    private http: HttpClient, 
    private cdr: ChangeDetectorRef, 
    private clienteService: ClienteService,
    private proximoServicioService: ProximoServicioService
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

  private cargarEquipoProximoServicio(NombreCliente: string): void {
    console.log('Solicitando datos para:', NombreCliente);
    this.proximoServicioService.getProximoServicio(NombreCliente, '').subscribe(
      (data: Equipos[]) => {
        console.log('Datos recibidos:', data);
        this.equiposOriginales = data;
        this.equiposFiltrados = [...this.equiposOriginales];
        this.cdr.detectChanges();
      },
      (error: any) => {
        console.error('Error al cargar los equipos:', error);
      }
    );
  }

  /**
   * Filtra los equipos por la planta seleccionada y actualiza el listado.
   * @param nombrePlanta Nombre de la planta a filtrar.
   */
  filtrarPorCliente(NombreCliente: string, NombrePlanta: string): void {
    console.log('Cliente:', NombreCliente, 'Planta:', NombrePlanta);
    this.plantaSeleccionada = NombrePlanta;
  
    this.proximoServicioService.getProximoServicio(NombreCliente, NombrePlanta).subscribe(
      (data: Equipos[]) => {
        this.equiposOriginales = data;
        this.equiposFiltrados = [...this.equiposOriginales];
        this.cdr.detectChanges();
        setTimeout(() => {
          const tableElement = document.querySelector('.table-container');
          if (tableElement) {
            tableElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      },
      error => {
        console.error('Error al cargar los equipos de la planta:', error);
        this.equiposOriginales = [];
        this.equiposFiltrados = [];
        this.cdr.detectChanges();
      }
    );
  }

  /**
   * Filtra los equipos según el año y mes seleccionado y el texto de búsqueda.
   */
  filtrarEquipos(): void {
    let equiposFiltrados = [...this.equiposOriginales];
    
    // Filtro por fecha
    if (this.fechaFiltro) {
      equiposFiltrados = equiposFiltrados.filter(equipo => {
        const fechaEquipoYM = equipo.fechaProximoServicio 
          ? equipo.fechaProximoServicio.substring(0, 7) 
          : '';
        return fechaEquipoYM === this.fechaFiltro;
      });
    }
  
    // Filtro por texto de búsqueda
    if (this.busquedaTexto) {
      const termino = this.busquedaTexto.toLowerCase();
      equiposFiltrados = equiposFiltrados.filter(equipo => 
        equipo.referencia.toLowerCase().includes(termino) ||
        equipo.cliente.toLowerCase().includes(termino) ||
        equipo.serie.toLowerCase().includes(termino)
      );
    }
  
    console.log('Equipos filtrados:', equiposFiltrados); // Verifica los datos filtrados
    this.equiposFiltrados = equiposFiltrados;
  }

  /**
   * Ordena los equipos filtrados por el campo especificado.
   * @param campo Campo para ordenar los equipos.
   */
  ordenarPor(campo: string): void {
    if (this.campoOrdenamiento === campo) {
      this.ordenAscendente = !this.ordenAscendente;
    } else {
      this.campoOrdenamiento = campo;
      this.ordenAscendente = true;
    }
    
    this.equiposFiltrados.sort((a: any, b: any) => {
      let valorA = a[campo];
      let valorB = b[campo];
      
      // Manejar fechas
      if (campo === 'fecha_notificacion') {
        if (!valorA) return this.ordenAscendente ? 1 : -1;
        if (!valorB) return this.ordenAscendente ? -1 : 1;
        valorA = new Date(valorA).getTime();
        valorB = new Date(valorB).getTime();
      }
      
      // Comparación estándar para strings y números
      if (valorA < valorB) return this.ordenAscendente ? -1 : 1;
      if (valorA > valorB) return this.ordenAscendente ? 1 : -1;
      return 0;
    });
    
    this.paginaActual = 1; // Regresar a la primera página después de ordenar
  }

  // Obtener ícono de ordenamiento
  getSortIcon(campo: string): string {
    if (this.campoOrdenamiento !== campo) return 'fas fa-sort';
    return this.ordenAscendente ? 'fas fa-sort-up' : 'fas fa-sort-down';
  }

  // Verificar si una fecha está próxima (dentro de 30 días)
  esFechaProxima(fecha: string | null | undefined): boolean {
    if (!fecha) return false;
    
    const fechaNotificacion = new Date(fecha);
    const hoy = new Date();
    const diferenciaDias = Math.floor((fechaNotificacion.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    
    return diferenciaDias >= 0 && diferenciaDias <= 30;
  }

  // Obtener etiqueta de estado
  getEstadoLabel(estado: string): string {
    switch (estado) {
      case 'A': return '🟢';
      case 'C': return 'Por Cotizar';
      case 'I': return '🔴';
      case 'R': return 'En Reparación';
      case 'X': return 'Malogrado';
      default: return estado;
    }
  }
  
  // Obtener clase CSS para badge de estado
  getBadgeClass(estado: string): string {
    switch (estado) {
      case 'A': return 'estado-Activo';
      case 'C': return 'estado-Por Cotizar';
      case 'I': return 'estado-Inactivo';
      case 'R': return 'estado-En Reparación';
      case 'X': return 'estado-Malogrado';
      default: return '';
    }
  }
  
  // Obtener etiqueta de estado de mantenimiento
  getMantenimientoLabel(estadoMantenimiento: string): string {
    switch (estadoMantenimiento) {
      case 'A': return '⚠️';
      case 'E': return '(Por Configurar)';
      case 'I': return 'Equipo Inactivo o de Baja';
      case 'V': return '🟢';
      case 'N': return '(Sin Reportes de Servicio)';
      case 'R': return '🔴';
      default: return estadoMantenimiento;
    }
  }
  
  // Obtener clase CSS para badge de mantenimiento
  getMantenimientoBadgeClass(estadoMantenimiento: string): string {
    switch (estadoMantenimiento) {
      case 'A': return 'mantenimiento-Requiere Servicio';
      case 'E': return 'mantenimiento-(Por Configurar)';
      case 'I': return 'mantenimiento-Equipo Inactivo o de Baja';
      case 'N': return 'mantenimiento-(Sin Reportes de Servicio)';
      case 'R': return 'mantenimiento-Sin servicio mas de un Año';
      case 'V': return 'mantenimiento-Aun no Requiere Servicio';
      default: return '';
    }
  }

  // Funciones para expandir/colapsar el árbol de clientes
  expandirTodo(): void {
    setTimeout(() => {
      this.categoryDetails.forEach(item => {
        (item.nativeElement as HTMLDetailsElement).open = true;
      });
      this.clienteDetails.forEach(item => {
        (item.nativeElement as HTMLDetailsElement).open = true;
      });
    });
  }

  colapsarTodo(): void {
    setTimeout(() => {
      this.clienteDetails.forEach(item => {
        (item.nativeElement as HTMLDetailsElement).open = false;
      });
      this.categoryDetails.forEach(item => {
        (item.nativeElement as HTMLDetailsElement).open = false;
      });
    });
  }

  // Paginación
  get totalPaginas(): number {
    return Math.ceil(this.equiposFiltrados.length / this.itemsPorPagina);
  }
  
  cambiarPagina(pagina: number): void {
    this.paginaActual = pagina;
  }
  
  getPaginas(): number[] {
    const paginas: number[] = [];
    const totalPaginas = this.totalPaginas;
    let inicio: number;
    let fin: number;
    
    if (totalPaginas <= 5) {
      inicio = 1;
      fin = totalPaginas;
    } else {
      if (this.paginaActual <= 3) {
        inicio = 1;
        fin = 5;
      } else if (this.paginaActual >= totalPaginas - 2) {
        inicio = totalPaginas - 4;
        fin = totalPaginas;
      } else {
        inicio = this.paginaActual - 2;
        fin = this.paginaActual + 2;
      }
    }
    
    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    
    return paginas;
  }
  
  seleccionarPlanta(nombrePlanta: string): void {
    this.plantaSeleccionada = nombrePlanta;
    this.cargarEquipoProximoServicio(nombrePlanta);
    
    // Opcional: hacer scroll hasta la tabla cuando se selecciona una planta
    setTimeout(() => {
      const tableElement = document.querySelector('.table-container');
      if (tableElement) {
        tableElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  // TrackBy functions para optimizar rendering
  trackBySubcliente(index: number, item: any): string {
    return item.nombre;
  }

  trackByPlanta(index: number, item: any): string {
    return item.nombre;
  }

  trackByEquipo(index: number, item: Equipos): string {
    return item.referencia; // Asegúrate de que `referencia` sea única
  }

   trackByCliente(index: number, item: Cliente): string {
      return item.nombre;
    }
}
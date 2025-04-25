import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, QueryList, ViewChildren, ElementRef } from '@angular/core';
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

  @ViewChildren('categoryDetails') categoryDetails!: QueryList<ElementRef>;
  @ViewChildren('clienteDetails') clienteDetails!: QueryList<ElementRef>;


  clienteCategories: any[] = [];
  equiposOriginales: Equipos[] = [];
  equiposFiltrados: Equipos[] = [];

  // Variables para filtros
  estadoSeleccionado: string = '';
  estadoMantenimientoSeleccionado: string = '';
  busquedaContacto: string = '';
  plantaSeleccionada: string | null = null;

  campoOrdenamiento: string = '';
  ordenAscendente: boolean = true;

  paginaActual: number = 1;
  itemsPorPagina: number = 10;

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

  get totalPaginas(): number {
    return Math.ceil(this.equiposFiltrados.length / this.itemsPorPagina);
  }

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

  
  
  // Función para colapsar todos los nodos
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
      if (campo === 'fechaProximoServicio') {
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

  esFechaProxima(fecha: Date | string | null | undefined): boolean {
    if (!fecha) return false;
    
    let fechaServicio: Date;
    if (typeof fecha === 'string') {
      fechaServicio = new Date(fecha);
    } else if (fecha instanceof Date) {
      fechaServicio = fecha;
    } else {
      return false;
    }
    
    const hoy = new Date();
    const diferenciaDias = Math.floor((fechaServicio.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    
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
  
  // Paginación
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
    
    // Opcional: hacer scroll hasta la tabla cuando se selecciona una planta
    setTimeout(() => {
      const tableElement = document.querySelector('.table-container');
      if (tableElement) {
        tableElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  filtrarEquipos(): void {
    this.equiposFiltrados = this.equiposOriginales.filter(equipo => {
      const coincideEstado = !this.estadoSeleccionado || equipo.estado === this.estadoSeleccionado;
      const coincideMantenimiento = !this.estadoMantenimientoSeleccionado || equipo.estadoMantenimiento === this.estadoMantenimientoSeleccionado;
      const coincideContacto = !this.busquedaContacto || 
                              equipo.contacto.toLowerCase().includes(this.busquedaContacto.toLowerCase()) ||
                              (equipo.email && equipo.email.toLowerCase().includes(this.busquedaContacto.toLowerCase()));
      
      return coincideEstado && coincideMantenimiento && coincideContacto;
    });
    
    // Si hay un campo de ordenamiento activo, mantener el orden
    if (this.campoOrdenamiento) {
      this.ordenarPor(this.campoOrdenamiento);
    }
    
    this.paginaActual = 1; // Regresar a la primera página después de filtrar
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

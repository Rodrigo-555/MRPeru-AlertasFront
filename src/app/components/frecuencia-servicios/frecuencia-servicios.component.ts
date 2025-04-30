import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, QueryList, ViewChildren, ElementRef, Renderer2 } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Equipos, Planta } from '../../interface/equipos.interface.fs';
import { ClienteService } from '../../service/Clientes/cliente.service';
import { FrecuenciaServicioService } from '../../service/FrecuenciaServicio/frecuencia-servicio.service';
import { Cliente } from '../../interface/clientes.interface.';
import { EquiposServiceService } from '../../service/Equipos/equipos-service.service';

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
  EquiposPlantas: string[] = [];
  clientesCategoriesOriginal: any[] = []; // Guardar copia original de los clientes
  equiposOriginales: Equipos[] = [];
  equiposFiltrados: Equipos[] = [];

  // Variables para filtros
  estadoSeleccionado: string = '';
  estadoMantenimientoSeleccionado: string = '';
  busquedaContacto: string = '';
  busquedaClientes: string = '';
  plantaSeleccionada: string | null = null;

  campoOrdenamiento: string = '';
  ordenAscendente: boolean = true;

  paginaActual: number = 1;
  itemsPorPagina: number = 10;

  clienteSeleccionado: string | null = null;
  localSeleccionado: string | null = null;

  constructor(
    private http: HttpClient, 
    private cdr: ChangeDetectorRef, 
    private clienteService: ClienteService, 
    private frecuenciaServicioService: FrecuenciaServicioService,
    private renderer: Renderer2,
    private equipoService: EquiposServiceService,
  ) {}

  ngOnInit() {
    this.loadClientes();
  }

  // Método modificado para cargar los equipos de una planta específica
  mostrarEquiposPlanta(event: Event, razon: string, nombreLocal: string): void {
    // Es importante detener la propagación primero para evitar problemas con el details
    event.preventDefault();
    event.stopPropagation();
    
    // Encuentra el elemento details
    const detailsElement = (event.target as HTMLElement).closest('details');
    
    // Nueva lógica de toggle: comprobamos si estamos en la misma planta y cliente
    if (this.clienteSeleccionado === razon && this.localSeleccionado === nombreLocal) {
      console.log('Mismo cliente y local, haciendo toggle');
      
      // Invertimos el estado del details manualmente
      if (detailsElement) {
        detailsElement.open = !detailsElement.open;
        
        // Si lo estamos cerrando, limpiamos selección
        if (!detailsElement.open) {
          this.clienteSeleccionado = null;
          this.localSeleccionado = null;
          this.EquiposPlantas = [];
          console.log('Details cerrado, limpiando selección');
        } else {
          // Si lo estamos abriendo, nos aseguramos de cargar los equipos
          this.cargarEquiposPlantas(razon, nombreLocal);
          console.log('Details abierto, recargando equipos');
        }
      }
    } else {
      // Es una planta o cliente diferente
      console.log('Diferente cliente o local, cargando nuevos equipos');
      
      // Limpiamos los equipos actuales
      this.EquiposPlantas = [];
      
      // Establecemos el nuevo cliente y local
      this.clienteSeleccionado = razon;
      this.localSeleccionado = nombreLocal;
      
      // Aseguramos que el details esté abierto
      if (detailsElement) {
        detailsElement.open = true;
      }
      
      // Cargamos los nuevos equipos
      this.cargarEquiposPlantas(razon, nombreLocal);
    }
    
    // Agregamos logs después de establecer las variables
    console.log('Estado final - Cliente:', this.clienteSeleccionado);
    console.log('Estado final - Local:', this.localSeleccionado);
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

    let categoriesLoaded = 0;
    
    categories.forEach(category => {
      this.clienteService.getClientes(category.name).subscribe(
        (data: Cliente[]) => {
          const categoryData = { title: category.title, clientes: data };
          this.clienteCategories.push(categoryData);
          
          categoriesLoaded++;
          if (categoriesLoaded === categories.length) {
            // Crear copia de seguridad cuando todos estén cargados
            this.clientesCategoriesOriginal = JSON.parse(JSON.stringify(this.clienteCategories));
          }
          
          this.cdr.detectChanges();
        },
        error => {
          console.error(`Error al cargar los clientes de ${category.name}:`, error);
          
          categoriesLoaded++;
          if (categoriesLoaded === categories.length) {
            this.clientesCategoriesOriginal = JSON.parse(JSON.stringify(this.clienteCategories));
          }
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
      case 'A': return 'estado-🟢';
      case 'C': return 'estado-Por Cotizar';
      case 'I': return 'estado-🔴';
      case 'R': return 'estado-En Reparación';
      case 'X': return 'estado-Malogrado';
      default: return '';
    }
  }
  
  // Obtener etiqueta de estado de mantenimiento
  getMantenimientoLabel(estadoMantenimiento: string): string {
    switch (estadoMantenimiento) {
      case 'A': return 'Requiere Servicio';
      case 'E': return '(Por Configurar)';
      case 'I': return 'Equipo Inactivo o de Baja';
      case 'V': return 'Aun No Requiere Servicio';
      case 'N': return '(Sin Reportes de Servicio)';
      case 'R': return 'Sin servicio más de 1 año';
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

  private cargarEquiposPlantas(Razon: string, NombreLocal: string): void {
  console.log(`Cargando equipos para Razon: ${Razon}, Local: ${NombreLocal}`);
  this.EquiposPlantas = [];
  
  this.equipoService.getEquipos(Razon, NombreLocal).subscribe({
    next: (data: string[]) => {
      console.log(`Recibidos ${data.length} equipos para ${Razon}, ${NombreLocal}`);
      this.EquiposPlantas = data;
      this.cdr.detectChanges();
    },
    error: (error) => {
      console.error(`Error al cargar equipos para ${Razon}, ${NombreLocal}:`, error);
      this.EquiposPlantas = []; 
    }
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

  // Función de filtrado de clientes mejorada
  filtrarClientes(): void {
    // Remover resaltados anteriores si existen
    this.limpiarResaltados();
    
    // Si la búsqueda está vacía, restaurar la estructura original
    if (!this.busquedaClientes || this.busquedaClientes.trim() === '') {
      this.clienteCategories = JSON.parse(JSON.stringify(this.clientesCategoriesOriginal));
      this.colapsarTodo();
      this.cdr.detectChanges();
      return;
    }
    
    const terminoBusqueda = this.busquedaClientes.toLowerCase().trim();
    let categoriesWithMatches: any[] = [];
    let firstMatch: { category: any, cliente: Cliente, index: number } | null = null;
    
    // Filtrar y encontrar coincidencias
    this.clientesCategoriesOriginal.forEach(category => {
      const clientesCoincidentes = category.clientes.filter((cliente: Cliente) => 
        cliente.nombre.toLowerCase().includes(terminoBusqueda)
      );
      
      if (clientesCoincidentes.length > 0) {
        // Guardar la primera coincidencia para navegación automática
        if (!firstMatch) {
          firstMatch = {
            category: category,
            cliente: clientesCoincidentes[0],
            index: category.clientes.findIndex((c: Cliente) => c === clientesCoincidentes[0])
          };
        }
        
        // Crear copia de la categoría solo con clientes coincidentes
        const categoryWithMatches = {
          ...category,
          clientes: clientesCoincidentes
        };
        
        categoriesWithMatches.push(categoryWithMatches);
      }
    });
    
    // Actualizar el árbol con los resultados filtrados
    if (categoriesWithMatches.length > 0) {
      this.clienteCategories = categoriesWithMatches;
      this.cdr.detectChanges();
      
      // Expandir categorías con coincidencias
      setTimeout(() => {
        this.expandirCategorias();
        
        // Resaltar los clientes coincidentes
        this.resaltarCoincidencias(terminoBusqueda);
        
        // Navegar a la primera coincidencia si existe
        if (firstMatch) {
          this.navegarACliente(firstMatch);
        }
      }, 100);
    } else {
      // No hay coincidencias, mostrar mensaje (opcional)
      this.clienteCategories = [{
        title: "Sin coincidencias",
        clientes: []
      }];
      this.cdr.detectChanges();
    }
  }
  
  // Método para expandir todas las categorías que contienen coincidencias
  private expandirCategorias(): void {
    this.categoryDetails.forEach(item => {
      (item.nativeElement as HTMLDetailsElement).open = true;
    });
    
    this.clienteDetails.forEach(item => {
      (item.nativeElement as HTMLDetailsElement).open = true;
    });
  }
  
  // Método para resaltar las coincidencias en el árbol
  private resaltarCoincidencias(terminoBusqueda: string): void {
    const elementos = document.querySelectorAll('.tree summary');
    
    elementos.forEach(el => {
      const textoOriginal = el.textContent || '';
      
      if (textoOriginal.toLowerCase().includes(terminoBusqueda)) {
        // Solo modificamos el texto del nodo, no los hijos (iconos, etc.)
        el.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            const texto = node.textContent || '';
            const indice = texto.toLowerCase().indexOf(terminoBusqueda);
            
            if (indice >= 0) {
              const span = document.createElement('span');
              span.innerHTML = texto.substring(0, indice) +
                               '<span class="cliente-highlight">' + 
                               texto.substring(indice, indice + terminoBusqueda.length) + 
                               '</span>' + 
                               texto.substring(indice + terminoBusqueda.length);
              
              // Reemplazamos el nodo de texto con nuestro span
              if (node.parentNode) {
                node.parentNode.replaceChild(span, node);
              }
            }
          }
        });
      }
    });
  }
  
  // Método para limpiar resaltados previos
  private limpiarResaltados(): void {
    const resaltados = document.querySelectorAll('.cliente-highlight');
    resaltados.forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        const texto = parent.textContent || '';
        const nuevoNodo = document.createTextNode(texto);
        if (parent.parentNode) {
          parent.parentNode.replaceChild(nuevoNodo, parent);
        }
      }
    });
  }
  
  // Método para navegar al primer cliente encontrado
  private navegarACliente(match: { category: any, cliente: Cliente, index: number }): void {
    setTimeout(() => {
      // Buscar el elemento del cliente en el DOM
      const clienteElements = document.querySelectorAll('.tree summary');
      let elementoEncontrado: HTMLElement | null = null;
      
      clienteElements.forEach(el => {
        if (el.textContent?.includes(match.cliente.nombre)) {
          elementoEncontrado = el as HTMLElement;
        }
      });
      
      // Hacer scroll al elemento
      if (elementoEncontrado) {
        const el = elementoEncontrado as HTMLElement;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('cliente-encontrado');
        setTimeout(() => {
          el.classList.remove('cliente-encontrado');
        }, 2000);
      }
    }, 300);
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
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, QueryList, ViewChildren, ElementRef, Renderer2 } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Equipos, Planta } from '../../interface/equipos.interface.fs';
import { ClienteService } from '../../service/Clientes/cliente.service';
import { FrecuenciaServicioService } from '../../service/FrecuenciaServicio/frecuencia-servicio.service';
import { Cliente } from '../../interface/clientes.interface.';
import { EquiposServiceService } from '../../service/Equipos/equipos-service.service';
import { Detalles } from '../../interface/detalles.interface';

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

  // Añadir estas propiedades a la clase
  private paginasCache: number[] | null = null;
  private paginasCacheKey: string = '';
  private clientesRUCCache: Record<string, string> = {};

  campoOrdenamiento: string = '';
  ordenAscendente: boolean = true;

  paginaActual: number = 1;
  itemsPorPagina: number = 10;

  clienteSeleccionado: string | null = null;
  clienteRucSeleccionado: string | null = null;
  localSeleccionado: string | null = null;
  totalEquiposCliente: number = 0;
  todosEquiposCliente: Equipos[] = [];
  mostrandoTodosEquipos: boolean = false;

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
        
        // Si lo estamos cerrando, volvemos a mostrar todos los equipos del cliente
        if (!detailsElement.open) {
          this.localSeleccionado = null;
          this.EquiposPlantas = [];
          this.mostrandoTodosEquipos = true;
          
          // Volver a mostrar todos los equipos del cliente
          this.equiposOriginales = [...this.todosEquiposCliente];
          this.equiposFiltrados = [...this.equiposOriginales];
          this.filtrarEquipos();
          
          console.log('Details cerrado, mostrando todos los equipos del cliente');
        } else {
          // Si lo estamos abriendo, nos aseguramos de cargar los equipos de esta planta
          this.cargarEquiposPlantas(razon, nombreLocal);
          this.cargarEquiposFrecuenciaServicio(nombreLocal);
          this.localSeleccionado = nombreLocal;
          this.mostrandoTodosEquipos = false;
          console.log('Details abierto, mostrando solo equipos de esta planta');
        }
      }
    } else {
      // Es una planta o cliente diferente
      console.log('Diferente cliente o local, cargando nuevos equipos');
      
      // Si es un cliente diferente, necesitamos actualizar todo
      if (this.clienteSeleccionado !== razon) {
        this.clienteSeleccionado = razon;
        this.obtenerDetallesCliente(razon);
        this.cargarTodosEquiposCliente(razon);
      }
      
      // Establecemos el nuevo local y filtramos los equipos para mostrar solo los de esta planta
      this.localSeleccionado = nombreLocal;
      this.mostrandoTodosEquipos = false;
      
      // Aseguramos que el details esté abierto
      if (detailsElement) {
        detailsElement.open = true;
      }
      
      // Cargamos los equipos de esta planta
      this.cargarEquiposPlantas(razon, nombreLocal);
      this.cargarEquiposFrecuenciaServicio(nombreLocal);
    }
    
    // Agregamos logs después de establecer las variables
    console.log('Estado final - Cliente:', this.clienteSeleccionado);
    console.log('Estado final - Local:', this.localSeleccionado);
    console.log('Mostrando todos los equipos:', this.mostrandoTodosEquipos);
  }

  private loadClientes(): void {
    // Cargar solo las categorías inicialmente, sin expandir
    const categories = [
      { name: "Clientes con Servicios Regulares", title: "Clientes con Servicios Regulares" },
      { name: "Clientes con Servicios No-Regulares", title: "Clientes con Servicios No-Regulares" },
      { name: "Clientes con Servicios Antiguos-Recientes", title: "Clientes con Servicios Antiguos-Recientes" },
      { name: "Clientes con Servicios Antiguos", title: "Clientes con Servicios Antiguos" },
      { name: "Clientes sin servicios", title: "Clientes sin servicios" },
      { name: "No Es Cliente", title: "No Es Cliente" },
    ];
  
    // Cargar primero las dos categorías más importantes
    this.loadCategoryData(categories[0]);
    this.loadCategoryData(categories[1]);
    
    // Cargar el resto de categorías después con retraso
    setTimeout(() => {
      for (let i = 2; i < categories.length; i++) {
        // Añadir retraso escalonado para no saturar el servidor
        setTimeout(() => this.loadCategoryData(categories[i]), (i-2) * 300);
      }
    }, 1000);
  }

  private loadCategoryData(category: {name: string, title: string}): void {
    this.clienteService.getClientes(category.name).subscribe({
      next: (data: Cliente[]) => {
        const categoryData = { title: category.title, clientes: data };
        this.clienteCategories.push(categoryData);
        
        // Guardar copia solo cuando se completa la carga
        if (!this.clientesCategoriesOriginal.find(cat => cat.title === category.title)) {
          const copiaSeguridad = JSON.parse(JSON.stringify(categoryData));
          this.clientesCategoriesOriginal.push(copiaSeguridad);
        }
        
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error(`Error al cargar los clientes de ${category.name}:`, error);
        const categoryData = { title: category.title, clientes: [] };
        this.clienteCategories.push(categoryData);
        this.clientesCategoriesOriginal.push(JSON.parse(JSON.stringify(categoryData)));
      }
    });
  }

  get totalPaginas(): number {
    return Math.ceil(this.equiposFiltrados.length / this.itemsPorPagina);
  }

  expandirTodo(): void {
    // Implementar con limitador para evitar operaciones DOM masivas
    const maxNodes = 50;
    let processedNodes = 0;
    
    // Expandir categorías primero
    this.categoryDetails.forEach(item => {
      if (processedNodes < maxNodes) {
        (item.nativeElement as HTMLDetailsElement).open = true;
        processedNodes++;
      }
    });
    
    // Si hay espacio, expandir clientes
    setTimeout(() => {
      processedNodes = 0;
      this.clienteDetails.forEach(item => {
        if (processedNodes < maxNodes) {
          (item.nativeElement as HTMLDetailsElement).open = true;
          processedNodes++;
        }
      });
    }, 100);
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
  
  get equiposPaginados(): Equipos[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    return this.equiposFiltrados.slice(inicio, fin);
  }
  
  getPaginas(): number[] {
    if (!this.paginasCache || this.paginasCacheKey !== `${this.paginaActual},${this.totalPaginas}`) {
      const paginas: number[] = [];
      const totalPaginas = this.totalPaginas;
      
      if (totalPaginas <= 5) {
        for (let i = 1; i <= totalPaginas; i++) paginas.push(i);
      } else {
        if (this.paginaActual <= 3) {
          for (let i = 1; i <= 5; i++) paginas.push(i);
        } else if (this.paginaActual >= totalPaginas - 2) {
          for (let i = totalPaginas - 4; i <= totalPaginas; i++) paginas.push(i);
        } else {
          for (let i = this.paginaActual - 2; i <= this.paginaActual + 2; i++) paginas.push(i);
        }
      }
      
      this.paginasCache = paginas;
      this.paginasCacheKey = `${this.paginaActual},${this.totalPaginas}`;
    }
    
    return this.paginasCache;
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
  this.frecuenciaServicioService.getFrecuenciaServicio(nombrePlanta).subscribe({
    next: (data: Equipos[]) => {
      // Si tenemos todos los equipos del cliente cargados y estamos filtrando por planta
      if (this.mostrandoTodosEquipos && this.todosEquiposCliente.length > 0) {
        // Filtramos los equipos ya cargados para mostrar solo los de esta planta
        this.equiposOriginales = this.todosEquiposCliente.filter(equipo => equipo.local === nombrePlanta);
      } else {
        // Asegurarnos de que todos los equipos tengan el nombre del local
        this.equiposOriginales = data.map(equipo => ({ ...equipo, local: nombrePlanta }));
      }
      
      this.equiposFiltrados = [...this.equiposOriginales];
      this.mostrandoTodosEquipos = false;
      this.filtrarEquipos();
      this.cdr.detectChanges();
    },
    error: (error) => {
      console.error('Error al cargar los equipos:', error);
      this.equiposOriginales = [];
      this.equiposFiltrados = [];
      this.cdr.detectChanges();
    }
  });
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

  seleccionarCliente(event: Event, clienteNombre: string): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (this.clienteSeleccionado === clienteNombre) {
      // Si es el mismo cliente, hacemos un toggle
      const detailsElement = (event.target as HTMLElement).closest('details');
      if (detailsElement) {
        detailsElement.open = !detailsElement.open;
        
        if (!detailsElement.open) {
          // Si cerramos el detalle, limpiamos todo
          this.clienteSeleccionado = null;
          this.clienteRucSeleccionado = null;
          this.localSeleccionado = null;
          this.equiposOriginales = [];
          this.equiposFiltrados = [];
          this.todosEquiposCliente = [];
          this.EquiposPlantas = [];
          this.mostrandoTodosEquipos = false;
        } else {
          // Si abrimos el detalle, mostramos todos los equipos
          this.cargarTodosEquiposCliente(clienteNombre);
        }
      }
    } else {
      // Es un nuevo cliente
      // Actualizar la selección de cliente
      this.clienteSeleccionado = clienteNombre;
      
      // Limpiar la selección de local
      this.localSeleccionado = null;
      this.EquiposPlantas = [];
      
      // Usar la API para obtener el RUC del cliente
      this.obtenerDetallesCliente(clienteNombre);
      
      // Cargar todos los equipos del cliente
      this.cargarTodosEquiposCliente(clienteNombre);
      
      // Opcional: abrir el details del cliente
      const detailsElement = (event.target as HTMLElement).closest('details');
      if (detailsElement) {
        detailsElement.open = true;
      }
    }
    
    console.log(`Cliente seleccionado: ${clienteNombre}, Mostrando todos equipos: ${this.mostrandoTodosEquipos}`);
  }

// Nuevo método para obtener detalles del cliente desde la API
private obtenerDetallesCliente(nombreCliente: string): void {
  console.log(`Obteniendo detalles para cliente: ${nombreCliente}`);
  
  this.clienteService.getDetallesClientes(nombreCliente).subscribe({
    next: (data: Detalles[]) => {
      console.log('Datos recibidos del API de detalles:', data);
      if (data && data.length > 0) {
        const detallesCliente = data[0];
        console.log('Objeto de detalles completo:', detallesCliente);
        this.clienteRucSeleccionado = detallesCliente.ruc || 'RUC no disponible';
        this.totalEquiposCliente = detallesCliente.nro_equipos;
        console.log(`RUC obtenido de API para ${nombreCliente}: ${this.clienteRucSeleccionado}, Total equipos: ${this.totalEquiposCliente}`);
      } else {
        this.clienteRucSeleccionado = 'RUC no disponible';
        this.totalEquiposCliente = 0;
        console.log(`No se encontraron detalles en la API para ${nombreCliente}`);
      }
      this.cdr.detectChanges();
    },
    error: (error) => {
      console.error(`Error al obtener detalles del cliente ${nombreCliente}:`, error);
      this.clienteRucSeleccionado = 'Error al obtener RUC';
      this.totalEquiposCliente = 0;
      this.cdr.detectChanges();
    }
  });
}

private cargarTodosEquiposCliente(Razon: string): void {
  console.log(`Cargando todos los equipos para el cliente: ${Razon}`);
  
  // Primero, buscar todas las plantas del cliente
  let locales: any[] = [];
  
  // Buscar el cliente en todas las categorías más eficientemente
  for (const category of this.clienteCategories) {
    if (!category.clientes) continue;
    
    const cliente = category.clientes.find((c: Cliente) => c.nombre === Razon);
    if (cliente) {
      locales = cliente.locales || [];
      break;
    }
  }
  
  if (locales.length === 0) {
    console.log(`El cliente ${Razon} no tiene locales definidos.`);
    this.todosEquiposCliente = [];
    this.equiposOriginales = [];
    this.equiposFiltrados = [];
    this.mostrandoTodosEquipos = true;
    this.cdr.detectChanges();
    return;
  }
  
  // Mostrar indicador de carga
  this.todosEquiposCliente = [];
  this.mostrandoTodosEquipos = true;
  
  // Cargar solo los primeros 5 locales inicialmente
  const maxInitialLocals = Math.min(5, locales.length);
  let processedLocals = 0;
  this.todosEquiposCliente = [];
  
  // Para cada local, cargar sus equipos
  for (let i = 0; i < maxInitialLocals; i++) {
    this.cargarEquiposLocal(Razon, locales[i].local, (equipos) => {
      processedLocals++;
      
      // Actualizar UI cuando se carguen los primeros locales
      if (processedLocals === maxInitialLocals) {
        this.equiposOriginales = [...this.todosEquiposCliente];
        this.equiposFiltrados = [...this.equiposOriginales];
        this.filtrarEquipos();
        this.cdr.detectChanges();
        
        // Cargar el resto de locales en segundo plano
        if (locales.length > maxInitialLocals) {
          setTimeout(() => {
            for (let j = maxInitialLocals; j < locales.length; j++) {
              this.cargarEquiposLocal(Razon, locales[j].local, (nuevosEquipos) => {
                // Cada vez que se cargan más equipos, actualizar la UI
                this.equiposOriginales = [...this.todosEquiposCliente];
                this.equiposFiltrados = [...this.equiposOriginales];
                this.filtrarEquipos();
                this.cdr.detectChanges();
              });
            }
          }, 500);
        }
      }
    });
  }
}

private cargarEquiposLocal(razon: string, local: string, callback: (equipos: Equipos[]) => void): void {
  this.frecuenciaServicioService.getFrecuenciaServicio(local).subscribe({
    next: (equipos: Equipos[]) => {
      const equiposConLocal = equipos.map(equipo => ({ ...equipo, local }));
      this.todosEquiposCliente = [...this.todosEquiposCliente, ...equiposConLocal];
      callback(equiposConLocal);
    },
    error: (error) => {
      console.error(`Error al cargar equipos para el local ${local}:`, error);
      callback([]);
    }
  });
}

filtrarEquipos(): void {
  // Determinar la fuente de datos para filtrar
  const source = this.mostrandoTodosEquipos ? this.todosEquiposCliente : this.equiposOriginales;
  
  this.equiposFiltrados = source.filter(equipo => {
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
    
    // Precargar RUCs para todos los clientes si no están ya cargados
    this.precargarRUCs().then(() => {
      // Filtrar y encontrar coincidencias
      this.clientesCategoriesOriginal.forEach(category => {
        let clientesCoincidentes = category.clientes.filter((cliente: Cliente) => {
          // Buscar por nombre
          const coincideNombre = cliente.nombre.toLowerCase().includes(terminoBusqueda);
          
          // Buscar por RUC si está disponible
          const coincideRUC = cliente.ruc && cliente.ruc.toLowerCase().includes(terminoBusqueda);
          
          return coincideNombre || coincideRUC;
        });
        
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
        // No hay coincidencias, mostrar mensaje
        this.clienteCategories = [{
          title: "Sin coincidencias",
          clientes: []
        }];
        this.cdr.detectChanges();
      }
    });
  }

  private async precargarRUCs(): Promise<void> {
    // Crear un arreglo para almacenar las promesas
    const promesas: Promise<void>[] = [];
    
    // Para cada categoría y cada cliente que no tenga RUC, cargar el RUC
    for (const category of this.clientesCategoriesOriginal) {
      for (const cliente of category.clientes) {
        // Solo precargar si no tiene RUC ya asignado
        if (!cliente.ruc) {
          const promesa = new Promise<void>((resolve) => {
            this.clienteService.getDetallesClientes(cliente.nombre).subscribe({
              next: (data: Detalles[]) => {
                if (data && data.length > 0) {
                  // Asignar el RUC al cliente
                  cliente.ruc = data[0].ruc || '';
                }
                resolve();
              },
              error: () => {
                resolve(); // Resolvemos la promesa incluso si hay error
              }
            });
          });
          
          promesas.push(promesa);
        }
      }
    }
    
    // Esperar a que todas las promesas se resuelvan (con un límite de tiempo para evitar esperas muy largas)
    try {
      // Establecer un timeout de 3 segundos para evitar bloquear la UI
      const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 3000));
      await Promise.race([Promise.all(promesas), timeoutPromise]);
    } catch (err) {
      console.error('Error al precargar RUCs:', err);
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
      const cliente = this.encontrarClientePorNombre(textoOriginal.trim());
      
      // Si tenemos el cliente y coincide por nombre o RUC
      if (cliente) {
        const coincidePorNombre = cliente.nombre.toLowerCase().includes(terminoBusqueda);
        const coincidePorRUC = cliente.ruc && cliente.ruc.toLowerCase().includes(terminoBusqueda);
        
        if (coincidePorNombre || coincidePorRUC) {
          // Si coincide por nombre, resaltamos en el nombre
          if (coincidePorNombre) {
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
          
          // Si coincide por RUC pero no por nombre, añadimos un badge con el RUC
          if (coincidePorRUC && !coincidePorNombre && cliente.ruc) {
            // Añadir el RUC como badge cerca del nombre del cliente
            const rucBadge = document.createElement('span');
            rucBadge.className = 'ruc-badge cliente-highlight';
            rucBadge.textContent = `RUC: ${cliente.ruc}`;
            el.appendChild(rucBadge);
          }
        }
      }
    });
  }

  private encontrarClientePorNombre(nombreCompleto: string): Cliente | null {
    // Eliminar posibles contadores o texto adicional
    const nombreLimpio = nombreCompleto.replace(/\(\d+\)$/, '').trim();
    
    for (const category of this.clientesCategoriesOriginal) {
      for (const cliente of category.clientes) {
        if (cliente.nombre === nombreLimpio || nombreCompleto.includes(cliente.nombre)) {
          return cliente;
        }
      }
    }
    
    return null;
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
    return item.nombre || index.toString();
  }
  
  trackByPlanta(index: number, item: Planta): string {
    return item.nombre || index.toString();
  }
  
  trackByEquipo(index: number, item: Equipos): string {
    return item.referencia || item.modelo || index.toString();
  }
  
  trackByCategoryFn(index: number, item: any): string {
    return item.title || index.toString();
  }
  
}
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
import { catchError, forkJoin, map, of, Subscription } from 'rxjs';

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

  private subscriptions: Subscription[] = [];

  private isBuscando = false;

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

  equipoSeleccionado: string | null = null;
  mostrandoDetalleEquipo: boolean = false;

  private timeoutId: any = null;

  // Añadir estas propiedades a la clase
  private paginasCache: number[] | null = null;
  private paginasCacheKey: string = '';

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
    
    // Reset equipment selection when changing plants
    this.equipoSeleccionado = null;
    this.mostrandoDetalleEquipo = false;
    
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
        this.mostrandoTodosEquipos = true;
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
    // No cargar si ya tenemos datos (para evitar recargas innecesarias)
    if (this.clienteCategories.length > 0) {
      console.log('Usando clientes ya cargados');
      return;
    }
  
    // Definir las categorías una sola vez fuera de este método
    const categories = [
      { name: "Clientes con Servicios Regulares", title: "Clientes con Servicios Regulares" },
      { name: "Clientes con Servicios No-Regulares", title: "Clientes con Servicios No-Regulares" },
      { name: "Clientes con Servicios Antiguos-Recientes", title: "Clientes con Servicios Antiguos-Recientes" },
      { name: "Clientes con Servicios Antiguos", title: "Clientes con Servicios Antiguos" },
      { name: "Clientes sin servicios", title: "Clientes sin servicios" },
      { name: "No Es Cliente", title: "No Es Cliente" },
    ];
  
    // Cargar solo las dos categorías principales inicialmente
    this.loadCategoryBatch(categories.slice(0, 2));
    
    // Cargar el resto de categorías bajo demanda con un retraso
    setTimeout(() => {
      this.loadCategoryBatch(categories.slice(2));
    }, 2000);
  }

  private loadCategoryBatch(categories: {name: string, title: string}[]): void {
    // Usar forkJoin para hacer todas las peticiones en paralelo
    const requests = categories.map(category => 
      this.clienteService.getClientes(category.name).pipe(
        map(data => ({ category, data })),
        catchError(error => {
          console.error(`Error al cargar los clientes de ${category.name}:`, error);
          return of({ category, data: [] });
        })
      )
    );
    
    const subscription = forkJoin(requests).subscribe(results => {
      // Procesar todos los resultados de una vez para minimizar actualizaciones de UI
      results.forEach(result => {
        const categoryData = { title: result.category.title, clientes: result.data };
        this.clienteCategories.push(categoryData);
        
        if (!this.clientesCategoriesOriginal.find(cat => cat.title === result.category.title)) {
          const copiaSeguridad = { 
            title: result.category.title,
            clientes: result.data.map(cliente => ({ ...cliente })) // Copia liviana
          };
          this.clientesCategoriesOriginal.push(copiaSeguridad);
        }
      });
      
      // Actualizar la UI una sola vez después de procesar todo
      this.cdr.markForCheck();
    });
    
    this.subscriptions.push(subscription);
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

  ordenarPor(campo: string, resetPagina: boolean = true): void {
    if (this.campoOrdenamiento === campo) {
      this.ordenAscendente = !this.ordenAscendente;
    } else {
      this.campoOrdenamiento = campo;
      this.ordenAscendente = true;
    }
    
    // Solo ordenar si hay datos que ordenar
    if (this.equiposFiltrados.length > 0) {
      const collator = new Intl.Collator('es', { numeric: true });
      
      this.equiposFiltrados.sort((a: any, b: any) => {
        let valorA = a[campo];
        let valorB = b[campo];
        
        // Manejar fechas
        if (campo === 'fechaProximoServicio') {
          if (!valorA) return this.ordenAscendente ? 1 : -1;
          if (!valorB) return this.ordenAscendente ? -1 : 1;
          valorA = new Date(valorA).getTime();
          valorB = new Date(valorB).getTime();
          return this.ordenAscendente ? valorA - valorB : valorB - valorA;
        }
        
        // Usar Intl.Collator para strings (mejor rendimiento y manejo de caracteres especiales)
        if (typeof valorA === 'string' && typeof valorB === 'string') {
          return this.ordenAscendente ? 
            collator.compare(valorA, valorB) : 
            collator.compare(valorB, valorA);
        }
        
        // Comparación estándar para otros tipos
        if (valorA < valorB) return this.ordenAscendente ? -1 : 1;
        if (valorA > valorB) return this.ordenAscendente ? 1 : -1;
        return 0;
      });
    }
    
    if (resetPagina) {
      this.paginaActual = 1;
    }
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
      
      // Si estamos cargando equipos de una planta específica, desactivar mostrandoTodosEquipos
      if (this.localSeleccionado === nombrePlanta) {
        this.mostrandoTodosEquipos = false;
      }
      
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

  seleccionarEquipo(equipoId: string): void {
    // If already showing this equipment, toggle back to all equipment for the plant
    if (this.equipoSeleccionado === equipoId && this.mostrandoDetalleEquipo) {
      this.equipoSeleccionado = null;
      this.mostrandoDetalleEquipo = false;
      this.cargarEquiposFrecuenciaServicio(this.localSeleccionado!);
      return;
    }
    
    // Update selection and mark that we're showing equipment detail
    this.equipoSeleccionado = equipoId;
    this.mostrandoDetalleEquipo = true;
    
    // Filter to show only the selected equipment
    if (this.localSeleccionado) {
      this.frecuenciaServicioService.getEquipoDetalle(this.localSeleccionado, equipoId)
        .subscribe({
          next: (equipo: Equipos) => {
            // Show only this equipment in the table
            this.equiposOriginales = [{ ...equipo, local: this.localSeleccionado! }];
            this.equiposFiltrados = [...this.equiposOriginales];
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error(`Error al cargar detalles del equipo ${equipoId}:`, error);
          }
        });
    }
  }

  seleccionarCliente(event: Event, clienteNombre: string): void {
    // Prevenir comportamiento predeterminado si el evento existe
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (this.clienteSeleccionado === clienteNombre) {
      // Si es el mismo cliente, hacemos un toggle
      const detailsElement = event ? (event.target as HTMLElement)?.closest('details') : null;
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
          this.equipoSeleccionado = null;
          this.mostrandoDetalleEquipo = false;
        } else {
          // Si abrimos el detalle, mostramos todos los equipos
          this.cargarTodosEquiposCliente(clienteNombre);
          this.mostrandoTodosEquipos = true;
        }
      } else {
        // Si no hay elemento details, solo cargamos los equipos
        this.cargarTodosEquiposCliente(clienteNombre);
        this.mostrandoTodosEquipos = true;
      }
    } else {
      // Es un nuevo cliente
      // Reset equipment selection
      this.equipoSeleccionado = null;
      this.mostrandoDetalleEquipo = false;
      
      // Actualizar la selección de cliente
      this.clienteSeleccionado = clienteNombre;
      
      // Limpiar la selección de local
      this.localSeleccionado = null;
      this.EquiposPlantas = [];
      
      // Usar la API para obtener el RUC del cliente
      this.obtenerDetallesCliente(clienteNombre);
      
      // Cargar todos los equipos del cliente
      this.cargarTodosEquiposCliente(clienteNombre);
      
      // Activar mostrandoTodosEquipos cuando seleccionamos un cliente
      this.mostrandoTodosEquipos = true;
      
      // Opcional: abrir el details del cliente
      const detailsElement = event ? (event.target as HTMLElement)?.closest('details') : null;
      if (detailsElement) {
        detailsElement.open = true;
      }
    }
    
    console.log(`Cliente seleccionado: ${clienteNombre}, Mostrando todos equipos: ${this.mostrandoTodosEquipos}`);
  }

  buscarYNavegar(): void {
    // Validar que tenemos un término de búsqueda
    if (!this.busquedaClientes || this.busquedaClientes.trim() === '') {
      return;
    }
  
    const terminoBusqueda = this.busquedaClientes.toLowerCase().trim();
    
    // Realizar la búsqueda
    this.filtrarClientes();
    
    // Esperar a que el DOM se actualice con los resultados filtrados
    setTimeout(() => {
      // Buscar el primer cliente que coincida
      let clienteEncontrado: Cliente | null = null;
      let categoriaEncontrada: any = null;
      
      for (const category of this.clienteCategories) {
        if (!category.clientes) continue;
        
        for (const cliente of category.clientes) {
          // Evitar errores si cliente es undefined o null
          if (!cliente) continue;
          
          // Buscar por nombre
          const coincideNombre = cliente.nombre && cliente.nombre.toLowerCase().includes(terminoBusqueda);
          // Buscar por RUC
          const coincideRUC = cliente.ruc && cliente.ruc.toLowerCase().includes(terminoBusqueda);
          
          if (coincideNombre || coincideRUC) {
            clienteEncontrado = cliente;
            categoriaEncontrada = category;
            break;
          }
        }
        
        if (clienteEncontrado) break;
      }
      
      // Si encontramos un cliente, navegar a él
      if (clienteEncontrado && clienteEncontrado.nombre) {
        // Primero asegurar que la categoría esté expandida
        this.expandirCategoria(categoriaEncontrada.title);
        
        // Luego navegar al cliente
        setTimeout(() => {
          this.navegarAClientePorNombre(clienteEncontrado!.nombre);
        }, 300); // Dar tiempo a que se expanda la categoría
      } else {
        console.log('No se encontró ningún cliente que coincida con la búsqueda');
        // Opcionalmente mostrar un mensaje al usuario
      }
    }, 300); // Dar tiempo a que se actualice el DOM con los resultados filtrados
  }

  private navegarAClientePorNombre(nombreCliente: string): void {
    // Primero buscar y expandir el cliente en el DOM
    this.clienteDetails.forEach(item => {
      const element = item.nativeElement as HTMLDetailsElement;
      const summaryText = element.querySelector('summary')?.textContent || '';
      
      if (summaryText.includes(nombreCliente)) {
        // Abrir el details del cliente
        element.open = true;
        
        // Hacer scroll al elemento
        setTimeout(() => {
          const summaryElement = element.querySelector('summary');
          if (summaryElement) {
            // Scroll con efecto suave
            summaryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Añadir clase para resaltar temporalmente
            summaryElement.classList.add('cliente-encontrado');
            
            // Eliminar la clase después de 3 segundos
            setTimeout(() => {
              summaryElement.classList.remove('cliente-encontrado');
            }, 3000);
            
            // Opcionalmente, seleccionar el cliente sin enviar el evento
            this.seleccionarClienteSinEvento(nombreCliente);
          }
        }, 150);
      }
    });
  }

  private seleccionarClienteSinEvento(clienteNombre: string): void {
    // Si ya está seleccionado, no hacemos nada
    if (this.clienteSeleccionado === clienteNombre) {
      return;
    }
    
    // Actualizar la selección de cliente
    this.clienteSeleccionado = clienteNombre;
    
    // Limpiar la selección de local
    this.localSeleccionado = null;
    this.EquiposPlantas = [];
    
    // Usar la API para obtener el RUC del cliente
    this.obtenerDetallesCliente(clienteNombre);
    
    // Cargar todos los equipos del cliente
    this.cargarTodosEquiposCliente(clienteNombre);
    
    // Activar mostrandoTodosEquipos cuando seleccionamos un cliente
    this.mostrandoTodosEquipos = true;
    
    // No necesitamos manipular el elemento details aquí porque ya lo hicimos antes
    console.log(`Cliente seleccionado sin evento: ${clienteNombre}, Mostrando todos equipos: ${this.mostrandoTodosEquipos}`);
  }

  private expandirCategoria(nombreCategoria: string): void {
    this.categoryDetails.forEach(item => {
      const element = item.nativeElement as HTMLDetailsElement;
      const summaryText = element.querySelector('summary')?.textContent || '';
      
      if (summaryText.includes(nombreCategoria)) {
        element.open = true;
      }
    });
  }

// Nuevo método para obtener detalles del cliente desde la API
private obtenerDetallesCliente(Razon: string): void {
  // Verificar que el nombre del cliente no esté vacío
  if (!Razon || Razon.trim() === '') {
    console.warn('Intento de obtener detalles con nombre de cliente vacío');
    return;
  }
  
  console.log(`Obteniendo detalles para cliente: ${Razon}`);
  
  // Usar el método con fallback para mayor robustez
  this.clienteService.getDetallesClientesConFallback(Razon)
    .subscribe({
      next: (data: Detalles[]) => {
        if (!data || data.length === 0) {
          console.log(`No se encontraron detalles para ${Razon}`);
          this.clienteRucSeleccionado = 'Sin información';
          return;
        }
        
        // Actualizar el RUC
        this.clienteRucSeleccionado = data[0]?.ruc || 'Sin información';
        console.log(`RUC obtenido para ${Razon}: ${this.clienteRucSeleccionado}`);
        
        // Opcional: si el backend devuelve más información, actualizar otros campos
        
        // Forzar la detección de cambios
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error(`Error al obtener detalles del cliente ${Razon}:`, error);
        this.clienteRucSeleccionado = 'Error al obtener datos';
        this.cdr.detectChanges();
        
        // Opcional: mostrar mensaje de error en la UI
      }
    });
}

private cargarTodosEquiposCliente(Razon: string): void {
  // Si ya tenemos los datos para este cliente, no volver a cargarlos
  if (
    this.clienteSeleccionado === Razon && 
    this.todosEquiposCliente.length > 0 && 
    this.todosEquiposCliente[0]?.local
  ) {
    console.log(`Usando datos en caché para ${Razon}`);
    this.equiposOriginales = [...this.todosEquiposCliente];
    this.equiposFiltrados = [...this.equiposOriginales];
    this.filtrarEquipos();
    this.mostrandoTodosEquipos = true;
    this.cdr.markForCheck();
    return;
  }
  
  console.log(`Cargando todos los equipos para el cliente: ${Razon}`);
  
  // Buscar las plantas eficientemente
  let locales: any[] = [];
  
  // Buscar una sola vez usando el array original en lugar de recorrer todo
  const clienteInfo = this.clientesCategoriesOriginal
    .flatMap(category => category.clientes)
    .find(c => c.nombre === Razon);
  
  locales = clienteInfo?.locales || [];
  
  if (locales.length === 0) {
    console.log(`El cliente ${Razon} no tiene locales definidos.`);
    this.todosEquiposCliente = [];
    this.equiposOriginales = [];
    this.equiposFiltrados = [];
    this.mostrandoTodosEquipos = true;
    this.cdr.markForCheck();
    return;
  }
  
  // Usar loading state para indicar carga
  this.todosEquiposCliente = [];
  this.mostrandoTodosEquipos = true;
  
  // Cargar máximo 3 locales a la vez para no saturar la API
  const batchSize = 3;
  let processedLocals = 0;
  let equiposAgregados = 0;
  
  // Función para cargar lotes de locales
  const cargarLote = (inicio: number) => {
    const fin = Math.min(inicio + batchSize, locales.length);
    if (inicio >= locales.length) {
      // Terminamos de cargar todos los lotes
      return;
    }
    
    const requests = [];
    for (let i = inicio; i < fin; i++) {
      requests.push(this.frecuenciaServicioService.getFrecuenciaServicio(locales[i].local)
        .pipe(
          map(equipos => ({
            local: locales[i].local,
            equipos
          })),
          catchError(error => {
            console.error(`Error al cargar equipos para el local ${locales[i].local}:`, error);
            return of({ local: locales[i].local, equipos: [] });
          })
        )
      );
    }
    
    const subscription = forkJoin(requests).subscribe(resultados => {
      resultados.forEach(resultado => {
        const equiposConLocal = resultado.equipos.map(equipo => ({ ...equipo, local: resultado.local }));
        this.todosEquiposCliente = [...this.todosEquiposCliente, ...equiposConLocal];
        equiposAgregados += equiposConLocal.length;
      });
      
      // Actualizar UI con lo que tenemos hasta ahora
      this.equiposOriginales = [...this.todosEquiposCliente];
      this.equiposFiltrados = [...this.equiposOriginales];
      this.filtrarEquipos();
      this.cdr.markForCheck();
      
      // Cargar el siguiente lote
      processedLocals += resultados.length;
      if (processedLocals < locales.length) {
        setTimeout(() => cargarLote(fin), 300); // Pequeño retraso entre lotes
      } else {
        console.log(`Carga completa. Total equipos: ${equiposAgregados}`);
      }
    });
    
    this.subscriptions.push(subscription);
  };
  
  // Iniciar la carga por lotes
  cargarLote(0);
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
  // Si hay demasiados equipos, limitar la cantidad mostrada
  const MAX_ITEMS = 1000;
  const source = this.mostrandoTodosEquipos ? this.todosEquiposCliente : this.equiposOriginales;
  let filtrados = [];
  
  // Si hay muchos registros, usar un proceso optimizado
  if (source.length > MAX_ITEMS) {
    console.log(`Optimizando filtrado para ${source.length} equipos`);
    
    // Primero aplicar filtros simples 
    if (this.estadoSeleccionado || this.estadoMantenimientoSeleccionado) {
      filtrados = source.filter(equipo => {
        const coincideEstado = !this.estadoSeleccionado || equipo.estado === this.estadoSeleccionado;
        const coincideMantenimiento = !this.estadoMantenimientoSeleccionado || 
          equipo.estadoMantenimiento === this.estadoMantenimientoSeleccionado;
        return coincideEstado && coincideMantenimiento;
      });
    } else {
      filtrados = source;
    }
    
    // Luego aplicar búsqueda de texto solo si es necesario
    if (this.busquedaContacto) {
      const busqueda = this.busquedaContacto.toLowerCase();
      filtrados = filtrados.filter(equipo => 
        equipo.contacto.toLowerCase().includes(busqueda) || 
        (equipo.email && equipo.email.toLowerCase().includes(busqueda))
      );
    }
    
    // Limitar la cantidad si es demasiado grande
    if (filtrados.length > MAX_ITEMS) {
      console.warn(`Limitando resultados a ${MAX_ITEMS} de ${filtrados.length}`);
      filtrados = filtrados.slice(0, MAX_ITEMS);
    }
  } else {
    // Para conjuntos pequeños, usar el filtrado normal
    filtrados = source.filter(equipo => {
      const coincideEstado = !this.estadoSeleccionado || equipo.estado === this.estadoSeleccionado;
      const coincideMantenimiento = !this.estadoMantenimientoSeleccionado || 
                               equipo.estadoMantenimiento === this.estadoMantenimientoSeleccionado;
      const coincideContacto = !this.busquedaContacto || 
                           equipo.contacto.toLowerCase().includes(this.busquedaContacto.toLowerCase()) ||
                           (equipo.email && equipo.email.toLowerCase().includes(this.busquedaContacto.toLowerCase()));
      
      return coincideEstado && coincideMantenimiento && coincideContacto;
    });
  }
  
  this.equiposFiltrados = filtrados;
  
  // Mantener ordenamiento si existe
  if (this.campoOrdenamiento) {
    this.ordenarPor(this.campoOrdenamiento, false); // false para no resetear la paginación
  }
  
  this.paginaActual = 1; // Regresar a la primera página solo cuando es necesario
  this.totalEquiposCliente = source.length;
  this.cdr.markForCheck();
}

  // Función de filtrado de clientes mejorada
  filtrarClientes(): void {
    // Si ya estamos procesando una búsqueda, no iniciar otra
    if (this.isBuscando) {
      console.log('Ya hay una búsqueda en proceso, esperando...');
      return;
    }
    
    this.isBuscando = true;
    
    // Limpiar resaltados anteriores
    this.limpiarResaltados();
    
    // Si la búsqueda está vacía, restaurar la estructura original
    if (!this.busquedaClientes || this.busquedaClientes.trim() === '') {
      // Usar referencias en lugar de copias profundas costosas
      this.clienteCategories = this.clientesCategoriesOriginal.map(category => ({
        ...category,
        clientes: [...category.clientes]
      }));
      
      this.cdr.markForCheck(); // Usar markForCheck en lugar de detectChanges
      
      setTimeout(() => {
        this.colapsarTodosReset();
        this.isBuscando = false;
      }, 100);
      return;
    }
    
    const terminoBusqueda = this.busquedaClientes.toLowerCase().trim();
    
    // Usar los RUCs ya cargados en lugar de hacer nuevas peticiones
    // Filtrar directamente desde los datos originales
    const categoriesWithMatches = this.clientesCategoriesOriginal
    .map(category => {
      // CORRECCIÓN: Añadir tipo explícito para el parámetro cliente
      const clientesCoincidentes = category.clientes.filter((cliente: Cliente) => {
        return cliente.nombre?.toLowerCase().includes(terminoBusqueda) ||
               cliente.ruc?.toLowerCase().includes(terminoBusqueda) ||
               cliente.contacto?.toLowerCase().includes(terminoBusqueda);
      });
        
        if (clientesCoincidentes.length > 0) {
          return {
            ...category,
            clientes: clientesCoincidentes
          };
        }
        
        return null;
      })
      .filter(category => category !== null) as any[];
    
    // Actualizar UI con los resultados
    if (categoriesWithMatches.length > 0) {
      this.clienteCategories = categoriesWithMatches;
      this.cdr.markForCheck();
      
      // Expandir y resaltar después que los datos se hayan actualizado
      setTimeout(() => {
        this.expandirCategorias();
        this.resaltarCoincidencias(terminoBusqueda);
        this.isBuscando = false;
      }, 100);
    } else {
      this.clienteCategories = [{
        title: "Sin coincidencias",
        clientes: []
      }];
      this.cdr.markForCheck();
      this.isBuscando = false;
    }
  }

  private colapsarTodosReset(): void {
    // En lugar de iterar por todos los elementos, usar un selector y querySelectorAll
    const allDetails = document.querySelectorAll('.category-details');
    const maxElements = 10; // Limitar las operaciones DOM
    
    for (let i = 0; i < Math.min(maxElements, allDetails.length); i++) {
      (allDetails[i] as HTMLDetailsElement).open = false;
    }
  }

  manejarCambioEnBusqueda(event: KeyboardEvent): void {
    // Si el campo está vacío después de teclear (por ejemplo, después de borrar todo)
    if (!this.busquedaClientes || this.busquedaClientes.trim() === '') {
      // Restaurar el árbol completo
      this.filtrarClientes();
    } else {
      // Realizar filtrado normal después de un corto retraso para mejorar rendimiento
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }
      
      this.timeoutId = setTimeout(() => {
        this.filtrarClientes();
      }, 300); // 300ms de retraso para evitar muchas actualizaciones rápidas
    }
  }

  limpiarBusqueda(): void {
    this.busquedaClientes = '';
    this.filtrarClientes();
    
    // Opcional: enfocar el campo de búsqueda después de limpiarlo
    setTimeout(() => {
      const searchInput = document.querySelector('.custom-search') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    }, 100);
  }

  // Método para expandir todas las categorías que contienen coincidencias
  private expandirCategorias(): void {
    // Limitar la cantidad de operaciones DOM
    const maxOperations = 10;
    let operationsCount = 0;
    
    this.categoryDetails.forEach(item => {
      if (operationsCount < maxOperations) {
        (item.nativeElement as HTMLDetailsElement).open = true;
        operationsCount++;
      }
    });
  }
  
  // Método para resaltar las coincidencias en el árbol
  private resaltarCoincidencias(terminoBusqueda: string): void {
    // Primero limpiar resaltados anteriores
    this.limpiarResaltados();
    
    // Buscar y resaltar coincidencias
    setTimeout(() => {
      this.clienteDetails.forEach(item => {
        const element = item.nativeElement as HTMLDetailsElement;
        const summaryText = element.querySelector('summary')?.textContent || '';
        
        if (summaryText.toLowerCase().includes(terminoBusqueda.toLowerCase())) {
          const summaryElement = element.querySelector('summary');
          if (summaryElement) {
            summaryElement.classList.add('cliente-encontrado');
          }
        }
      });
    }, 100);
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
    // Buscar todos los elementos con la clase y removerla
    const elementosResaltados = document.querySelectorAll('.cliente-encontrado');
    elementosResaltados.forEach(elemento => {
      elemento.classList.remove('cliente-encontrado');
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
    return item?.nombre || `index-${index}`;
  }
  
  trackByPlanta(index: number, item: any): string {
    return item?.local || `index-${index}`;
  }
  
  trackByEquipo(index: number, item: Equipos): string {
    return item?.referencia || item?.serie || `index-${index}`;
  }
  
  trackByCategoryFn(index: number, item: any): string {
    return item?.title || `index-${index}`;
  }

  ngOnDestroy(): void {
    // Cancelar todas las suscripciones al destruir el componente
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  
}
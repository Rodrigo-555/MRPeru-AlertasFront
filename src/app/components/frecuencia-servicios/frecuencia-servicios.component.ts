import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, QueryList, ViewChildren, ElementRef, Renderer2 } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Equipos, Planta } from '../../interface/equipos.interface.fs';
import { ClienteService } from '../../service/Clientes/cliente.service';
import { FrecuenciaServicioService } from '../../service/FrecuenciaServicio/frecuencia-servicio.service';
import { Cliente } from '../../interface/clientes.interface.';
import { EquiposServiceService } from '../../service/Equipos/equipos-service.service';
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

  cargandoEquiposLocal: boolean = false;

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

  private equiposPorLocalMap: { [key: string]: string[] } = {};
  private cargandoEquiposPorLocal: { [key: string]: boolean } = {};

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
    event.preventDefault();
    event.stopPropagation();
    
    console.log(`Mostrando equipos para cliente: ${razon}, local: ${nombreLocal}`);
    
    const detailsElement = (event.target as HTMLElement).closest('details');
    
    if (detailsElement) {
      detailsElement.open = !detailsElement.open;
    }
    
    if (detailsElement && !detailsElement.open) {
      return;
    }
    
    if (this.clienteSeleccionado !== razon) {
      this.equiposOriginales = [];
      this.equiposFiltrados = [];
      this.todosEquiposCliente = [];
      this.paginaActual = 1;
      
      this.clienteSeleccionado = razon;
      this.obtenerDetallesCliente(razon);
      this.cargarTodosEquiposCliente(razon);
    }
    
    // Guardar el local seleccionado anteriormente para detectar cambios
    const localAnterior = this.localSeleccionado;
    this.localSeleccionado = nombreLocal;
    this.mostrandoTodosEquipos = false;
    
    // Usar la clave combinada para identificar únicamente el local
    const localKey = `${razon}:${nombreLocal}`;
    
    // Verificar que estamos cambiando de local realmente
    const cambioDeLocal = localAnterior !== nombreLocal;
    
    // Limpiar EquiposPlantas solo si cambiamos de local
    if (cambioDeLocal) {
      console.log(`Cambiando de local ${localAnterior} a ${nombreLocal}`);
      // Importante: Establecer explícitamente a un array vacío primero
      this.EquiposPlantas = [];
      this.cdr.detectChanges(); // Forzar actualización de UI antes de seguir
    }
    
    // Mostrar los equipos desde el caché si ya están cargados
    if (this.equiposPorLocalMap[localKey] !== undefined) {
      console.log(`Usando equipos en caché para ${nombreLocal} (${this.equiposPorLocalMap[localKey].length} equipos)`);
      // Usar el operador || [] para garantizar que siempre sea un array
      this.EquiposPlantas = this.equiposPorLocalMap[localKey] || [];
      this.cargandoEquiposLocal = false;
    } else {
      // Si no están en caché, cargarlos
      console.log(`Equipos no encontrados en caché para ${nombreLocal}, cargando...`);
      this.cargandoEquiposLocal = true;
      this.EquiposPlantas = []; // Asegurarse de que esté vacío mientras carga
      this.cargandoEquiposPorLocal[localKey] = true;
      this.cargarEquiposPlantas(razon, nombreLocal, localKey);
    }
    
    this.equiposOriginales = [];
    this.equiposFiltrados = [];
    this.paginaActual = 1;
    this.cargarEquiposFrecuenciaServicio(nombreLocal);
    
    this.cdr.detectChanges(); // Forzar actualización de la UI al final
  }

  clickLocalSummary(event: Event, razon: string, nombreLocal: string): void {
    // Prevenir la propagación pero no el comportamiento predeterminado de details
    event.stopPropagation();
    
    // Si ya está seleccionado, dejamos que el comportamiento nativo del details funcione
    if (this.localSeleccionado === nombreLocal && this.clienteSeleccionado === razon) {
      return;
    }
    
    // Si es un nuevo local, controlamos el comportamiento
    this.mostrarEquiposPlanta(event, razon, nombreLocal);
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
      
      // Precargar RUCs para los primeros clientes visibles
      this.precargarRUCsIniciales();
      
      // Actualizar la UI una sola vez después de procesar todo
      this.cdr.markForCheck();
    });
    
    this.subscriptions.push(subscription);
  }

  private precargarRUCsIniciales(): void {
    // Solo precargar para las primeras dos categorías para mejorar rendimiento inicial
    const clientesVisibles = this.clientesCategoriesOriginal
      .slice(0, 2) // Solo primeras dos categorías
      .flatMap(cat => cat.clientes)
      .slice(0, 20); // Limitar a 20 clientes
      
    if (clientesVisibles.length > 0) {
      console.log(`Precargando RUCs para ${clientesVisibles.length} clientes iniciales`);
      this.clienteService.precargarRUCsEficiente(clientesVisibles);
    }
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
    // Primero expandir categorías con un pequeño retraso entre operaciones DOM
    setTimeout(() => {
      this.categoryDetails.forEach((item, index) => {
        setTimeout(() => {
          (item.nativeElement as HTMLDetailsElement).open = true;
        }, index * 20); // Pequeño retraso para no bloquear el UI
      });
      
      // Luego expandir clientes con un retraso
      setTimeout(() => {
        this.clienteDetails.forEach((item, index) => {
          setTimeout(() => {
            (item.nativeElement as HTMLDetailsElement).open = true;
          }, index * 10); // Retraso aún menor para clientes
        });
      }, 300); // Esperar un poco para que se completen las categorías primero
    });
  }
  
  // Función para colapsar todos los nodos
  colapsarTodo(): void {
    // Primero cerrar clientes
    setTimeout(() => {
      this.clienteDetails.forEach((item, index) => {
        setTimeout(() => {
          (item.nativeElement as HTMLDetailsElement).open = false;
        }, index * 5);
      });
      
      // Luego cerrar categorías
      setTimeout(() => {
        this.categoryDetails.forEach((item, index) => {
          setTimeout(() => {
            (item.nativeElement as HTMLDetailsElement).open = false;
          }, index * 10);
        });
      }, 200);
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

  private cargarEquiposPlantas(Razon: string, NombreLocal: string, localKey: string): void {
    console.log(`Cargando equipos para Razon: ${Razon}, Local: ${NombreLocal}`);
    
    this.equipoService.getEquipos(Razon, NombreLocal).subscribe({
      next: (data: string[]) => {
        console.log(`Recibidos ${data.length} equipos para ${Razon}, ${NombreLocal}`);
        
        // Asegurarse de que siempre guardamos un array (incluso si está vacío)
        this.equiposPorLocalMap[localKey] = Array.isArray(data) ? [...data] : [];
        
        // Actualizar datos solo si este local sigue siendo el seleccionado
        if (this.localSeleccionado === NombreLocal && this.clienteSeleccionado === Razon) {
          this.EquiposPlantas = Array.isArray(data) ? [...data] : [];
        }
        
        // Actualizar estado de carga
        this.cargandoEquiposPorLocal[localKey] = false;
        this.cargandoEquiposLocal = this.localSeleccionado === NombreLocal ? false : this.cargandoEquiposLocal;
        
        console.log(`Estado final equipos para ${NombreLocal}: ${this.EquiposPlantas.length} elementos`);
        this.cdr.detectChanges(); // Forzar actualización de la UI
      },
      error: (error) => {
        console.error(`Error al cargar equipos para ${Razon}, ${NombreLocal}:`, error);
        
        // Importante: guardar explícitamente como array vacío
        this.equiposPorLocalMap[localKey] = [];
        this.cargandoEquiposPorLocal[localKey] = false;
        
        // Actualizar solo si este local sigue siendo el seleccionado
        if (this.localSeleccionado === NombreLocal && this.clienteSeleccionado === Razon) {
          this.EquiposPlantas = [];
          this.cargandoEquiposLocal = false;
        }
        
        console.log(`Estado final equipos para ${NombreLocal} (error): 0 elementos`);
        this.cdr.detectChanges(); // Forzar actualización de la UI
      }
    });
  }


private cargarEquiposFrecuenciaServicio(nombrePlanta: string): void {
  // Mostrar algún indicador de carga o limpiar la tabla actual
  if (!this.mostrandoTodosEquipos || this.equiposOriginales.length === 0) {
    this.equiposOriginales = [];
    this.equiposFiltrados = [];
  }

  // Corregir el tipo: convertir null a undefined si es necesario
  const clienteRazon = this.clienteSeleccionado || undefined;

  // Asegurarse de pasar el cliente seleccionado como segundo parámetro
  this.frecuenciaServicioService.getFrecuenciaServicio(nombrePlanta, clienteRazon).subscribe({
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
    // Si ya estamos mostrando este equipo, volver a mostrar todos los equipos de la planta
    if (this.equipoSeleccionado === equipoId && this.mostrandoDetalleEquipo) {
      this.volverAListaEquipos();
      return;
    }
    
    // Actualizar la selección y marcar que estamos mostrando detalles de equipo
    this.equipoSeleccionado = equipoId;
    this.mostrandoDetalleEquipo = true;
    console.log(`Equipo seleccionado: ${equipoId}`);
    
    // Mostrar estado de carga
    this.equiposOriginales = [];
    this.equiposFiltrados = [];
    this.cdr.detectChanges();
    
    if (this.clienteSeleccionado && this.localSeleccionado) {
      // Usar la nueva API para obtener detalles específicos del equipo
      this.frecuenciaServicioService.getEquipoIndividual(
        this.localSeleccionado, 
        this.clienteSeleccionado, 
        equipoId
      ).subscribe({
        next: (equipo: Equipos) => {
          console.log('Detalles de equipo recibidos:', equipo);
          // Mostrar solo este equipo en la tabla
          this.equiposOriginales = [{ ...equipo, local: this.localSeleccionado! }];
          this.equiposFiltrados = [...this.equiposOriginales];
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error(`Error al cargar detalles del equipo ${equipoId}:`, error);
          
          // Alternativa: Intentar encontrar el equipo en la lista actual o en todos los equipos del cliente
          let equipoEncontrado = this.todosEquiposCliente.find(equipo => 
            equipo.serie === equipoId || 
            equipo.referencia === equipoId);
          
          if (!equipoEncontrado) {
            equipoEncontrado = this.equiposOriginales.find(e => 
              e.serie === equipoId || 
              e.referencia === equipoId);
          }
          
          if (equipoEncontrado) {
            this.equiposOriginales = [{ ...equipoEncontrado }];
            this.equiposFiltrados = [...this.equiposOriginales];
          } else {
            // Mostrar mensaje de error
            console.warn(`No se encontró el equipo ${equipoId}`);
          }
          this.cdr.detectChanges();
        }
      });
    }
  }

  volverAListaEquipos(): void {
    this.equipoSeleccionado = null;
    this.mostrandoDetalleEquipo = false;
    
    if (this.localSeleccionado) {
      // Recargar lista de equipos para el local actual
      this.cargarEquiposFrecuenciaServicio(this.localSeleccionado);
    } else if (this.clienteSeleccionado && this.mostrandoTodosEquipos) {
      // Restaurar vista filtrada de todos los equipos
      this.equiposOriginales = [...this.todosEquiposCliente];
      this.equiposFiltrados = [...this.equiposOriginales];
      this.filtrarEquipos();
    }
    
    this.cdr.detectChanges();
  }

  seleccionarCliente(event: Event, clienteNombre: string): void {
    event.stopPropagation();
    
    console.log(`Seleccionado cliente: ${clienteNombre}`);
    
    // Si es el mismo cliente que ya está seleccionado, no hacemos nada extra
    if (this.clienteSeleccionado === clienteNombre) {
      return;
    }
    
    // Limpiar datos previos antes de cargar los nuevos
    this.equiposOriginales = [];
    this.equiposFiltrados = [];
    this.todosEquiposCliente = [];
    this.paginaActual = 1;
    
    // Actualizar la selección con el nuevo cliente
    this.clienteSeleccionado = clienteNombre;
    this.localSeleccionado = null;
    this.EquiposPlantas = [];
    this.equipoSeleccionado = null;
    this.mostrandoDetalleEquipo = false;
    
    // Obtener detalles del cliente y cargar sus equipos
    this.obtenerDetallesCliente(clienteNombre);
    this.cargarTodosEquiposCliente(clienteNombre);
    
    // Activar mostrandoTodosEquipos cuando seleccionamos un cliente
    this.mostrandoTodosEquipos = true;
    
    this.cdr.detectChanges(); // Forzar actualización de la vista
  }
  

  buscarYNavegar(): void {
    // Validar que tenemos un término de búsqueda
    if (!this.busquedaClientes || this.busquedaClientes.trim() === '') {
      return;
    }
  
    const terminoBusqueda = this.busquedaClientes.toLowerCase().trim();
    
    // Si es posible que sea un RUC (comienza con número), intentar precargarlo primero
    if (/^\d/.test(terminoBusqueda)) {
      this.precargarRUCsParaBusqueda(terminoBusqueda);
      
      // Dar un poco de tiempo para que se carguen los RUCs
      setTimeout(() => this.ejecutarBusquedaYNavegacion(terminoBusqueda), 300);
    } else {
      // Para búsquedas que no parecen RUC, ejecutar inmediatamente
      this.ejecutarBusquedaYNavegacion(terminoBusqueda);
    }
  }

  private ejecutarBusquedaYNavegacion(terminoBusqueda: string): void {
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
          if (!cliente) continue;
          
          // Verificar coincidencia por nombre
          const nombreCoincide = cliente.nombre && 
            cliente.nombre.toLowerCase().includes(terminoBusqueda);
          
          // Verificar coincidencia por RUC
          const rucCoincide = cliente.ruc && 
            cliente.ruc.toLowerCase().includes(terminoBusqueda);
          
          // Verificar coincidencia por contacto
          const contactoCoincide = cliente.contacto && 
            cliente.contacto.toLowerCase().includes(terminoBusqueda);
          
          // Si coincide por cualquier campo, es un resultado válido
          if (nombreCoincide || rucCoincide || contactoCoincide) {
            console.log('Cliente encontrado:', cliente.nombre);
            console.log('RUC del cliente:', cliente.ruc);
            
            clienteEncontrado = cliente;
            categoriaEncontrada = category;
            break;
          }
        }
        
        if (clienteEncontrado) break;
      }
      
      // Si encontramos un cliente, navegar a él
      if (clienteEncontrado && clienteEncontrado.nombre) {
        // Expandir la categoría primero
        this.expandirCategoria(categoriaEncontrada.title);
        
        // Esperar un poco para que la UI se actualice
        setTimeout(() => {
          this.navegarAClientePorNombre(clienteEncontrado!.nombre);
        }, 300);
      } else {
        console.log('No se encontró ningún cliente que coincida con la búsqueda');
        // Opcionalmente mostrar un mensaje visual al usuario
      }
    }, 300);
  }

  private navegarAClientePorNombre(nombreCliente: string): void {
    // Primero buscar y expandir el cliente en el DOM
    this.clienteDetails.forEach(item => {
      const element = item.nativeElement as HTMLDetailsElement;
      const summaryText = element.querySelector('summary')?.textContent || '';
      
      // La comprobación más precisa para identificar el cliente correcto
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
            
            // Añadir una animación más visible para destacar el resultado encontrado
            this.renderer.addClass(summaryElement, 'cliente-encontrado-animacion');
            
            // Eliminar las clases después de 3 segundos
            setTimeout(() => {
              summaryElement.classList.remove('cliente-encontrado');
              this.renderer.removeClass(summaryElement, 'cliente-encontrado-animacion');
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
    
    // Limpiar datos previos
    this.equiposOriginales = [];
    this.equiposFiltrados = [];
    this.todosEquiposCliente = [];
    this.paginaActual = 1;
    
    // Actualizar la selección de cliente
    this.clienteSeleccionado = clienteNombre;
    
    // Limpiar la selección de local
    this.localSeleccionado = null;
    this.EquiposPlantas = [];
    this.equipoSeleccionado = null;
    this.mostrandoDetalleEquipo = false;
    
    // Usar la API para obtener el RUC del cliente
    this.obtenerDetallesCliente(clienteNombre);
    
    // Cargar todos los equipos del cliente
    this.cargarTodosEquiposCliente(clienteNombre);
    
    // Activar mostrandoTodosEquipos cuando seleccionamos un cliente
    this.mostrandoTodosEquipos = true;
    
    console.log(`Cliente seleccionado sin evento: ${clienteNombre}, Mostrando todos equipos: ${this.mostrandoTodosEquipos}`);
    
    this.cdr.detectChanges(); // Forzar actualización de la vista
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
  // Buscar el cliente en la caché primero
  const clienteEncontrado = this.encontrarClientePorNombre(Razon);
  if (clienteEncontrado && clienteEncontrado.ruc) {
    this.clienteRucSeleccionado = clienteEncontrado.ruc;
    return;
  }
  
  // Si no lo encontramos o no tiene RUC, consultarlo al servicio
  this.clienteService.getDetallesClientes(Razon).subscribe({
    next: (detalles) => {
      if (detalles && detalles.length > 0) {
        this.clienteRucSeleccionado = detalles[0]?.ruc || 'Sin RUC registrado';
        
        // Actualizar el RUC en la caché local si es posible
        if (clienteEncontrado) {
          clienteEncontrado.ruc = this.clienteRucSeleccionado;
        }
      } else {
        this.clienteRucSeleccionado = 'Sin RUC registrado';
      }
      this.cdr.detectChanges();
    },
    error: (error) => {
      console.error('Error al obtener detalles del cliente:', error);
      this.clienteRucSeleccionado = 'Error al cargar RUC';
      this.cdr.detectChanges();
    }
  });
}

private cargarTodosEquiposCliente(Razon: string): void {
  // Limpiar datos previos
  this.todosEquiposCliente = [];
  this.equiposOriginales = [];
  this.equiposFiltrados = [];
  this.paginaActual = 1;
  
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
      requests.push(this.frecuenciaServicioService.getFrecuenciaServicio(locales[i].local, Razon)
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
      // Verificar si todavía estamos cargando datos para el mismo cliente
      if (this.clienteSeleccionado !== Razon) {
        console.log('Cliente cambió durante la carga, cancelando actualizaciones');
        return;
      }
      
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
        // Asegurarse de que la bandera se mantiene verdadera al finalizar
        this.mostrandoTodosEquipos = true;
        this.cdr.markForCheck();
      }
    });
    
    this.subscriptions.push(subscription);
  };
  
  // Iniciar la carga por lotes
  cargarLote(0);
}


private cargarEquiposLocal(razon: string, local: string, callback: (equipos: Equipos[]) => void): void {
  this.frecuenciaServicioService.getFrecuenciaServicio(local, razon).subscribe({
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
        (equipo.contacto && equipo.contacto.toLowerCase().includes(busqueda)) || 
        (equipo.email && equipo.email.toLowerCase().includes(busqueda)) ||
        (equipo.referencia && equipo.referencia.toLowerCase().includes(busqueda)) ||
        (equipo.serie && equipo.serie.toLowerCase().includes(busqueda)) ||
        (equipo.modelo && equipo.modelo.toLowerCase().includes(busqueda))
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
      
      // Variable para almacenar resultado de búsqueda - debe ser boolean
      let coincideBusqueda = true;
      
      if (this.busquedaContacto) {
        const busqueda = this.busquedaContacto.toLowerCase();
        // Asegurar que el resultado sea siempre boolean y buscar en todos los campos requeridos
        coincideBusqueda = !!(
          (equipo.contacto && equipo.contacto.toLowerCase().includes(busqueda)) ||
          (equipo.email && equipo.email.toLowerCase().includes(busqueda)) ||
          (equipo.referencia && equipo.referencia.toLowerCase().includes(busqueda)) ||
          (equipo.serie && equipo.serie.toLowerCase().includes(busqueda)) ||
          (equipo.modelo && equipo.modelo.toLowerCase().includes(busqueda))
        );
      }
      
      return coincideEstado && coincideMantenimiento && coincideBusqueda;
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
      // Usar referencias en lugar de copias profundas
      this.clienteCategories = this.clientesCategoriesOriginal.map(category => ({
        ...category,
        clientes: [...category.clientes]
      }));
      
      this.cdr.markForCheck();
      
      setTimeout(() => {
        this.colapsarTodosReset();
        this.isBuscando = false;
      }, 100);
      return;
    }
    
    const terminoBusqueda = this.busquedaClientes.toLowerCase().trim();
    
    // PASO 1: Precargar los RUCs para los clientes cuando se busca por algo que podría ser un RUC
    // Esto arregla el problema de búsqueda por RUC
    if (/^\d/.test(terminoBusqueda)) { // Si comienza con número, podría ser un RUC
      this.precargarRUCsParaBusqueda(terminoBusqueda);
    }
    
    // PASO 2: Realizar filtrado inmediato con lo que ya tenemos
    this.realizarFiltrado(terminoBusqueda);
  }

  private realizarFiltrado(terminoBusqueda: string): void {
    const categoriesWithMatches = this.clientesCategoriesOriginal
      .map(category => {
        const clientesCoincidentes = category.clientes.filter((cliente: Cliente) => {
          // Búsqueda por nombre
          const nombreCoincide = cliente.nombre ? 
            cliente.nombre.toLowerCase().includes(terminoBusqueda) : false;
          
          // Búsqueda por RUC (mejorada)
          const rucCoincide = cliente.ruc ? 
            cliente.ruc.toLowerCase().includes(terminoBusqueda) : false;
          
          // Búsqueda por contacto
          const contactoCoincide = cliente.contacto ? 
            cliente.contacto.toLowerCase().includes(terminoBusqueda) : false;
          
          return nombreCoincide || rucCoincide || contactoCoincide;
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
  
  // Nuevo método para precargar RUCs de forma eficiente durante la búsqueda
  private precargarRUCsParaBusqueda(terminoBusqueda: string): void {
    console.log('Precargando RUCs para búsqueda numérica:', terminoBusqueda);
    
    // Obtener todos los clientes de todas las categorías
    const todosLosClientes = this.clientesCategoriesOriginal.flatMap(cat => cat.clientes);
    
    // Filtrar clientes que no tienen RUC y podrían coincidir con la búsqueda por nombre
    // Esto reduce el número de llamadas a la API
    const clientesPosibles = todosLosClientes.filter(cliente => 
      !cliente.ruc && 
      cliente.nombre && 
      cliente.nombre.toLowerCase().includes(terminoBusqueda)
    );
    
    // Si hay clientes que podrían necesitar RUC, precargarlos
    if (clientesPosibles.length > 0) {
      // Limitar a máximo 10 clientes para no sobrecargar
      const clientesPrioritarios = clientesPosibles.slice(0, 10);
      
      console.log(`Solicitando RUCs para ${clientesPrioritarios.length} clientes potenciales`);
      
      // Para cada cliente potencial, obtener su RUC
      clientesPrioritarios.forEach(cliente => {
        this.clienteService.getDetallesClientesConFallback(cliente.nombre)
          .subscribe({
            next: (detalles) => {
              if (detalles && detalles.length > 0 && detalles[0].ruc) {
                // Actualizar el RUC del cliente en todas las categorías
                this.clientesCategoriesOriginal.forEach(category => {
                  const clienteEnCategoria = category.clientes.find((c: { nombre: any; }) => c.nombre === cliente.nombre);
                  if (clienteEnCategoria) {
                    clienteEnCategoria.ruc = detalles[0].ruc;
                    console.log(`Actualizado RUC para ${cliente.nombre}: ${detalles[0].ruc}`);
                  }
                });
                
                // Volver a aplicar el filtro si seguimos en la misma búsqueda
                if (this.busquedaClientes && 
                    this.busquedaClientes.toLowerCase().includes(terminoBusqueda)) {
                  this.realizarFiltrado(terminoBusqueda);
                }
              }
            },
            error: (error) => {
              console.error(`Error al cargar RUC para ${cliente.nombre}:`, error);
            }
          });
      });
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
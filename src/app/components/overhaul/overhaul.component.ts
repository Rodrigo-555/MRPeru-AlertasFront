import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Equipos } from '../../interface/equipos.interface.o';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { OverhoalService } from '../../service/Overhoal/overhoal.service';

@Component({
  selector: 'app-overhaul',
  standalone: true,
  imports: [CommonModule,HttpClientModule, FormsModule],
  templateUrl: './overhaul.component.html',
  styleUrl: './overhaul.component.scss'
})
export class OverhaulComponent implements OnInit {

  // Datos de equipos
  equiposOriginales: Equipos[] = [];
  equiposFiltrados: Equipos[] = [];

  // Variables para filtros
  horasSeleccionadas: string | null = null;
  busquedaTexto: string = '';
  categoriaClienteSeleccionada: string | null = null;

  // Variables para ordenamiento
  campoOrdenamiento: string = '';
  ordenAscendente: boolean = true;

  // Variables para paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 10;

  // Lista de categorías disponibles
  categoriasClientes: string[] = [
    'Clientes con Servicios Regulares',
    'Clientes con Servicios No-Regulares',
    'Clientes con Servicios Antiguos-Recientes',
    'Clientes con Servicios Antiguos',
    'Clientes sin servicios',
    'No Es Cliente'
  ];

  constructor(
    private overhoalService: OverhoalService
  ) {}

  ngOnInit() {
    // Cargar todos los equipos al inicio (o usar una categoría por defecto)
    this.cargarEquipos('');
  }

  /**
   * Carga los equipos desde el servicio según la categoría seleccionada
   */
  cargarEquipos(categoria: string): void {
    this.overhoalService.getProximoServicio(categoria).subscribe(
      (data: Equipos[]) => {
        console.log('Datos recibidos:', data);
        this.equiposOriginales = data;
        this.equiposFiltrados = [...this.equiposOriginales];
      },
      (error: any) => {
        console.error('Error al cargar los equipos:', error);
      }
    );
  }

 // Método específico para filtrar por rango de fechas
 filtrarPorHorasRestantes(): void {
  if (!this.horasSeleccionadas) {
    // Si no hay selección de horas, mostrar todos los equipos
    this.equiposFiltrados = [...this.equiposOriginales];
  } else {
    const horasLimite = parseInt(this.horasSeleccionadas);
    const fechaActual = new Date();
    
    this.equiposFiltrados = this.equiposOriginales.filter(equipo => {
      // Verificar si el equipo tiene fecha de próximo overhaul
      if (!equipo.fechaProximoOverhoal) return false;
      
      // Calcular horas restantes basado en la diferencia de fechas
      const fechaOverhaul = new Date(equipo.fechaProximoOverhoal);
      const diasRestantes = Math.floor((fechaOverhaul.getTime() - fechaActual.getTime()) / (1000 * 60 * 60 * 24));
      
      // Estimar horas restantes (asumiendo X horas por día, ajustar según tu contexto)
      // Por ejemplo, si asumimos 24 horas por día: 
      const horasRestantes = diasRestantes * 24; 
      
      // Filtrar equipos que tienen menos horas restantes que el límite seleccionado
      return horasRestantes <= horasLimite;
    });
  }
  
  // Aplicar filtro de texto si existe
  if (this.busquedaTexto) {
    this.filtrarPorTextoEnResultadosActuales();
  }
  
  // Resetear a la primera página
  this.paginaActual = 1;
}

// Método auxiliar para filtrar por texto solo en los resultados actuales
private filtrarPorTextoEnResultadosActuales(): void {
  const termino = this.busquedaTexto.toLowerCase();
  this.equiposFiltrados = this.equiposFiltrados.filter(equipo =>
    equipo.cliente.toLowerCase().includes(termino) ||
    equipo.referencia.toLowerCase().includes(termino) ||
    equipo.serie.toLowerCase().includes(termino) ||
    equipo.planta.toLowerCase().includes(termino)
  );
}

// También necesitamos actualizar filtrarPorTexto para respetar los filtros de fecha
filtrarPorTexto(): void {
  // Comenzar con todos los equipos o los filtrados por horas restantes
  let baseEquipos = [...this.equiposOriginales];
  
  // Aplicar filtro de horas restantes si existe
  if (this.horasSeleccionadas) {
    const horasLimite = parseInt(this.horasSeleccionadas);
    const fechaActual = new Date();
    
    baseEquipos = baseEquipos.filter(equipo => {
      if (!equipo.fechaProximoOverhoal) return false;
      
      const fechaOverhaul = new Date(equipo.fechaProximoOverhoal);
      const diasRestantes = Math.floor((fechaOverhaul.getTime() - fechaActual.getTime()) / (1000 * 60 * 60 * 24));
      const horasRestantes = diasRestantes * 24; // Ajustar según tu contexto
      
      return horasRestantes <= horasLimite;
    });
  }
  
  // Aplicar filtro de texto
  if (this.busquedaTexto) {
    const termino = this.busquedaTexto.toLowerCase();
    this.equiposFiltrados = baseEquipos.filter(equipo =>
      equipo.cliente.toLowerCase().includes(termino) ||
      equipo.referencia.toLowerCase().includes(termino) ||
      equipo.serie.toLowerCase().includes(termino) ||
      equipo.planta.toLowerCase().includes(termino)
    );
  } else {
    // Si no hay texto, usar los equipos base (ya filtrados por horas si aplica)
    this.equiposFiltrados = baseEquipos;
  }
  
  this.paginaActual = 1;
}

// El método general filtrarEquipos ahora coordina todos los filtros
filtrarEquipos(): void {
  // Si cambia la categoría, volver a cargar los datos desde la API
  if (this.categoriaClienteSeleccionada) {
    this.cargarEquipos(this.categoriaClienteSeleccionada);
    return;
  }
  
  // Restablecer a equipos originales
  this.equiposFiltrados = [...this.equiposOriginales];
  
  // Aplicar filtros en orden
  if (this.horasSeleccionadas) {
    this.filtrarPorHorasRestantes();
  }
  
  if (this.busquedaTexto) {
    this.filtrarPorTexto();
  }
  
  this.paginaActual = 1;
}

  /**
   * Ordena los equipos filtrados por el campo especificado.
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

  // TrackBy function para optimizar rendering
  trackByEquipo(index: number, item: Equipos): string {
    return item.referencia; // Asegúrate de que `referencia` sea única
  }
}

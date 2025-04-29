import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Equipos } from '../../interface/equipos.interface.ps';
import { ProximoServicioService } from '../../service/ProximoServicio/proximo-servicio.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-proximo-servicio',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './proximo-servicio.component.html',
  styleUrls: ['./proximo-servicio.component.scss']
})
export class ProximoServicioComponent implements OnInit {
  // Datos de equipos
  equiposOriginales: Equipos[] = [];
  equiposFiltrados: Equipos[] = [];

  // Variables para filtros
  fechaInicio: string = '';
  fechaFin: string = '';
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
    private proximoServicioService: ProximoServicioService
  ) {}

  ngOnInit() {
    // Cargar todos los equipos al inicio (o usar una categoría por defecto)
    this.cargarEquipos('');
  }

  /**
   * Carga los equipos desde el servicio según la categoría seleccionada
   */
  cargarEquipos(categoria: string): void {
    this.proximoServicioService.getProximoServicio(categoria).subscribe(
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
  filtrarPorFechas(): void {
    // Verificar que ambas fechas estén seleccionadas
    if (this.fechaInicio && this.fechaFin) {
      const inicio = new Date(this.fechaInicio);
      const fin = new Date(this.fechaFin);

      // Ajustar fin para incluir todo el día
      fin.setHours(23, 59, 59, 999);

      this.equiposFiltrados = this.equiposOriginales.filter(equipo => {
        if (!equipo.fechaProximoServicio) return false;
        
        const fechaEquipo = new Date(equipo.fechaProximoServicio);
        return fechaEquipo >= inicio && fechaEquipo <= fin;
      });

      // También aplicar el filtro de texto si existe
      if (this.busquedaTexto) {
        this.filtrarPorTextoEnResultadosActuales();
      }
    } else if (!this.fechaInicio && !this.fechaFin) {
      // Si no hay fechas seleccionadas, restaurar lista original
      this.equiposFiltrados = [...this.equiposOriginales];
      
      // Aplicar solo filtro de texto si existe
      if (this.busquedaTexto) {
        this.filtrarPorTextoEnResultadosActuales();
      }
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
    // Comenzar con todos los equipos o los filtrados por fecha
    let baseEquipos = [...this.equiposOriginales];
    
    // Aplicar filtro de fecha si existe
    if (this.fechaInicio && this.fechaFin) {
      const inicio = new Date(this.fechaInicio);
      const fin = new Date(this.fechaFin);
      fin.setHours(23, 59, 59, 999);
      
      baseEquipos = baseEquipos.filter(equipo => {
        if (!equipo.fechaProximoServicio) return false;
        const fechaEquipo = new Date(equipo.fechaProximoServicio);
        return fechaEquipo >= inicio && fechaEquipo <= fin;
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
      // Si no hay texto, usar los equipos base (ya filtrados por fecha si aplica)
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
    if (this.fechaInicio && this.fechaFin) {
      this.filtrarPorFechas();
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

  /**
   * Exporta los datos filtrados actuales a un archivo Excel
   */
  exportarAExcel(): void {
    try {
      // Preparar los datos para exportar
      const datosParaExportar = this.equiposFiltrados.map(equipo => {
        return {
          'Cliente': equipo.cliente,
          'Local/Planta': equipo.planta,
          'Referencia': equipo.referencia,
          'Serie': equipo.serie,
          'Modelo': equipo.modelo,
          'Tipo de Equipo': equipo.tipoEquipo,
          'Estado': this.getEstadoLabel(equipo.estado),
          'Estado de Mantenimiento': this.getMantenimientoLabel(equipo.estadoMantenimiento),
          'Fecha Próximo Servicio': equipo.fechaProximoServicio ? new Date(equipo.fechaProximoServicio).toLocaleDateString() : ''
        };
      });

      // Crear el libro de trabajo de Excel
      const libro = XLSX.utils.book_new();
      const hoja = XLSX.utils.json_to_sheet(datosParaExportar);

      // Añadir la hoja al libro
      XLSX.utils.book_append_sheet(libro, hoja, 'Próximo Servicio');

      // Generar el archivo y descargarlo
      const fechaActual = new Date().toISOString().split('T')[0];
      let nombreArchivo = 'Reporte_Proximo_Servicio_' + fechaActual;
      
      // Agregar información de filtros al nombre si existen
      if (this.categoriaClienteSeleccionada) {
        nombreArchivo += '_' + this.categoriaClienteSeleccionada.replace(/\s+/g, '_');
      }
      
      if (this.fechaInicio && this.fechaFin) {
        nombreArchivo += '_' + this.fechaInicio + '_a_' + this.fechaFin;
      }
      
      nombreArchivo += '.xlsx';
      
      // Guardar el archivo
      XLSX.writeFile(libro, nombreArchivo);
      
      console.log('Archivo Excel generado exitosamente');
    } catch (error) {
      console.error('Error al generar el archivo Excel:', error);
      alert('Ocurrió un error al generar el reporte. Por favor, inténtelo de nuevo.');
    }
  }
}
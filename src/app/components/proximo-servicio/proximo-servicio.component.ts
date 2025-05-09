import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Equipos } from '../../interface/equipos.interface.ps';
import { ProximoServicioService } from '../../service/ProximoServicio/proximo-servicio.service';
import * as XLSX from 'xlsx';
import { EmailService } from '../../service/Email/email.service';

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

  // Nuevas variables para la selección y notificación
  equiposSeleccionados: Equipos[] = [];
  todosSeleccionados: boolean = false;
  enviandoNotificaciones: boolean = false;
  mensajeResultado: { tipo: 'exito' | 'error', mensaje: string } | null = null;

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

  // Variables para el modal de confirmación
  mostrarModalConfirmacion: boolean = false;
  equipoSeleccionado: Equipos | null = null;

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
    private proximoServicioService: ProximoServicioService,
    private emailService: EmailService
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

  // Método para seleccionar/deseleccionar todos los equipos
  seleccionarTodos(event: any): void {
    const isChecked = event.target.checked;
    this.todosSeleccionados = isChecked;
    
    if (isChecked) {
      // Seleccionar todos los equipos visibles en la página actual
      const equiposVisibles = this.equiposFiltrados.slice(
        (this.paginaActual - 1) * this.itemsPorPagina, 
        this.paginaActual * this.itemsPorPagina
      );
      
      // Añadir solo equipos que no estén ya seleccionados
      equiposVisibles.forEach(equipo => {
        if (!this.equiposSeleccionados.includes(equipo)) {
          this.equiposSeleccionados.push(equipo);
        }
      });
    } else {
      // Filtrar para quitar solo los equipos visibles actualmente
      const equiposVisibles = new Set(
        this.equiposFiltrados.slice(
          (this.paginaActual - 1) * this.itemsPorPagina, 
          this.paginaActual * this.itemsPorPagina
        )
      );
      
      this.equiposSeleccionados = this.equiposSeleccionados.filter(
        equipo => !equiposVisibles.has(equipo)
      );
    }
  }

  // Método para seleccionar/deseleccionar un equipo individual
  toggleSeleccion(equipo: Equipos): void {
    const index = this.equiposSeleccionados.findIndex(e => 
      e.referencia === equipo.referencia && e.serie === equipo.serie
    );
    
    if (index === -1) {
      this.equiposSeleccionados.push(equipo);
    } else {
      this.equiposSeleccionados.splice(index, 1);
    }
    
    // Actualizar el estado del checkbox "seleccionar todos"
    this.verificarTodosSeleccionados();
  }

  // Verificar si todos los equipos en la página actual están seleccionados
  verificarTodosSeleccionados(): void {
    const equiposVisibles = this.equiposFiltrados.slice(
      (this.paginaActual - 1) * this.itemsPorPagina, 
      this.paginaActual * this.itemsPorPagina
    );
    
    this.todosSeleccionados = equiposVisibles.length > 0 && 
      equiposVisibles.every(equipo => 
        this.equiposSeleccionados.some(e => 
          e.referencia === equipo.referencia && e.serie === equipo.serie
        )
      );
  }

  // Verificar si un equipo tiene email válido
  tieneEmailValido(equipo: Equipos): boolean {
    return typeof equipo.email === 'string' && equipo.email.trim() !== '' && this.validarEmail(equipo.email);
  }

  // Validar formato de email
  validarEmail(email: string): boolean {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email);
  }

  // Enviar notificación a un equipo individual
  enviarNotificacionIndividual(equipo: Equipos): void {
    this.mostrarConfirmacion(equipo);

  }

  // Enviar notificación a múltiples equipos seleccionados
  enviarNotificacionesMultiples(): void {
    if (this.equiposSeleccionados.length === 0) {
      this.mostrarMensaje('error', 'No hay equipos seleccionados');
      return;
    }
    
    const equiposConEmail = this.equiposSeleccionados.filter(equipo => this.tieneEmailValido(equipo));
    
    if (equiposConEmail.length === 0) {
      this.mostrarMensaje('error', 'Ninguno de los equipos seleccionados tiene email válido');
      return;
    }
    
    if (equiposConEmail.length < this.equiposSeleccionados.length) {
      this.mostrarMensaje('error', `Advertencia: ${this.equiposSeleccionados.length - equiposConEmail.length} equipos no tienen email válido y serán omitidos`);
    }
    
    this.enviandoNotificaciones = true;
    let completados = 0;
    let errores = 0;
    
    // Procesar cada equipo secuencialmente para evitar problemas de sobrecarga
    const procesarLote = (indice: number) => {
      if (indice >= equiposConEmail.length) {
        // Proceso completado
        this.enviandoNotificaciones = false;
        this.mostrarMensaje('exito', `Notificaciones enviadas: ${completados}. Errores: ${errores}`);
        return;
      }
      
      const equipo = equiposConEmail[indice];
      
      this.emailService.enviarAlertaEquipo(equipo.planta, equipo.referencia, equipo.email)
        .subscribe({
          next: () => {
            completados++;
            setTimeout(() => procesarLote(indice + 1), 300); // Pequeña pausa entre envíos
          },
          error: () => {
            errores++;
            setTimeout(() => procesarLote(indice + 1), 300);
          }
        });
    };
    
    procesarLote(0);
  }

  // Mostrar mensaje de resultado
  mostrarMensaje(tipo: 'exito' | 'error', mensaje: string): void {
    this.mensajeResultado = { tipo, mensaje };
    setTimeout(() => this.mensajeResultado = null, 5000);
  }

  // Método para mostrar el modal de confirmación
  mostrarConfirmacion(equipo: Equipos): void {
    if (!this.tieneEmailValido(equipo)) {
      this.mostrarMensaje('error', 'El equipo no tiene una dirección de correo válida');
      return;
    }
    
    this.equipoSeleccionado = equipo;
    this.mostrarModalConfirmacion = true;
  }
    
  // Método para cancelar el envío
  cancelarEnvio(): void {
      this.mostrarModalConfirmacion = false;
      this.equipoSeleccionado = null;
  }

  // Método para confirmar y enviar la notificación
  confirmarEnvio(): void {
        if (!this.equipoSeleccionado) return;
      
        const equipo = this.equipoSeleccionado;
        this.mostrarModalConfirmacion = false;
        
        this.enviandoNotificaciones = true;
        
        // Usar el nuevo método con todos los parámetros necesarios
        this.emailService.enviarAlertaEquipo(
          equipo.planta,
          equipo.referencia, 
          equipo.email,
          equipo.tipoEquipo,
          equipo.serie,
          equipo.fechaProximoServicio || undefined
        )
          .subscribe({
            next: (response) => {
              this.mostrarMensaje('exito', `Notificación enviada a: ${equipo.email}`);
              this.enviandoNotificaciones = false;
            },
            error: (error) => {
              this.mostrarMensaje('error', `Error al enviar notificación: ${error.message}`);
              this.enviandoNotificaciones = false;
            }
          });
          
        // Limpiar la referencia después de enviar
        this.equipoSeleccionado = null;
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
    this.verificarTodosSeleccionados();
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

  getPaginasVisibles(): number[] {
    const paginas: number[] = [];
    const totalPaginas = this.totalPaginas;
    const paginaActual = this.paginaActual;
    
    // Mostrar 5 páginas alrededor de la actual
    const inicio = Math.max(paginaActual - 2, 1);
    const fin = Math.min(paginaActual + 2, totalPaginas);
    
    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    
    return paginas;
  }

  mostrarElipsis(posicion: 'antes' | 'despues'): boolean {
    if (this.totalPaginas <= 7) return false;
    
    if (posicion === 'antes') {
      return this.paginaActual > 4;
    } else {
      return this.paginaActual < this.totalPaginas - 3;
    }
  }

  esPaginaVisible(pagina: number): boolean {
    // Primera y última página siempre visibles
    if (pagina === 1 || pagina === this.totalPaginas) return true;
    
    // Páginas cercanas a la actual (±2)
    if (Math.abs(this.paginaActual - pagina) <= 2) return true;
    
    return false;
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
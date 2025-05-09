import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmailService } from '../../service/Email/email.service';
import { Equipos } from '../../interface/equipos.interface.fs';

@Component({
  selector: 'app-email-alertas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './email-alertas.component.html',
  styleUrls: ['./email-alertas.component.scss']
})
export class EmailAlertasComponent implements OnInit, OnChanges {
  @Input() clienteSeleccionado: string | null = null;
  @Input() localSeleccionado: string | null = null;
  @Input() equipoSeleccionado: string | null = null;
  @Input() equipos: Equipos[] = [];

  datosDebug: any = null;

  diasAnticipacion: number = 7;
  correoPrueba: string = '';
  enviandoCorreo: boolean = false;
  mensajeResultado: { tipo: 'exito' | 'error', mensaje: string } | null = null;
  mostrarFormularioPrueba: boolean = false;
  
  // Nuevas propiedades para manejar los emails
  emailEquipoSeleccionado: string | null = null;
  emailsDestino: string[] = [];

  constructor(private emailService: EmailService) {}

  ngOnInit() {
    this.actualizarEmailsDestino();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Actualizar cuando cambia el equipo seleccionado o la lista de equipos
    if (changes['equipoSeleccionado'] || changes['equipos'] || changes['localSeleccionado']) {
      this.actualizarEmailsDestino();
    }
  }

  /**
   * Actualiza los emails de destino basados en la selección actual
   */
  actualizarEmailsDestino(): void {
    console.log("Actualizando emails de destino. Equipos disponibles:", this.equipos.length);
    
    // Caso 1: Si hay un equipo seleccionado, buscar su email
    if (this.equipoSeleccionado && this.equipos.length > 0) {
      console.log("Buscando email para equipo seleccionado:", this.equipoSeleccionado);
      
      const equipoEncontrado = this.equipos.find(e => 
        e.serie === this.equipoSeleccionado || 
        e.referencia === this.equipoSeleccionado
      );
      
      console.log("Equipo encontrado:", equipoEncontrado);
      
      if (equipoEncontrado?.email) {
        this.emailEquipoSeleccionado = equipoEncontrado.email;
        this.correoPrueba = equipoEncontrado.email;
        console.log("Email encontrado:", this.emailEquipoSeleccionado);
      } else {
        console.warn("No se encontró email para el equipo seleccionado");
      }
    }
    
    // Caso 2: Si hay un local seleccionado, recopilar emails de todos los equipos del local
    else if (this.localSeleccionado && this.equipos.length > 0) {
      const emailsUnicos = new Set<string>();
      
      this.equipos.forEach(equipo => {
        if (equipo.local === this.localSeleccionado && equipo.email && equipo.email.trim() !== '') {
          emailsUnicos.add(equipo.email);
        }
      });
      
      this.emailsDestino = Array.from(emailsUnicos);
    }
    
    // Caso 3: Si solo hay un cliente seleccionado, recopilar todos los emails
    else if (this.clienteSeleccionado && this.equipos.length > 0) {
      const emailsUnicos = new Set<string>();
      
      this.equipos.forEach(equipo => {
        if (equipo.email && equipo.email.trim() !== '') {
          emailsUnicos.add(equipo.email);
        }
      });
      
      this.emailsDestino = Array.from(emailsUnicos);
    }
    
    // Si no hay emails disponibles, resetear
    if (this.emailsDestino.length === 0 && !this.emailEquipoSeleccionado) {
      this.correoPrueba = '';
    }
  }

  enviarAlertasEquipos(): void {
    if (!this.clienteSeleccionado) {
      this.mostrarError('Debe seleccionar un cliente primero');
      return;
    }
    
    if (this.emailsDestino.length === 0) {
      this.mostrarError('No hay direcciones de correo disponibles para este cliente');
      return;
    }

    this.enviandoCorreo = true;
    this.emailService.enviarAlertasEquipos(this.clienteSeleccionado, this.diasAnticipacion)
      .subscribe({
        next: (response) => {
          this.mostrarExito(`Alertas enviadas correctamente a ${this.emailsDestino.length} contactos. ${response.equiposRevisados} equipos revisados.`);
          this.enviandoCorreo = false;
        },
        error: (error) => {
          this.mostrarError('Error al enviar alertas: ' + (error.error?.error || error.message));
          this.enviandoCorreo = false;
        }
      });
  }

  enviarAlertasLocal(): void {
    if (!this.clienteSeleccionado || !this.localSeleccionado) {
      this.mostrarError('Debe seleccionar un cliente y un local primero');
      return;
    }
    
    if (this.emailsDestino.length === 0) {
      this.mostrarError('No hay direcciones de correo disponibles para este local');
      return;
    }

    this.enviandoCorreo = true;
    this.emailService.enviarAlertasLocal(this.localSeleccionado, this.clienteSeleccionado, this.diasAnticipacion)
      .subscribe({
        next: (response) => {
          this.mostrarExito(`Alertas enviadas correctamente a ${this.emailsDestino.length} contactos para ${this.localSeleccionado}. ${response.equiposRevisados} equipos revisados.`);
          this.enviandoCorreo = false;
        },
        error: (error) => {
          this.mostrarError('Error al enviar alertas: ' + (error.error?.error || error.message));
          this.enviandoCorreo = false;
        }
      });
  }

  enviarAlertaEquipo(): void {
    if (!this.localSeleccionado || !this.equipoSeleccionado) {
      this.mostrarError('Debe seleccionar un local y un equipo primero');
      return;
    }
    
    if (!this.emailEquipoSeleccionado) {
      this.mostrarError('No hay dirección de correo disponible para este equipo');
      return;
    }
  
    // Buscar el equipo para obtener sus datos completos
    const equipoEncontrado = this.equipos.find(e => 
      e.serie === this.equipoSeleccionado || 
      e.referencia === this.equipoSeleccionado
    );

    if (!equipoEncontrado) {
      this.mostrarError('No se encontraron los datos completos del equipo');
      return;
    }
  
    this.enviandoCorreo = true;
    
    // Convertir la fecha a string si existe
    const fechaProximaStr = equipoEncontrado.fechaProximoServicio 
      ? typeof equipoEncontrado.fechaProximoServicio === 'string'
        ? equipoEncontrado.fechaProximoServicio
        : new Date(equipoEncontrado.fechaProximoServicio).toISOString().split('T')[0]
      : undefined;
    
    // Enviar todos los datos necesarios
    this.emailService.enviarAlertaEquipo(
      this.localSeleccionado, 
      this.equipoSeleccionado,
      this.emailEquipoSeleccionado,
      equipoEncontrado.tipoEquipo,
      equipoEncontrado.serie,
      fechaProximaStr
    )
      .subscribe({
        next: (response) => {
          this.mostrarExito(`Alerta enviada correctamente para el equipo ${this.equipoSeleccionado} al correo ${this.emailEquipoSeleccionado}`);
          this.enviandoCorreo = false;
        },
        error: (error) => {
          this.mostrarError('Error al enviar alerta: ' + (error.error?.error || error.message));
          this.enviandoCorreo = false;
        }
      });
  }

  enviarPruebaCorreo(): void {
    // Si no se ingresó un correo manualmente y tenemos uno del equipo, usamos ese
    const emailAUsar = this.correoPrueba || this.emailEquipoSeleccionado;
    
    if (!emailAUsar || !this.validarEmail(emailAUsar)) {
      this.mostrarError('Debe ingresar un correo electrónico válido');
      return;
    }

    this.enviandoCorreo = true;
    this.emailService.enviarCorreoPrueba(emailAUsar)
      .subscribe({
        next: (response) => {
          this.mostrarExito(`Correo de prueba enviado correctamente a ${emailAUsar}`);
          this.enviandoCorreo = false;
        },
        error: (error) => {
          this.mostrarError('Error al enviar correo de prueba: ' + (error.error?.error || error.message));
          this.enviandoCorreo = false;
        }
      });
  }

  verificarDatosEquipo(): void {
    if (this.equipoSeleccionado) {
      const equipoEncontrado = this.equipos.find(e => 
        e.serie === this.equipoSeleccionado || 
        e.referencia === this.equipoSeleccionado
      );
      
      this.datosDebug = equipoEncontrado ? {
        serie: equipoEncontrado.serie,
        referencia: equipoEncontrado.referencia,
        email: equipoEncontrado.email,
        tipoEquipo: equipoEncontrado.tipoEquipo,
        local: equipoEncontrado.local
      } : { error: "Equipo no encontrado en datos cargados" };
    } else {
      this.datosDebug = { error: "No hay equipo seleccionado" };
    }
  }

  private validarEmail(email: string): boolean {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email);
  }

  private mostrarExito(mensaje: string): void {
    this.mensajeResultado = { tipo: 'exito', mensaje };
    setTimeout(() => this.mensajeResultado = null, 5000);
  }

  private mostrarError(mensaje: string): void {
    this.mensajeResultado = { tipo: 'error', mensaje };
    setTimeout(() => this.mensajeResultado = null, 5000);
  }

  toggleFormularioPrueba(): void {
    this.mostrarFormularioPrueba = !this.mostrarFormularioPrueba;
  }
}
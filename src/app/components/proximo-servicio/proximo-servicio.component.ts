import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-proximo-servicio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './proximo-servicio.component.html',
  styleUrl: './proximo-servicio.component.scss'
})
export class ProximoServicioComponent {

  equipoSeleccionado: any = null;

  clientes = [
    {
      nombre: 'EQUIPOS CON PRÓXIMO SERVICIO',
      subclientes: [
        {
          nombre: 'CITY TEX S.A.C',
          subclientes: [
            {
              nombre: 'Planta Santa Anita',
              subclientes: [
                { nombre: 'Atlas Copco - G11 P', proximoServicio: this.parseDate('06/12/2024') },
                { nombre: 'Atlas Copco - G12 P', proximoServicio: this.parseDate('10/12/2024') },
                { nombre: 'Atlas Copco - G13 P', proximoServicio: this.parseDate('15/12/2024') },
                { nombre: 'Atlas Copco - G14 P', proximoServicio: this.parseDate('20/12/2024') },
                { nombre: 'Atlas Copco - G15 P', proximoServicio: this.parseDate('25/12/2024') },
                { nombre: 'Atlas Copco - G16 P', proximoServicio: this.parseDate('30/12/2024') },
                { nombre: 'Atlas Copco - G17 P', proximoServicio: this.parseDate('05/01/2025') },
              ]
            }
          ]
        },
        { nombre: 'BISAGRAS PERUANAS S.A.C.', subclientes: [] },
        { nombre: 'ARANGO VALLEJOS NORMA', subclientes: [] }
      ]
    }
  ];

  equipos = [
    {
      cliente: 'CITY TEX S.A.C',
      planta: 'Planta Santa Anita',
      equipo: 'ATLAS COPO',
      modelo: 'G 15 VSID+',
      serie: 'G11 P',
      recomendacion: 'Cambio de aceite y filtro',
      recomendacionHoras: 2000,
      ultimoServicio: new Date(2024, 5, 6),
      proximoServicio: new Date(2024, 11, 6),
      horasTrabajadasXdia: 10,
      horasTrabajo: 23000, 
      estado: 'Operativo 🟢'
    },
    {
      cliente: 'CITY TEX S.A.C',
      planta: 'Planta Santa Anita',
      equipo: 'ATLAS COPO',
      modelo: 'G 15 VSID+',
      serie: 'G12 P',
      recomendacion: 'Cambio de válvulas',
      recomendacionHoras: 2000,
      ultimoServicio: new Date(2024, 5, 10),
      proximoServicio: new Date(2024, 11, 10),
      horasTrabajadasXdia: 10,
      horasTrabajo: 18000,
      estado: 'Mantenimiento Preventivo ⚠️'
    },
    {
      cliente: 'CITY TEX S.A.C',
      planta: 'Planta Santa Anita',
      equipo: 'ATLAS COPO',
      modelo: 'G 15 VSID+',
      serie: 'G13 P',
      recomendacion: 'Revisión general',
      recomendacionHoras: 2000,
      ultimoServicio: new Date(2024, 5, 15),
      proximoServicio: new Date(2024, 11, 15),
      horasTrabajadasXdia: 10,
      horasTrabajo: 24000,
      estado: 'Mantenimiento Crítico 🔴'
    },
    {
      cliente: 'BISAGRAS PERUANAS S.A.C.',
      planta: 'Planta Callao',
      equipo: 'ATLAS COPO',
      modelo: 'G 15 VSID+',
      serie: 'G14 P',
      recomendacion: 'Cambio de filtros de aire',
      recomendacionHoras: 1500,
      ultimoServicio: new Date(2024, 4, 20),
      proximoServicio: new Date(2024, 10, 20),
      horasTrabajadasXdia: 12,
      horasTrabajo: 21000,
      estado: 'Operativo 🟢'
    },
    {
      cliente: 'ARANGO VALLEJOS NORMA',
      planta: 'Planta Arequipa',
      equipo: 'ATLAS COPO',
      modelo: 'G 15 VSID+',
      serie: 'G15 P',
      recomendacion: 'Revisión de correas y lubricación',
      recomendacionHoras: 2500,
      ultimoServicio: new Date(2024, 3, 12),
      proximoServicio: new Date(2024, 9, 12),
      horasTrabajadasXdia: 9,
      horasTrabajo: 17500,
      estado: 'Mantenimiento Preventivo ⚠️'
    },
    {
      cliente: 'CITY TEX S.A.C',
      planta: 'Planta Santa Anita',
      equipo: 'ATLAS COPO',
      modelo: 'G 15 VSID+',
      serie: 'G16 P',
      recomendacion: 'Cambio de aceite y ajuste de válvulas',
      recomendacionHoras: 2000,
      ultimoServicio: new Date(2024, 5, 30),
      proximoServicio: new Date(2024, 11, 30),
      horasTrabajadasXdia: 11,
      horasTrabajo: 22000,
      estado: 'Operativo 🟢'
    },
    {
      cliente: 'BISAGRAS PERUANAS S.A.C.',
      planta: 'Planta Callao',
      equipo: 'ATLAS COPO',
      modelo: 'G 15 VSID+',
      serie: 'G17 P',
      recomendacion: 'Inspección de motor y sensores',
      recomendacionHoras: 2000,
      ultimoServicio: new Date(2024, 6, 5),
      proximoServicio: new Date(2024, 12, 5),
      horasTrabajadasXdia: 10,
      horasTrabajo: 19000,
      estado: 'Mantenimiento Preventivo ⚠️'
    }
  ];

  parseDate(dateString: string): Date {
    const [day, month, year] = dateString.split('/').map(Number);
    return new Date(year, month - 1, day);
  }

  seleccionarEquipo(equipoSeleccionado: any) {
    const equipoEncontrado = this.equipos.find(e => e.serie === equipoSeleccionado.nombre.split('- ')[1]);
    if (equipoEncontrado) {
      this.equipoSeleccionado = equipoEncontrado;
    }
  }
}

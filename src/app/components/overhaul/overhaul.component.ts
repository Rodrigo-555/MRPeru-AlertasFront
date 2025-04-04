import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-overhaul',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './overhaul.component.html',
  styleUrl: './overhaul.component.scss'
})
export class OverhaulComponent {

  equipoSeleccionado: any = null;

  clientes = [
    {
      nombre: 'EQUIPOS PRÓXIMOS A OVERHOAL',
      subclientes: [
        {
          nombre: 'CITY TEX S.A.C',
          subclientes: [
            {
              nombre: 'Planta Santa Anita',
              subclientes: [
                { nombre: 'Atlas Copco - G11 P' },
                { nombre: 'Atlas Copco - G12 P'},
                { nombre: 'Atlas Copco - G13 P' },
                { nombre: 'Atlas Copco - G14 P' },
                { nombre: 'Atlas Copco - G15 P' },
                { nombre: 'Atlas Copco - G16 P' },
                { nombre: 'Atlas Copco - G17 P' },
              ]
            }
          ]
        },
      ]
    }
  ];

  equipos = [
    {
      cliente: 'CITY TEX S.A.C',
      overhoal: 'Si 🟢',
      equipo: 'ATLAS COPO',
      modelo: 'G 15 VSID+',
      serie: 'G11 P',
      recomendacion: 'Cambio de aceite y filtro',
      recomendacionHoras: '24,000',
      ultimoServicio: new Date(2024, 5, 6),
      proximoServicio: new Date(2024, 11, 6),
      horasTrabajadasXdia: 24,
      horasTrabajo: 57600, 
      estado: 'Mantenimiento Preventivo ⚠️'
    },
    {
      cliente: 'CITY TEX S.A.C',
      overhoal: 'Si 🟢',
      equipo: 'ATLAS COPO',
      modelo: 'G 15 VSID+',
      serie: 'G12 P',
      recomendacion: 'Cambio de válvulas',
      recomendacionHoras: '24,000',
      ultimoServicio: new Date(2024, 5, 10),
      proximoServicio: new Date(2024, 11, 10),
      horasTrabajadasXdia: 10,
      horasTrabajo: '24,400', 
      estado: 'Mantenimiento Preventivo ⚠️'
    },
    {
      cliente: 'CITY TEX S.A.C',
      overhoal: 'Si 🟢',
      equipo: 'ATLAS COPO',
      modelo: 'G 15 VSID+',
      serie: 'G13 P',
      recomendacion: 'Revisión general',
      recomendacionHoras: '24,000',
      ultimoServicio: new Date(2024, 5, 15),
      proximoServicio: new Date(2024, 11, 15),
      horasTrabajadasXdia: 10,
      horasTrabajo: '76,400', 
      estado: 'Mantenimiento Crítico 🔴'
    },
    {
      cliente: 'CITY TEX S.A.C',
      overhoal: 'Si 🟢',
      equipo: 'ATLAS COPO',
      modelo: 'G 15 VSID+',
      serie: 'G14 P',
      recomendacion: 'Cambio de filtros de aire',
      recomendacionHoras: '24,000',
      ultimoServicio: new Date(2024, 4, 20),
      proximoServicio: new Date(2024, 10, 20),
      horasTrabajadasXdia: 12,
      horasTrabajo: '50,400', 
      estado: 'Mantenimiento Preventivo ⚠️'
    },
    {
      cliente: 'CITY TEX S.A.C',
      overhoal: 'No 🔴',
      equipo: 'ATLAS COPO',
      modelo: 'G 15 VSID+',
      serie: 'G15 P',
      recomendacion: 'Revisión de correas y lubricación',
      recomendacionHoras: '24,000',
      ultimoServicio: new Date(2024, 3, 12),
      proximoServicio: new Date(2024, 9, 12),
      horasTrabajadasXdia: 9,
      horasTrabajo: '18,400', 
      estado: 'Mantenimiento Preventivo ⚠️'
    },
    {
      cliente: 'CITY TEX S.A.C',
      overhoal: 'Si 🟢',
      equipo: 'ATLAS COPO',
      modelo: 'G 15 VSID+',
      serie: 'G16 P',
      recomendacion: 'Cambio de aceite y ajuste de válvulas',
      recomendacionHoras: '24,000',
      ultimoServicio: new Date(2024, 5, 30),
      proximoServicio: new Date(2024, 11, 30),
      horasTrabajadasXdia: 11,
      horasTrabajo: '66,400', 
      estado: 'Mantenimiento Preventivo ⚠️'
    },
    {
      cliente: 'CITY TEX S.A.C',
      overhoal: 'No 🔴',
      equipo: 'ATLAS COPO',
      modelo: 'G 15 VSID+',
      serie: 'G17 P',
      recomendacion: 'Inspección de motor y sensores',
      recomendacionHoras: '24,000',
      ultimoServicio: new Date(2024, 6, 5),
      proximoServicio: new Date(2024, 12, 5),
      horasTrabajadasXdia: 10,
      horasTrabajo: '90,400', 
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

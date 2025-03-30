import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-frecuencia-servicios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './frecuencia-servicios.component.html',
  styleUrl: './frecuencia-servicios.component.scss'
})
export class FrecuenciaServiciosComponent {

  clientes = [
    {
      nombre: 'CLIENTES REGULARES',
      subclientes: [
        {
          nombre: 'CITY TEX S.A.C',
          subclientes: [
            {
            nombre: 'Planta Santa Anita',
            subclientes: [

            { nombre: 'Atlas Copco - G11 P' },
            { nombre: 'Atlas Copco - G12 P' },
            { nombre: 'Atlas Copco - G13 P' },
            { nombre: 'Atlas Copco - G14 P' },
            { nombre: 'Atlas Copco - G15 P' },
            { nombre: 'Atlas Copco - G16 P' },
            { nombre: 'Atlas Copco - G17 P' },
          ]
          }]
        },
        { nombre: 'BISAGRAS PERUANAS S.A.C.', subclientes: [] },
        { nombre: 'ARANGO VALLEJOS NORMA', subclientes: [] }
      ]
    }
  ];
}

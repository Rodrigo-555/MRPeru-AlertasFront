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
          "nombre": "CLIENTES REGULARES",
          "subclientes": [
              {
                  "nombre": "CITY TEX S.A.C",
                  "subclientes": [
                      {
                          "nombre": "Planta Santa Anita",
                          "subclientes": [
                              { "nombre": "Atlas Copco - G11 P" },
                              { "nombre": "Atlas Copco - G12 P" },
                              { "nombre": "Atlas Copco - G13 P" },
                              { "nombre": "Atlas Copco - G14 P" },
                              { "nombre": "Atlas Copco - G15 P" },
                              { "nombre": "Atlas Copco - G16 P" },
                              { "nombre": "Atlas Copco - G17 P" }
                          ]
                      }
                  ]
              },
              {
                  "nombre": "BISAGRAS PERUANAS S.A.C.",
                  "subclientes": [
                      {
                          "nombre": "Planta Callao",
                          "subclientes": [
                              { "nombre": "Atlas Copco - X1" },
                              { "nombre": "Atlas Copco - X2" }
                          ]
                      }
                  ]
              },
              {
                  "nombre": "ARANGO VALLEJOS NORMA",
                  "subclientes": [
                      {
                          "nombre": "Planta Surco",
                          "subclientes": [
                              { "nombre": "Atlas Copco - Z1" },
                              { "nombre": "Atlas Copco - Z2" }
                          ]
                      }
                  ]
              }
          ]
      },
      {
          "nombre": "CLIENTES NO-REGULARES",
          "subclientes": [
              {
                  "nombre": "INDUSTRIAS DEL SUR S.A.",
                  "subclientes": [
                      {
                          "nombre": "Planta Arequipa",
                          "subclientes": [
                              { "nombre": "Atlas Copco - A1" },
                              { "nombre": "Atlas Copco - A2" }
                          ]
                      }
                  ]
              },
              {
                  "nombre": "TEXTILES ANDINOS S.A.",
                  "subclientes": [
                      {
                          "nombre": "Planta Trujillo",
                          "subclientes": [
                              { "nombre": "Atlas Copco - B1" },
                              { "nombre": "Atlas Copco - B2" }
                          ]
                      }
                  ]
              },
              {
                  "nombre": "MECÁNICA INDUSTRIAL PERÚ",
                  "subclientes": [
                      {
                          "nombre": "Planta Lima",
                          "subclientes": [
                              { "nombre": "Atlas Copco - C1" },
                              { "nombre": "Atlas Copco - C2" }
                          ]
                      }
                  ]
              }
          ]
      },
      {
          "nombre": "CLIENTES ANTIGUOS-RECIENTES",
          "subclientes": [
              {
                  "nombre": "COMPAÑÍA TEXTIL LIMA S.A.",
                  "subclientes": [
                      {
                          "nombre": "Planta Cercado de Lima",
                          "subclientes": [
                              { "nombre": "Atlas Copco - D1" },
                              { "nombre": "Atlas Copco - D2" }
                          ]
                      }
                  ]
              },
              {
                  "nombre": "CONFECCIONES DEL NORTE",
                  "subclientes": [
                      {
                          "nombre": "Planta Piura",
                          "subclientes": [
                              { "nombre": "Atlas Copco - E1" },
                              { "nombre": "Atlas Copco - E2" }
                          ]
                      }
                  ]
              },
              {
                  "nombre": "EQUIPOS INDUSTRIALES S.A.C.",
                  "subclientes": [
                      {
                          "nombre": "Planta Cusco",
                          "subclientes": [
                              { "nombre": "Atlas Copco - F1" },
                              { "nombre": "Atlas Copco - F2" }
                          ]
                      }
                  ]
              }
          ]
      }
  ];
}

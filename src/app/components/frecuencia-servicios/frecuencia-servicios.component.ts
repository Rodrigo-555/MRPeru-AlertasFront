import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ClienteNode, ClientesData } from '../../interface/clientes.interface';

@Component({
  selector: 'app-frecuencia-servicios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './frecuencia-servicios.component.html',
  styleUrl: './frecuencia-servicios.component.scss'
})
export class FrecuenciaServiciosComponent implements OnInit {


    clienteNodes: any[] = [];
    clientesData!: ClienteNode[];

    ngOnInit(): void {
        fetch('/assets/json/clientes-data.json')
            .then((response) => response.json())
            .then((data: ClientesData) => {
                this.clientesData = data.clientes;
                this.clienteNodes = this.clientesData.map(cliente => ({ ...cliente }));
            })
            .catch(error => console.error('Error fetching data:', error));
    }
}

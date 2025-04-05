export interface ClienteNode {
    nombre: string;
    subclientes?: ClienteNode[];
  }
  
  export interface ClientesData {
    clientes: ClienteNode[];
  }
  
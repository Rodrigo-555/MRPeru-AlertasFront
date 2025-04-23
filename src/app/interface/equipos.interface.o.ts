export interface PlantasData {
    plantas: Planta[];
  }

  export interface Planta {
    nombre: string;
    equipos: Equipos[];
  }

  export interface Equipos {
    cliente: string;
    referencia:string;
    serie: string;
    estado: string;
    estado_mantenimiento: string;
    fecha_notificacion: string;

    frecuenciaServicio?: string;
    fechaUltimoServicio?: string;
    fechaProximoServicio?: string;
    horometroUltimoServicio?: string;
  }
  
  
  
  
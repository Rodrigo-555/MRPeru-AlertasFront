export interface Equipos {
  cliente: string;
  planta: string; 
  referencia: string;
  serie: string;
  estado: string;
  estadoMantenimiento: string;
  fechaProximoServicio: string | null; 
}

export interface EquiposPorPlanta {
  cliente: string;
  plantas: Planta[];
}

export interface Planta {
  nombre: string;
  equipos: Equipos[];
}

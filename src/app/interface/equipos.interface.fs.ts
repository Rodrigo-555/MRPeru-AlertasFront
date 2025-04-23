export interface Equipos {
  local: string;
  contacto: string;
  email: string;
  fechaProximoServicio?: Date;
  referencia:string;
  estado: string;
  estadoMantenimiento: string;
}

export interface Planta {
  nombre: string;
  equipos: Equipos[];
}

export interface PlantasData {
  plantas: Planta[];
}
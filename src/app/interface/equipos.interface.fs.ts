export interface Equipos {
  contacto: string;
  email: string;
  fechaEnvio: string;
  referencia:string;
  estado: string;
  estado_mantenimiento: string;
}

export interface Planta {
  nombre: string;
  equipos: Equipos[];
}

export interface PlantasData {
  plantas: Planta[];
}
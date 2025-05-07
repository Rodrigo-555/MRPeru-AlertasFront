export interface Equipos {
  local: string;
  contacto: string;
  email: string;
  fechaProximoServicio?: Date;
  referencia: string;
  modelo: string;
  serie: string;
  horometro?: number;
  horometroUltimoServicio?: number;  // Asegúrate de que este campo existe
  tipoEquipo: string;
  estado: string;
  estadoMantenimiento: string;
  // Campos adicionales para cálculos internos (no se mostrarán en la UI)
  horasDeTrabajo?: number;
  frecuenciaServicio?: string;
  ultimaFechaServicio?: Date;
}

export interface Planta {
  nombre: string;
  equipos: Equipos[];
}

export interface PlantasData {
  plantas: Planta[];
}
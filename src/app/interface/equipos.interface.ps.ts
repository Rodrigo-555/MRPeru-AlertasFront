export interface Equipos {
  cliente: string;
  planta: string; 
  referencia: string;
  serie: string;
  modelo: string;
  tipoEquipo: string;
  estado: string;
  estadoMantenimiento: string;
  fechaProximoServicio: string | null; 
}
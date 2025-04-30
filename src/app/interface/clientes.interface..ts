import { Locales } from "./locales.interface";

export interface Cliente {
    nombre: string;
    locales?: Locales[];
    ruc?: string;
  } 
  

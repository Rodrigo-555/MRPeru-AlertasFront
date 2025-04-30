import { Locales } from "./locales.interface";

export interface Cliente {
    contacto: any;
    nombre: string;
    locales?: Locales[];
    ruc?: string;
  } 
  

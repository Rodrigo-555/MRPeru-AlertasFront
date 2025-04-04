import { Routes } from '@angular/router';
import { MenuComponent } from './components/menu/menu.component';
import { FrecuenciaServiciosComponent } from './components/frecuencia-servicios/frecuencia-servicios.component';
import { ProximoServicioComponent } from './components/proximo-servicio/proximo-servicio.component';
import { OverhaulComponent } from './components/overhaul/overhaul.component';

export const routes: Routes = [

{
    path: '', 
    component: MenuComponent, 
    children: [
        {
            path: "frecuenciaServicios", 
            component: FrecuenciaServiciosComponent,
        },
        {
            path: 'proximoServicio',
            component: ProximoServicioComponent,
        },
        {
            path: 'overhaul',
            component: OverhaulComponent,
        }
    ],

}
    


];

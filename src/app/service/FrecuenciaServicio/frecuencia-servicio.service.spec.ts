import { TestBed } from '@angular/core/testing';

import { FrecuenciaServicioService } from './frecuencia-servicio.service';

describe('ProximoServicioService', () => {
  let service: FrecuenciaServicioService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FrecuenciaServicioService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

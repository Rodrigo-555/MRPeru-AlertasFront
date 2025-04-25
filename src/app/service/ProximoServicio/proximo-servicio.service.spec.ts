import { TestBed } from '@angular/core/testing';

import { ProximoServicioService } from './proximo-servicio.service';

describe('ProximoServicioService', () => {
  let service: ProximoServicioService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProximoServicioService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

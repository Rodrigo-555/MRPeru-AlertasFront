import { TestBed } from '@angular/core/testing';

import { EquiposServiceService } from './equipos-service.service';

describe('EquiposServiceService', () => {
  let service: EquiposServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EquiposServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

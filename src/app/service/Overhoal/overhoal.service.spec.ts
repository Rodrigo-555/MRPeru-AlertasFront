import { TestBed } from '@angular/core/testing';

import { OverhoalService } from './overhoal.service';

describe('OverhoalService', () => {
  let service: OverhoalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OverhoalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

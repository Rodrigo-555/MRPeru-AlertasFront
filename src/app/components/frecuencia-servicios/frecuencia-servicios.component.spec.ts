import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FrecuenciaServiciosComponent } from './frecuencia-servicios.component';

describe('FrecuenciaServiciosComponent', () => {
  let component: FrecuenciaServiciosComponent;
  let fixture: ComponentFixture<FrecuenciaServiciosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FrecuenciaServiciosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FrecuenciaServiciosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

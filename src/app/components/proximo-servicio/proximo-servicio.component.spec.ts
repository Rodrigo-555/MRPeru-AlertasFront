import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProximoServicioComponent } from './proximo-servicio.component';

describe('ProximoServicioComponent', () => {
  let component: ProximoServicioComponent;
  let fixture: ComponentFixture<ProximoServicioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProximoServicioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProximoServicioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

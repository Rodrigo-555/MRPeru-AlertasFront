import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OverhaulComponent } from './overhaul.component';

describe('OverhaulComponent', () => {
  let component: OverhaulComponent;
  let fixture: ComponentFixture<OverhaulComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OverhaulComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OverhaulComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

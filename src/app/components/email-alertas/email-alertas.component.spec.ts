import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmailAlertasComponent } from './email-alertas.component';

describe('EmailAlertasComponent', () => {
  let component: EmailAlertasComponent;
  let fixture: ComponentFixture<EmailAlertasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmailAlertasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmailAlertasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

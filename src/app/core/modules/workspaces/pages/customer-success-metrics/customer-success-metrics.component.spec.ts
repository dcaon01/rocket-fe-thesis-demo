import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomerSuccessMetricsComponent } from './customer-success-metrics.component';

describe('CustomerSuccessMetricsComponent', () => {
  let component: CustomerSuccessMetricsComponent;
  let fixture: ComponentFixture<CustomerSuccessMetricsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerSuccessMetricsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomerSuccessMetricsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

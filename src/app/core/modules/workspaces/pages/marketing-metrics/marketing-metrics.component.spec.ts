import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MarketingMetricsComponent } from './marketing-metrics.component';

describe('MarketingMetricsComponent', () => {
  let component: MarketingMetricsComponent;
  let fixture: ComponentFixture<MarketingMetricsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarketingMetricsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MarketingMetricsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

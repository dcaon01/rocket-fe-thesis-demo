import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WebsiteMetricsComponent } from './website-metrics.component';

describe('WebsiteMetricsComponent', () => {
  let component: WebsiteMetricsComponent;
  let fixture: ComponentFixture<WebsiteMetricsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WebsiteMetricsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WebsiteMetricsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

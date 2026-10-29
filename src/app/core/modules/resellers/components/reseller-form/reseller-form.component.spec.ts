import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResellerFormComponent } from './reseller-form.component';

describe('ResellerFormComponent', () => {
  let component: ResellerFormComponent;
  let fixture: ComponentFixture<ResellerFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResellerFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResellerFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

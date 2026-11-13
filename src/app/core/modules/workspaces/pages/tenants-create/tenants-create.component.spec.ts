import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TenantsCreateComponent } from './tenants-create.component';

describe('TenantsCreateComponent', () => {
  let component: TenantsCreateComponent;
  let fixture: ComponentFixture<TenantsCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantsCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TenantsCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

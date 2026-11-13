import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompaniesCreateComponent } from './companies-create.component';

describe('CompaniesCreateComponent', () => {
  let component: CompaniesCreateComponent;
  let fixture: ComponentFixture<CompaniesCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompaniesCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompaniesCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

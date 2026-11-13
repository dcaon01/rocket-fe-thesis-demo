import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompaniesEditComponent } from './companies-edit.component';

describe('CompaniesEditComponent', () => {
  let component: CompaniesEditComponent;
  let fixture: ComponentFixture<CompaniesEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompaniesEditComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompaniesEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

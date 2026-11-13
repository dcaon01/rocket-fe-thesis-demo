import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResellersEditComponent } from './resellers-edit.component';

describe('ResellersEditComponent', () => {
  let component: ResellersEditComponent;
  let fixture: ComponentFixture<ResellersEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResellersEditComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResellersEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

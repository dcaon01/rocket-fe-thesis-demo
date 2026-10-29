import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResellersCreateComponent } from './resellers-create.component';

describe('ResellersCreateComponent', () => {
  let component: ResellersCreateComponent;
  let fixture: ComponentFixture<ResellersCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResellersCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResellersCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

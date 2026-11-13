import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResellersTransferComponent } from './resellers-transfer.component';

describe('ResellersTransferComponent', () => {
  let component: ResellersTransferComponent;
  let fixture: ComponentFixture<ResellersTransferComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResellersTransferComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResellersTransferComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResellersTiersComponent } from './resellers-tiers.component';

describe('ResellersTiersComponent', () => {
  let component: ResellersTiersComponent;
  let fixture: ComponentFixture<ResellersTiersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResellersTiersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResellersTiersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

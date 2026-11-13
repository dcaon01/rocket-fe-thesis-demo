import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CollaboratorsCreateComponent } from './collaborators-create.component';

describe('CollaboratorsCreateComponent', () => {
  let component: CollaboratorsCreateComponent;
  let fixture: ComponentFixture<CollaboratorsCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollaboratorsCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CollaboratorsCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

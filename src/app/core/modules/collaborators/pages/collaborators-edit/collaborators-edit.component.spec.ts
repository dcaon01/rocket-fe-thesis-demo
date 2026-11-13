import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CollaboratorsEditComponent } from './collaborators-edit.component';

describe('CollaboratorsEditComponent', () => {
  let component: CollaboratorsEditComponent;
  let fixture: ComponentFixture<CollaboratorsEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollaboratorsEditComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CollaboratorsEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

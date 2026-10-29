import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CollaboratorFormComponent } from './collaborator-form.component';

describe('CollaboratorFormComponent', () => {
  let component: CollaboratorFormComponent;
  let fixture: ComponentFixture<CollaboratorFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollaboratorFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CollaboratorFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

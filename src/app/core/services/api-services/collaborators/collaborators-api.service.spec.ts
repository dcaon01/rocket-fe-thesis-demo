import { TestBed } from '@angular/core/testing';

import { CollaboratorsApiService } from './collaborators-api.service';

describe('CollaboratorsApiService', () => {
  let service: CollaboratorsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CollaboratorsApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

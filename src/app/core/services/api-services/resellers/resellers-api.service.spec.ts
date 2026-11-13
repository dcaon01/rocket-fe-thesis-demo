import { TestBed } from '@angular/core/testing';

import { ResellersApiService } from './resellers-api.service';

describe('ResellersApiService', () => {
  let service: ResellersApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ResellersApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';

import { CompaniesApiService } from './companies-api.service';

describe('CompaniesApiService', () => {
  let service: CompaniesApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CompaniesApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

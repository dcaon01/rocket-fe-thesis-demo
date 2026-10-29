import { TestBed } from '@angular/core/testing';

import { TenantsApiService } from './tenants-api.service';

describe('TenantsApiService', () => {
  let service: TenantsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TenantsApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

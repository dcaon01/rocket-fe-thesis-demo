import { TestBed } from '@angular/core/testing';

import { HubspotApiService } from './hubspot-api.service';

describe('HubspotApiService', () => {
  let service: HubspotApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HubspotApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

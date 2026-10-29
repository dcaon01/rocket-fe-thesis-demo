import { TestBed } from '@angular/core/testing';

import { CustomAttributesFormService } from './custom-attributes-form.service';

describe('CustomAttributesFormService', () => {
  let service: CustomAttributesFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomAttributesFormService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

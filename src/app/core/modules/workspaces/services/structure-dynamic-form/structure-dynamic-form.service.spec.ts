import { TestBed } from '@angular/core/testing';

import { StructureDynamicFormService } from './structure-dynamic-form.service';

describe('StructureDynamicFormService', () => {
  let service: StructureDynamicFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StructureDynamicFormService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

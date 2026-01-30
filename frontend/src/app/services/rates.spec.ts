import { TestBed } from '@angular/core/testing';

import { Rates } from './rates';

describe('Rates', () => {
  let service: Rates;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Rates);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

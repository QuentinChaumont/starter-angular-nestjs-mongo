import { TestBed } from '@angular/core/testing';
import { API_BASE_URL, provideApiBaseUrl } from './api-base-url';

describe('API_BASE_URL', () => {
  it('defaults to "/api"', () => {
    expect(TestBed.inject(API_BASE_URL)).toBe('/api');
  });

  it('provideApiBaseUrl overrides it and strips a trailing slash', () => {
    TestBed.configureTestingModule({
      providers: [provideApiBaseUrl('http://localhost:3000/api/')],
    });
    expect(TestBed.inject(API_BASE_URL)).toBe('http://localhost:3000/api');
  });
});

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LegalLinks } from './legal-links.component';

describe('LegalLinks', () => {
  function render() {
    TestBed.configureTestingModule({
      imports: [LegalLinks],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(LegalLinks);
    fixture.detectChanges();
    return fixture;
  }

  it('links to the three legal pages and credits the author', () => {
    const el = render().nativeElement as HTMLElement;
    const hrefs = Array.from(el.querySelectorAll('a')).map((a) =>
      a.getAttribute('href'),
    );

    expect(hrefs).toEqual(
      expect.arrayContaining([
        '/legal/notice',
        '/legal/privacy',
        '/legal/cookies',
        'https://www.linkedin.com/in/quentin-chmt/',
      ]),
    );
    expect(el.textContent).toContain('Quentin Chaumont');
  });
});

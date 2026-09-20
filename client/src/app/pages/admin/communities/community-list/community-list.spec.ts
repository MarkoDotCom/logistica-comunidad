import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ALL_PERMISSIONS, provideSessionWith } from '../../../../core/session.testing';
import { provideRouter } from '@angular/router';
import { CommunityList } from './community-list';

describe('CommunityList', () => {
  it('should list the root communities linking to their page', async () => {
    await TestBed.configureTestingModule({ imports: [CommunityList], providers: [provideSessionWith(ALL_PERMISSIONS), provideRouter([]), provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CommunityList);
    await fixture.whenStable();
    http.expectOne((r) => r.urlWithParams.endsWith('/units')).flush([{ id: 'c', parentId: null, kind: 'community', code: 'los-alamos', name: 'Los Álamos', deletedAt: null, childrenCount: 2 }]);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.unit-level__toolbar button')?.textContent).toContain('Nueva comunidad');
    expect(el.querySelector('tbody a.unit-level__link')?.getAttribute('href')).toBe('/admin/comunidades/c');
    expect([...el.querySelectorAll('thead th')].map((th) => th.textContent)).toContain('Edificios');
    http.verify();
  });
});

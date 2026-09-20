import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { UnitDetail } from '../../../../core/units.api';
import { ApartmentDetail } from './apartment-detail';

const DETAIL: UnitDetail = {
  id: 'a101', parentId: 'a', kind: 'apartment', code: '101', name: null, deletedAt: null,
  ancestors: [
    { id: 'c', parentId: null, kind: 'community', code: 'los-alamos', name: 'Los Álamos', deletedAt: null },
    { id: 'a', parentId: 'c', kind: 'building', code: 'A', name: 'Torre A', deletedAt: null },
  ],
  children: [{ id: 'gc', parentId: 'a101', kind: 'account', code: 'GC', name: 'Gastos comunes', deletedAt: null, childrenCount: 0 }],
  contracts: [
    { id: 'k3', type: 'lease', startsAt: '2099-01-01', endsAt: null, user: { id: 'u9', fullName: 'Futura Persona', email: 'f@example.com' } },
    { id: 'k2', type: 'lease', startsAt: '2020-01-01', endsAt: '2020-12-31', user: { id: 'u4', fullName: 'Carla Muñoz', email: 'carla@example.com' } },
    { id: 'k1', type: 'ownership', startsAt: '2019-06-15', endsAt: null, user: { id: 'u2', fullName: 'Ana Rojas', email: 'ana@example.com' } },
  ],
};

describe('ApartmentDetail', () => {
  it('should show the path, current owners and tenants, accounts and every contract with its status', async () => {
    await TestBed.configureTestingModule({ imports: [ApartmentDetail], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ApartmentDetail);
    fixture.componentRef.setInput('id', 'a101');
    await fixture.whenStable();
    http.expectOne((r) => r.url.endsWith('/units/a101/detail')).flush(DETAIL);
    await fixture.whenStable();
    http.expectOne((r) => r.urlWithParams.endsWith('/units?parentId=a101')).flush(DETAIL.children);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect([...el.querySelectorAll('.ui-breadcrumb__item')].map((i) => i.textContent?.trim())).toEqual(['Comunidades', 'Los Álamos', 'Torre A', 'Departamento 101']);
    expect(el.querySelector('.ui-breadcrumb a[href="/admin/comunidades/c/edificios/a"]')).not.toBeNull();
    const facts = el.querySelector('.detail__facts')!.textContent!;
    expect(facts).toContain('Ana Rojas');
    expect(facts).toContain('Sin arriendo vigente'); // el de Carla venció, el otro es futuro

    expect(el.querySelector('app-unit-level .unit-level__toolbar button')?.textContent).toContain('Nueva cuenta');
    expect(el.querySelector('app-unit-level tbody')?.textContent).toContain('Gastos comunes');

    const statuses = [...el.querySelectorAll('app-unit-contracts tbody tr td:last-child')].map((td) => td.textContent?.trim());
    expect(statuses).toEqual(['Futuro', 'Vencido', 'Vigente']);
    http.verify();
  });
});

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Breadcrumb } from './breadcrumb';

@Component({
  imports: [Breadcrumb],
  template: `<ui-breadcrumb [items]="[{ label: 'Comunidades', link: ['/admin/comunidades'] }, { label: 'Los Álamos', link: ['/admin/comunidades', 'c'] }, { label: 'Torre A' }]" />`,
})
class Host {}

describe('Breadcrumb', () => {
  it('should link every item but the current one', async () => {
    await TestBed.configureTestingModule({ imports: [Host], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelectorAll('.ui-breadcrumb__item')).toHaveLength(3);
    expect([...el.querySelectorAll('a')].map((a) => a.textContent)).toEqual(['Comunidades', 'Los Álamos']);
    expect(el.querySelector('[aria-current="page"]')?.textContent).toBe('Torre A');
  });
});

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SectionHeader } from './section-header';

@Component({
  imports: [SectionHeader],
  template: `<ui-section-header heading="Experiencia" />`,
})
class Host {}

describe('SectionHeader', () => {
  it('should render the heading without a native title attribute', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const header = (fixture.nativeElement as HTMLElement).querySelector('ui-section-header')!;

    expect(header.querySelector('h2')?.textContent).toBe('Experiencia');
    expect(header.hasAttribute('title')).toBe(false);
  });
});

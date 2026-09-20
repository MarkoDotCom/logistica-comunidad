import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dialog } from './dialog';
import { polyfillDialog } from './dialog.testing';

@Component({
  imports: [Dialog],
  template: `<ui-dialog [(open)]="open"><p>Contenido</p></ui-dialog>`,
})
class Host {
  readonly open = signal(false);
}

describe('Dialog', () => {
  beforeAll(polyfillDialog);

  it('should open as modal with [(open)] and close from the × button or the backdrop', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const dialog = (fixture.nativeElement as HTMLElement).querySelector<HTMLDialogElement>('dialog')!;

    expect(dialog.open).toBe(false);
    host.open.set(true);
    await fixture.whenStable();
    expect(dialog.open).toBe(true);

    dialog.querySelector<HTMLButtonElement>('.ui-dialog__close')!.click();
    await fixture.whenStable();
    expect(host.open()).toBe(false);
    expect(dialog.open).toBe(false);

    host.open.set(true);
    await fixture.whenStable();
    dialog.querySelector('p')!.click();
    expect(host.open()).toBe(true);
    dialog.click();
    expect(host.open()).toBe(false);
  });

  it('should sync [(open)] when the dialog closes by itself (Escape)', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const dialog = (fixture.nativeElement as HTMLElement).querySelector<HTMLDialogElement>('dialog')!;

    host.open.set(true);
    await fixture.whenStable();
    dialog.close();
    expect(host.open()).toBe(false);
  });
});

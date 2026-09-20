import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { Contract } from '../../../../core/contracts.api';
import type { Unit } from '../../../../core/units.api';
import { polyfillDialog } from '../../../../shared/ui/dialog/dialog.testing';
import { UnitContracts } from './unit-contracts';

const COMMUNITY: Unit = { id: 'c', parentId: null, kind: 'community', code: 'los-alamos', name: 'Los Álamos', deletedAt: null };
const CONTRACT: Contract = {
  id: 'k1', unitId: 'c', type: 'administration', startsAt: '2024-03-01', endsAt: null, documentUrl: null, notes: null,
  user: { id: 'u1', fullName: 'Marcela Soto', email: 'admin@losalamos.example.com' },
};

describe('UnitContracts', () => {
  beforeAll(polyfillDialog);

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [UnitContracts], providers: [provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
  });

  async function render(unit: Unit, contracts: Contract[]) {
    const fixture = TestBed.createComponent(UnitContracts);
    fixture.componentRef.setInput('unit', unit);
    fixture.componentRef.setInput('contracts', contracts);
    await fixture.whenStable();
    return fixture;
  }

  it('should list contracts with Modificar, open the wizards and emit changed when they close', async () => {
    const fixture = await render(COMMUNITY, [CONTRACT]);
    const el = fixture.nativeElement as HTMLElement;
    let changed = 0;
    fixture.componentInstance.changed.subscribe(() => changed++);

    expect(el.querySelector('tbody tr')?.textContent).toContain('Marcela Soto');
    el.querySelector<HTMLButtonElement>('tbody .ui-table__actions button')!.click();
    await fixture.whenStable();
    expect(el.querySelector('app-contract-wizard')?.textContent).toContain('Vas a modificar el contrato de Marcela Soto');

    el.querySelectorAll<HTMLDialogElement>('dialog')[1].querySelector<HTMLButtonElement>('.ui-dialog__close')!.click();
    await fixture.whenStable();
    expect(changed).toBe(1);
    expect(el.querySelector('app-contract-wizard')).toBeNull();

    el.querySelector<HTMLButtonElement>('.unit-contracts__toolbar button')!.click();
    await fixture.whenStable();
    expect(el.querySelector('app-contract-wizard')?.textContent).toContain('Vas a crear un contrato sobre Los Álamos');
  });

  it('should hide the alta button for accounts and deleted units', async () => {
    const account = await render({ ...COMMUNITY, id: 'gc', kind: 'account', code: 'GC' }, []);
    expect((account.nativeElement as HTMLElement).querySelector('.unit-contracts__toolbar')).toBeNull();
    expect((account.nativeElement as HTMLElement).textContent).toContain('No hay contratos');

    const deleted = await render({ ...COMMUNITY, deletedAt: '2026-09-01T00:00:00.000Z' }, []);
    expect((deleted.nativeElement as HTMLElement).querySelector('.unit-contracts__toolbar')).toBeNull();
  });
});

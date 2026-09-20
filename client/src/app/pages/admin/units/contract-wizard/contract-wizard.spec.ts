import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { Contract } from '../../../../core/contracts.api';
import type { Unit } from '../../../../core/units.api';
import { ContractWizard } from './contract-wizard';

const COMMUNITY: Unit = { id: 'c', parentId: null, kind: 'community', code: 'los-alamos', name: 'Los Álamos', deletedAt: null };
const BRUNO = { id: 'u3', email: 'bruno.diaz@example.com', externalAuthId: null, fullName: 'Bruno Díaz', phone: null, isActive: true };
const EXISTING: Contract = {
  id: 'k1', unitId: 'c', type: 'administration', startsAt: '2024-03-01', endsAt: null, documentUrl: null, notes: null,
  user: { id: 'u1', fullName: 'Marcela Soto', email: 'admin@losalamos.example.com' },
};

describe('ContractWizard', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ContractWizard], providers: [provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function render(unit: Unit, contract: Contract | null = null) {
    const fixture = TestBed.createComponent(ContractWizard);
    fixture.componentRef.setInput('unit', unit);
    fixture.componentRef.setInput('contract', contract);
    await fixture.whenStable();
    return fixture;
  }

  function setValue(el: HTMLElement, name: string, value: string) {
    const input = el.querySelector<HTMLInputElement>(`[formControlName="${name}"]`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  it('should search a person, offer only the types of the unit kind and POST the new contract', async () => {
    const fixture = await render(COMMUNITY);
    const el = fixture.nativeElement as HTMLElement;
    const buttons = () => Array.from(el.querySelectorAll<HTMLButtonElement>('.ui-card__actions button'));
    const next = () => buttons().at(-1)!;
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => (closed = true));

    expect(el.textContent).toContain('Tipos posibles aquí: administración, empleo');
    next().click();
    await fixture.whenStable();
    expect(next().disabled).toBe(true); // sin persona

    const search = el.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = 'bru';
    search.dispatchEvent(new Event('input'));
    http.expectOne((r) => r.urlWithParams.endsWith('/users?search=bru')).flush([BRUNO]);
    await fixture.whenStable();
    el.querySelector<HTMLButtonElement>('.contract-wizard__result')!.click();
    await fixture.whenStable();
    expect(el.querySelector('.contract-wizard__selected')?.textContent).toContain('Bruno Díaz');
    next().click();
    await fixture.whenStable();

    expect([...el.querySelectorAll<HTMLOptionElement>('[formControlName="type"] option')].map((o) => o.value)).toEqual(['administration', 'employment']);
    const type = el.querySelector<HTMLSelectElement>('[formControlName="type"]')!;
    type.value = 'employment';
    type.dispatchEvent(new Event('change'));
    setValue(el, 'startsAt', '2026-02-01');
    setValue(el, 'endsAt', '2025-01-01');
    await fixture.whenStable();
    expect(el.textContent).toContain('El término no puede ser anterior al inicio');
    expect(next().disabled).toBe(true);
    setValue(el, 'endsAt', '2026-07-31');
    setValue(el, 'notes', ' Jardinería ');
    await fixture.whenStable();
    next().click();
    await fixture.whenStable();

    expect(el.textContent).toContain('Empleo');
    next().click();
    const post = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/units/c/contracts'));
    expect(post.request.body).toEqual({ userId: 'u3', type: 'employment', startsAt: '2026-02-01', endsAt: '2026-07-31', documentUrl: undefined, notes: 'Jardinería' });
    post.flush({ ...EXISTING, id: 'k9', type: 'employment', startsAt: '2026-02-01', endsAt: '2026-07-31', notes: 'Jardinería', user: { id: 'u3', fullName: 'Bruno Díaz', email: BRUNO.email } });
    await fixture.whenStable();
    expect(el.textContent).toContain('Contrato creado');
    buttons()[0].click();
    expect(closed).toBe(true);
  });

  it('should prefill an existing contract and PATCH only the changed fields, showing API errors', async () => {
    const fixture = await render(COMMUNITY, EXISTING);
    const el = fixture.nativeElement as HTMLElement;
    const next = () => Array.from(el.querySelectorAll<HTMLButtonElement>('.ui-card__actions button')).at(-1)!;

    expect(el.textContent).toContain('Vas a modificar el contrato de Marcela Soto');
    next().click();
    await fixture.whenStable();
    expect(el.querySelector('.contract-wizard__selected')?.textContent).toContain('Marcela Soto');
    next().click();
    await fixture.whenStable();
    setValue(el, 'endsAt', '2026-12-31');
    await fixture.whenStable();
    next().click();
    await fixture.whenStable();
    next().click();

    const patch = http.expectOne((r) => r.method === 'PATCH' && r.url.endsWith('/contracts/k1'));
    expect(patch.request.body).toEqual({ endsAt: '2026-12-31' });
    patch.flush({ message: 'La fecha de término no puede ser anterior a la de inicio' }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();
    expect(el.querySelector('.ui-form__error')?.textContent).toContain('no puede ser anterior');
  });

  it('should block contracts on an account', async () => {
    const fixture = await render({ ...COMMUNITY, id: 'gc', kind: 'account', code: 'GC' });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Una cuenta no admite contratos');
    expect(el.querySelector<HTMLButtonElement>('.ui-card__actions button')!.disabled).toBe(true);
  });
});

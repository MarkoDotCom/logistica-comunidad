import { TestBed } from '@angular/core/testing';
import { type ActivatedRouteSnapshot, provideRouter, type RouterStateSnapshot, UrlTree } from '@angular/router';
import { permissionGuard, sessionGuard } from './session.guard';
import { Session } from './session';
import { fakeSession } from './session.testing';

const route = {} as ActivatedRouteSnapshot;
const state = { url: '/admin/roles' } as RouterStateSnapshot;

describe('guards', () => {
  it('sessionGuard should pass with a session, try to restore it, and otherwise go to /login with returnUrl', async () => {
    const session = fakeSession(['units.read']);
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: Session, useValue: session }] });
    expect(await TestBed.runInInjectionContext(() => sessionGuard(route, state))).toBe(true);

    session.user.set(null);
    vi.spyOn(session, 'restore').mockResolvedValue(false);
    const result = (await TestBed.runInInjectionContext(() => sessionGuard(route, state))) as UrlTree;
    expect(result.toString()).toBe('/login?returnUrl=%2Fadmin%2Froles');
  });

  it('permissionGuard should pass with the permission and otherwise redirect to the first allowed section', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: Session, useValue: fakeSession(['units.read']) }] });
    expect(TestBed.runInInjectionContext(() => permissionGuard('units.read')(route, state))).toBe(true);
    const redirect = TestBed.runInInjectionContext(() => permissionGuard('roles.read')(route, state)) as UrlTree;
    expect(redirect.toString()).toBe('/admin/comunidades');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: Session, useValue: fakeSession([]) }] });
    const none = TestBed.runInInjectionContext(() => permissionGuard('units.read')(route, state)) as UrlTree;
    expect(none.toString()).toBe('/admin/sin-acceso');
  });
});

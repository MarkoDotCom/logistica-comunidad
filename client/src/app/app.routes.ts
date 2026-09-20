import { Routes } from '@angular/router';
import { permissionGuard, sessionGuard } from './core/session.guard';
import { Admin } from './pages/admin/admin';
import { Login } from './pages/login/login';

// Todo vive bajo /admin con sesión; cada sección exige su permiso (core/sections.ts). Los :id llegan como inputs.
export const routes: Routes = [
  { path: '', redirectTo: 'admin', pathMatch: 'full' },
  { path: 'login', component: Login },
  {
    path: 'admin',
    component: Admin,
    canActivate: [sessionGuard],
    children: [
      { path: '', pathMatch: 'full', canActivate: [permissionGuard('summary.read')], loadComponent: () => import('./pages/admin/home/home').then((m) => m.Home) },
      { path: 'sin-acceso', loadComponent: () => import('./pages/admin/no-access/no-access').then((m) => m.NoAccess) },
      { path: 'comunidades', canActivate: [permissionGuard('units.read')], loadComponent: () => import('./pages/admin/communities/community-list/community-list').then((m) => m.CommunityList) },
      { path: 'comunidades/:id', canActivate: [permissionGuard('units.read')], loadComponent: () => import('./pages/admin/communities/community-detail/community-detail').then((m) => m.CommunityDetail) },
      {
        path: 'comunidades/:communityId/edificios/:id',
        canActivate: [permissionGuard('units.read')],
        loadComponent: () => import('./pages/admin/communities/building-detail/building-detail').then((m) => m.BuildingDetail),
      },
      { path: 'departamentos/:id', canActivate: [permissionGuard('units.read')], loadComponent: () => import('./pages/admin/apartments/apartment-detail/apartment-detail').then((m) => m.ApartmentDetail) },
      { path: 'unidades', canActivate: [permissionGuard('units.read')], loadComponent: () => import('./pages/admin/units/unit-tree/unit-tree').then((m) => m.UnitTree) },
      { path: 'usuarios', canActivate: [permissionGuard('users.read')], loadComponent: () => import('./pages/admin/users/user-list/user-list').then((m) => m.UserList) },
      { path: 'roles', canActivate: [permissionGuard('roles.read')], loadComponent: () => import('./pages/admin/roles/role-list/role-list').then((m) => m.RoleList) },
      { path: 'roles/:id', canActivate: [permissionGuard('roles.read')], loadComponent: () => import('./pages/admin/roles/role-detail/role-detail').then((m) => m.RoleDetail) },
    ],
  },
  { path: '**', redirectTo: 'admin' },
];

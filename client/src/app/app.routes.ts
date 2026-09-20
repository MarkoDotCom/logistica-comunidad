import { Routes } from '@angular/router';
import { Admin } from './pages/admin/admin';

// Todo vive bajo /admin; las páginas se cargan bajo demanda.
export const routes: Routes = [
  { path: '', redirectTo: 'admin', pathMatch: 'full' },
  {
    path: 'admin',
    component: Admin,
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./pages/admin/home/home').then((m) => m.Home) },
      { path: 'usuarios', loadComponent: () => import('./pages/admin/users/user-list/user-list').then((m) => m.UserList) },
      { path: 'unidades', loadComponent: () => import('./pages/admin/units/unit-tree/unit-tree').then((m) => m.UnitTree) },
    ],
  },
  { path: '**', redirectTo: 'admin' },
];

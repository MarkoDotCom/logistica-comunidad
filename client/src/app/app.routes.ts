import { Routes } from '@angular/router';
import { Admin } from './pages/admin/admin';

// Todo vive bajo /admin; las páginas se cargan bajo demanda. Los :id llegan como inputs (withComponentInputBinding).
export const routes: Routes = [
  { path: '', redirectTo: 'admin', pathMatch: 'full' },
  {
    path: 'admin',
    component: Admin,
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./pages/admin/home/home').then((m) => m.Home) },
      { path: 'comunidades', loadComponent: () => import('./pages/admin/communities/community-list/community-list').then((m) => m.CommunityList) },
      { path: 'comunidades/:id', loadComponent: () => import('./pages/admin/communities/community-detail/community-detail').then((m) => m.CommunityDetail) },
      {
        path: 'comunidades/:communityId/edificios/:id',
        loadComponent: () => import('./pages/admin/communities/building-detail/building-detail').then((m) => m.BuildingDetail),
      },
      { path: 'departamentos/:id', loadComponent: () => import('./pages/admin/apartments/apartment-detail/apartment-detail').then((m) => m.ApartmentDetail) },
      { path: 'unidades', loadComponent: () => import('./pages/admin/units/unit-tree/unit-tree').then((m) => m.UnitTree) },
      { path: 'usuarios', loadComponent: () => import('./pages/admin/users/user-list/user-list').then((m) => m.UserList) },
    ],
  },
  { path: '**', redirectTo: 'admin' },
];

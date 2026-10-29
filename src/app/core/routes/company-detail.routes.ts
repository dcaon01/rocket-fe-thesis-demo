import { Routes } from '@angular/router';
import { CAPABILITY_PROFILES } from '../constants/profiles';
import { Capability } from '../enums/capability.enum';
import { profileGuard } from '../guards/profile.guard';

/** Way back from a tenant or user of the company to its detail, three segments up. */
const BACK_TO_COMPANY = '../../..';

/**
 * Routes of the detail of a company, mounted under companies/edit/:companyId both in the global area and in the
 * reseller workspace. Tenants and users belong to the company and open from its detail (UR-RK-291), reusing the
 * pages of the product workspace: the product travels in the path, as the pages read it from there.
 */
export const companyDetailRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('../modules/companies/pages/companies-edit/companies-edit.component').then(m => m.CompaniesEditComponent),
  },
  {
    path: 'tenants/:productId/:tenantId',
    data: { label: 'Dettaglio tenant', back: BACK_TO_COMPANY },
    canActivate: [profileGuard(CAPABILITY_PROFILES[Capability.ViewTenants])],
    loadComponent: () => import('../modules/workspaces/pages/tenants-edit/tenants-edit.component').then(m => m.TenantsEditComponent),
  },
  {
    path: 'users/:productId/create',
    data: { label: 'Crea utente', back: BACK_TO_COMPANY },
    canActivate: [profileGuard(CAPABILITY_PROFILES[Capability.ManageUsers])],
    loadComponent: () => import('../modules/workspaces/pages/users-create/users-create.component').then(m => m.UsersCreateComponent),
  },
  {
    path: 'users/:productId/:userId',
    data: { label: 'Dettaglio utente', back: BACK_TO_COMPANY },
    canActivate: [profileGuard(CAPABILITY_PROFILES[Capability.ViewUsers])],
    loadComponent: () => import('../modules/workspaces/pages/users-edit/users-edit.component').then(m => m.UsersEditComponent),
  },
];

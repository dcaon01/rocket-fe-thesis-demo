import { Routes } from '@angular/router';
import { Profile } from '../enums/profile.enum';
import { notSelfGuard } from '../guards/not-self.guard';
import { profileGuard } from '../guards/profile.guard';
import { companyDetailRoutes } from './company-detail.routes';

/** Profiles working on the orders and materials of a reseller, Keus side and reseller side. */
const RESELLER_OPERATIONS = [
  Profile.KeusAdmin,
  Profile.KeusSales,
  Profile.KeusBackoffice,
  Profile.ResellerOwner,
  Profile.ResellerBackoffice,
  Profile.ResellerSales,
];

/**
 * Routes of the reseller workspace, mounted under /resellers/workspaces/:resellerId.
 * Same mechanics as the product workspace: from the resellers list you step
 * into the perimeter of one of them.
 *
 * Two doors lead here. A Keus collaborator enters from the resellers list to
 * look at a reseller; a reseller user is taken here at sign-in and never
 * leaves. Which reseller they may open is decided by the account type and, on
 * the server, by the reseller scoping.
 */
export const resellerWorkspaceRoutes: Routes = [
  // Landing page: every profile of the workspace has the dashboard.
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'dashboard',
    data: { label: 'Dashboard' },
    canActivate: [profileGuard([
      Profile.KeusAdmin, Profile.KeusSales, Profile.KeusBackoffice, Profile.KeusAccounting,
      Profile.ResellerOwner, Profile.ResellerBackoffice, Profile.ResellerSales,
    ])],
    loadComponent: () => import('../modules/reseller-workspace/pages/reseller-dashboard/reseller-dashboard.component').then(m => m.ResellerDashboardComponent),
  },
  {
    path: 'orders',
    data: { label: 'Ordini' },
    canActivate: [profileGuard(RESELLER_OPERATIONS)],
    children: [
      {
        path: '',
        loadComponent: () => import('../modules/reseller-workspace/pages/reseller-orders/reseller-orders.component').then(m => m.ResellerOrdersComponent),
      },
      {
        path: 'create',
        data: { label: 'Nuovo ordine' },
        canActivate: [profileGuard([
          Profile.KeusAdmin, Profile.KeusSales, Profile.ResellerOwner, Profile.ResellerBackoffice, Profile.ResellerSales,
        ])],
        loadComponent: () => import('../modules/orders/pages/orders-create/orders-create.component').then(m => m.OrdersCreateComponent),
      },
      {
        path: ':orderId',
        data: { label: 'Dettaglio ordine' },
        loadComponent: () => import('../modules/orders/pages/orders-detail/orders-detail.component').then(m => m.OrdersDetailComponent),
      },
      {
        path: ':orderId/provision/:productId',
        data: { label: 'Erogazione' },
        canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusBackoffice, Profile.ResellerOwner, Profile.ResellerBackoffice])],
        loadComponent: () => import('../modules/orders/pages/orders-provision/orders-provision.component').then(m => m.OrdersProvisionComponent),
      },
    ]
  },
  {
    path: 'companies',
    data: { label: 'Aziende' },
    canActivate: [profileGuard([
      Profile.KeusAdmin, Profile.KeusBackoffice, Profile.ResellerOwner, Profile.ResellerBackoffice, Profile.ResellerSales,
    ])],
    children: [
      {
        path: '',
        loadComponent: () => import('../modules/companies/pages/companies/companies.component').then(m => m.CompaniesComponent),
      },
      {
        path: 'create',
        data: { label: 'Crea azienda' },
        canActivate: [profileGuard([Profile.ResellerOwner, Profile.ResellerBackoffice, Profile.ResellerSales])],
        loadComponent: () => import('../modules/companies/pages/companies-create/companies-create.component').then(m => m.CompaniesCreateComponent),
      },
      {
        path: 'edit/:companyId',
        data: { label: 'Dettaglio azienda' },
        children: companyDetailRoutes,
      },
    ]
  },
  {
    path: 'products',
    data: { label: 'Prodotti abilitati' },
    canActivate: [profileGuard([
      Profile.KeusAdmin, Profile.KeusSales, Profile.KeusBackoffice,
      Profile.ResellerOwner, Profile.ResellerBackoffice, Profile.ResellerSales,
    ])],
    loadComponent: () => import('../modules/reseller-workspace/pages/reseller-enabled-products/reseller-enabled-products.component').then(m => m.ResellerEnabledProductsComponent),
  },
  {
    path: 'collaborators',
    data: { label: 'Collaboratori' },
    canActivate: [profileGuard([Profile.KeusAdmin, Profile.ResellerOwner])],
    children: [
      {
        path: '',
        loadComponent: () => import('../modules/collaborators/pages/collaborators/collaborators.component').then(m => m.CollaboratorsComponent),
      },
      {
        path: 'create',
        data: { label: 'Crea collaboratore' },
        loadComponent: () => import('../modules/collaborators/pages/collaborators-create/collaborators-create.component').then(m => m.CollaboratorsCreateComponent),
      },
      {
        path: 'edit/:collaboratorId',
        data: { label: 'Dettaglio collaboratore' },
        canActivate: [notSelfGuard('collaboratorId')],
        loadComponent: () => import('../modules/collaborators/pages/collaborators-edit/collaborators-edit.component').then(m => m.CollaboratorsEditComponent),
      },
    ]
  },
  {
    path: 'billing/invoices',
    data: { label: 'Fatture' },
    canActivate: [profileGuard([
      Profile.KeusAdmin, Profile.KeusAccounting, Profile.ResellerOwner, Profile.ResellerBackoffice,
    ])],
    loadComponent: () => import('../modules/reseller-workspace/pages/reseller-invoices/reseller-invoices.component').then(m => m.ResellerInvoicesComponent),
  },
  {
    path: 'billing/schedule',
    data: { label: 'Scadenziario' },
    canActivate: [profileGuard([
      Profile.KeusAdmin, Profile.KeusAccounting, Profile.ResellerOwner, Profile.ResellerBackoffice,
    ])],
    loadComponent: () => import('../modules/reseller-workspace/pages/reseller-payment-schedule/reseller-payment-schedule.component').then(m => m.ResellerPaymentScheduleComponent),
  },
  {
    path: 'billing/schedule/charges/new',
    data: { label: 'Nuova voce' },
    canActivate: [profileGuard([Profile.KeusAdmin, Profile.ResellerOwner, Profile.ResellerBackoffice])],
    loadComponent: () => import('../modules/reseller-workspace/pages/customer-charges-create/customer-charges-create.component').then(m => m.CustomerChargesCreateComponent),
  },
  {
    path: 'billing/schedule/charges/:chargeId',
    data: { label: 'Voce' },
    canActivate: [profileGuard([
      Profile.KeusAdmin, Profile.KeusAccounting, Profile.ResellerOwner, Profile.ResellerBackoffice,
    ])],
    loadComponent: () => import('../modules/reseller-workspace/pages/customer-charges-edit/customer-charges-edit.component').then(m => m.CustomerChargesEditComponent),
  },
  {
    path: 'materials',
    data: { label: 'Materiali' },
    canActivate: [profileGuard(RESELLER_OPERATIONS)],
    loadComponent: () => import('../modules/reseller-workspace/pages/reseller-materials/reseller-materials.component').then(m => m.ResellerMaterialsComponent),
  },
  {
    path: 'profile',
    data: { label: 'Scheda rivenditore' },
    canActivate: [profileGuard([
      Profile.KeusAdmin, Profile.KeusSales, Profile.KeusBackoffice, Profile.KeusAccounting,
      Profile.ResellerOwner, Profile.ResellerBackoffice,
    ])],
    loadComponent: () => import('../modules/reseller-workspace/pages/reseller-profile/reseller-profile.component').then(m => m.ResellerProfileComponent),
  },
];

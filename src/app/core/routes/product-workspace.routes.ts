import { Routes } from '@angular/router';
import { SHOW_WEBSITE_AND_MARKETING_METRICS } from '../constants/features';
import { Profile } from '../enums/profile.enum';
import { resellerScopeGuard } from '../guards/account-type.guard';
import { profileGuard } from '../guards/profile.guard';
import { CAPABILITY_PROFILES } from '../constants/profiles';
import { Capability } from '../enums/capability.enum';

/**
 * Routes of the product workspace, mounted under /products/workspaces/:productId.
 * Everything that belongs to a single product lives here: plans, trials,
 * companies, users and metrics.
 *
 * The urls stay relative: the parent route carries the product id, and the
 * context service reads it from the route tree rather than from the address.
 */
export const productWorkspaceRoutes: Routes = [
  // Redirect component to manage permission based redirections.
  {
    path: '',
    loadComponent: () => import('../modules/workspaces/components/redirection/redirection.component').then(m => m.RedirectionComponent),
  },
  // Product dashboard: same indicators as the global one, restricted here.
  {
    path: 'dashboard',
    data: { label: 'Dashboard' },
    canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusSales, Profile.KeusBackoffice, Profile.KeusAccounting])],
    loadComponent: () => import('../modules/workspaces/pages/product-dashboard/product-dashboard.component').then(m => m.ProductDashboardComponent),
  },
  {
    path: 'technical-metrics',
    data: { label: 'Tecniche' },
    canActivate: [profileGuard([Profile.KeusAdmin]), resellerScopeGuard],
    loadComponent: () => import('../modules/workspaces/pages/technical-metrics/technical-metrics.component').then(m => m.TechnicalMetricsComponent),
  },
  // Tenants
  {
    path: 'tenants',
    data: {
      label: 'Tenants'
    },
    canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusSales, Profile.KeusBackoffice, Profile.ResellerOwner, Profile.ResellerBackoffice, Profile.ResellerSales])],
    children: [
      {
        path: '',
        loadComponent: () => import('../modules/workspaces/pages/tenants/tenants.component').then(m => m.TenantsComponent),
      },
      {
        path: 'create',
        loadComponent: () => import('../modules/workspaces/pages/tenants-create/tenants-create.component').then(m => m.TenantsCreateComponent),
        canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusBackoffice])],
        data: {
          label: 'Crea tenant'
        },
      },
      {
        path: 'edit/:tenantId',
        loadComponent: () => import('../modules/workspaces/pages/tenants-edit/tenants-edit.component').then(m => m.TenantsEditComponent),
        data: {
          label: 'Dettaglio tenant'
        },
      },
    ]
  },
  // Users of the product
  {
    path: 'users',
    data: {
      label: 'Utenti'
    },
    canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusSales, Profile.KeusBackoffice, Profile.ResellerOwner, Profile.ResellerBackoffice, Profile.ResellerSales])],
    children: [
      {
        path: '',
        loadComponent: () => import('../modules/workspaces/pages/users/users.component').then(m => m.UsersComponent),
      },
      {
        path: 'create',
        loadComponent: () => import('../modules/workspaces/pages/users-create/users-create.component').then(m => m.UsersCreateComponent),
        canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusBackoffice, Profile.ResellerOwner, Profile.ResellerBackoffice])],
        data: {
          label: 'Crea utente'
        },
      },
      {
        path: 'edit/:userId',
        loadComponent: () => import('../modules/workspaces/pages/users-edit/users-edit.component').then(m => m.UsersEditComponent),
        data: {
          label: 'Dettaglio utente'
        },
      },
    ]
  },
  // Trials
  {
    path: 'trials',
    data: {
      label: 'Trial'
    },
    canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusBackoffice, Profile.KeusAccounting])],
    children: [
      {
        path: '',
        loadComponent: () => import('../modules/workspaces/pages/trials/trials.component').then(m => m.TrialsComponent),
      },
      {
        path: 'create',
        canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusBackoffice])],
        loadComponent: () => import('../modules/workspaces/pages/trials-create/trials-create.component').then(m => m.TrialsCreateComponent),
        data: {
          label: 'Crea trial'
        },
      },
      {
        path: 'edit/:trialId',
        loadComponent: () => import('../modules/workspaces/pages/trials-edit/trials-edit.component').then(m => m.TrialsEditComponent),
        data: {
          label: 'Dettaglio trial'
        },
      }
    ]
  },
  // Plans
  {
    path: 'plans',
    data: {
      label: 'Piani'
    },
    canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusSales, Profile.KeusBackoffice, Profile.KeusAccounting, Profile.ResellerOwner, Profile.ResellerBackoffice, Profile.ResellerSales])],
    children: [
      {
        path: '',
        loadComponent: () => import('../modules/workspaces/pages/plans/plans.component').then(m => m.PlansComponent),
      },
      {
        path: 'create',
        canActivate: [profileGuard([Profile.KeusAdmin])],
        loadComponent: () => import('../modules/workspaces/pages/plans-create/plans-create.component').then(m => m.PlansCreateComponent),
        data: {
          label: 'Crea piano'
        },
      },
      {
        path: 'edit/:planId',
        loadComponent: () => import('../modules/workspaces/pages/plans-edit/plans-edit.component').then(m => m.PlansEditComponent),
        data: {
          label: 'Dettaglio piano'
        },
      }
    ]
  },
  // Contracts
  {
    path: 'contracts',
    data: {
      label: 'Contratti'
    },
    canActivate: [profileGuard(CAPABILITY_PROFILES[Capability.ViewProductContracts])],
    children: [
      {
        path: '',
        loadComponent: () => import('../modules/workspaces/pages/contracts/contracts.component').then(m => m.ContractsComponent),
      },
      {
        path: ':contractId',
        loadComponent: () => import('../modules/workspaces/pages/contracts-detail/contracts-detail.component').then(m => m.ContractsDetailComponent),
        data: {
          label: 'Dettaglio contratto'
        },
      }
    ]
  },
  // Metrics
  {
    path: 'customer-success-metrics',
    data: {
      label: 'Customer success'
    },
    canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusBackoffice, Profile.KeusAccounting]), resellerScopeGuard],
    loadComponent: () => import('../modules/workspaces/pages/customer-success-metrics/customer-success-metrics.component').then(m => m.CustomerSuccessMetricsComponent),
  },
  // Sales Metrics
  {
    path: 'sales-metrics',
    data: {
      label: 'Vendita'
    },
    canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusAccounting, Profile.KeusSales]), resellerScopeGuard],
    loadComponent: () => import('../modules/workspaces/pages/sales-metrics/sales-metrics.component').then(m => m.SalesMetricsComponent),
  },
  // Product Metrics
  {
    path: 'product-metrics',
    data: {
      label: 'Prodotto'
    },
    canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusBackoffice, Profile.KeusAccounting]), resellerScopeGuard],
    loadComponent: () => import('../modules/workspaces/pages/product-metrics/product-metrics.component').then(m => m.ProductMetricsComponent),
  },
  ...(SHOW_WEBSITE_AND_MARKETING_METRICS ? [
    {
      path: 'website-metrics',
      data: {
        label: 'Sito web'
      },
      canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusBackoffice, Profile.KeusAccounting]), resellerScopeGuard],
      loadComponent: () => import('../modules/workspaces/pages/website-metrics/website-metrics.component').then(m => m.WebsiteMetricsComponent),
    },
    {
      path: 'marketing-metrics',
      data: {
        label: 'Marketing'
      },
      canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusBackoffice, Profile.KeusAccounting]), resellerScopeGuard],
      loadComponent: () => import('../modules/workspaces/pages/marketing-metrics/marketing-metrics.component').then(m => m.MarketingMetricsComponent),
    },
  ] : []),
];

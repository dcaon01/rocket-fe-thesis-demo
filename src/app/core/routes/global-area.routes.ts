import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { SHOW_WEBSITE_AND_MARKETING_METRICS } from '../constants/features';
import { AppArea } from '../enums/app-area.enum';
import { Profile } from '../enums/profile.enum';
import { resellerScopeGuard } from '../guards/account-type.guard';
import { notSelfGuard } from '../guards/not-self.guard';
import { profileGuard } from '../guards/profile.guard';
import { resellerHomeGuard, resellerOwnWorkspaceGuard } from '../guards/reseller-workspace.guard';
import { CAPABILITY_PROFILES } from '../constants/profiles';
import { Capability } from '../enums/capability.enum';
import { companyDetailRoutes } from './company-detail.routes';

/**
 * Routes of the global area, common to every product and every channel.
 * Holds the dashboard, the orders queue, the registries, the invoicing, the
 * configuration and the aggregated metrics.
 *
 * The product workspace hangs off /products, so it is declared here and loaded
 * from its own file.
 */
export const globalAreaRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    canActivate: [resellerHomeGuard],
    loadComponent: () => import('../modules/dashboard/pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    data: {
      label: 'Dashboard'
    }
  },
  // Global Metrics
  {
    path: 'global-customer-success-metrics',
    data: { label: 'Customer success' },
    canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusBackoffice, Profile.KeusAccounting]), resellerScopeGuard],
    loadComponent: () => import('../modules/dashboard/pages/global-customer-success-metrics/global-customer-success-metrics.component').then(m => m.GlobalCustomerSuccessMetricsComponent),
  },
  {
    path: 'global-sales-metrics',
    data: { label: 'Vendita' },
    canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusAccounting, Profile.KeusSales]), resellerScopeGuard],
    loadComponent: () => import('../modules/dashboard/pages/global-sales-metrics/global-sales-metrics.component').then(m => m.GlobalSalesMetricsComponent),
  },
  {
    path: 'global-product-metrics',
    data: { label: 'Prodotto' },
    canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusBackoffice, Profile.KeusAccounting]), resellerScopeGuard],
    loadComponent: () => import('../modules/dashboard/pages/global-product-metrics/global-product-metrics.component').then(m => m.GlobalProductMetricsComponent),
  },
  ...(SHOW_WEBSITE_AND_MARKETING_METRICS ? [
    {
      path: 'global-website-metrics',
      data: { label: 'Sito web' },
      canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusBackoffice, Profile.KeusAccounting]), resellerScopeGuard],
      loadComponent: () => import('../modules/dashboard/pages/global-website-metrics/global-website-metrics.component').then(m => m.GlobalWebsiteMetricsComponent),
    },
    {
      path: 'global-marketing-metrics',
      data: { label: 'Marketing' },
      canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusBackoffice, Profile.KeusAccounting]), resellerScopeGuard],
      loadComponent: () => import('../modules/dashboard/pages/global-marketing-metrics/global-marketing-metrics.component').then(m => m.GlobalMarketingMetricsComponent),
    },
  ] : []),
  // Orders: the queue is single and global, because the delivery work of the
  // back office must be looked at in one place, whatever the channel.
  {
    path: 'orders',
    data: { label: 'Ordini' },
    canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusSales, Profile.KeusBackoffice, Profile.KeusAccounting]), resellerScopeGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('../modules/orders/pages/orders/orders.component').then(m => m.OrdersComponent),
      },
      {
        path: 'create',
        data: { label: 'Nuovo ordine' },
        canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusSales])],
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
        canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusBackoffice])],
        loadComponent: () => import('../modules/orders/pages/orders-provision/orders-provision.component').then(m => m.OrdersProvisionComponent),
      },
    ]
  },
  // Invoicing
  {
    path: 'billing/invoices',
    data: { label: 'Fatture' },
    canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusAccounting]), resellerScopeGuard],
    loadComponent: () => import('../modules/billing/pages/invoices/invoices.component').then(m => m.InvoicesComponent),
  },
  {
    path: 'billing/schedule',
    data: { label: 'Scadenziario' },
    canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusAccounting]), resellerScopeGuard],
    loadComponent: () => import('../modules/billing/pages/payment-schedule/payment-schedule.component').then(m => m.PaymentScheduleComponent),
  },
  {
    path: 'billing/reseller-contracts',
    data: { label: 'Contratti rivenditori' },
    canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusSales, Profile.KeusAccounting]), resellerScopeGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('../modules/billing/pages/reseller-contracts/reseller-contracts.component').then(m => m.ResellerContractsComponent),
      },
      {
        path: 'create',
        data: { label: 'Nuovo contratto' },
        canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusSales])],
        loadComponent: () => import('../modules/billing/pages/reseller-contracts-create/reseller-contracts-create.component').then(m => m.ResellerContractsCreateComponent),
      },
      {
        path: ':resellerId/:contractId',
        data: { label: 'Dettaglio contratto' },
        loadComponent: () => import('../modules/billing/pages/reseller-contracts-detail/reseller-contracts-detail.component').then(m => m.ResellerContractsDetailComponent),
      },
    ]
  },
  // Configuration
  {
    path: 'templates',
    data: { label: 'Template' },
    canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusSales, Profile.KeusBackoffice]), resellerScopeGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('../modules/templates/pages/templates/templates.component').then(m => m.TemplatesComponent),
      },
      {
        path: 'create',
        data: { label: 'Crea template' },
        canActivate: [profileGuard([Profile.KeusAdmin])],
        loadComponent: () => import('../modules/templates/pages/templates-create/templates-create.component').then(m => m.TemplatesCreateComponent),
      },
      {
        path: 'edit/:type/:id',
        data: { label: 'Dettaglio template' },
        loadComponent: () => import('../modules/templates/pages/templates-edit/templates-edit.component').then(m => m.TemplatesEditComponent),
      },
    ],
  },
  {
    path: 'materials',
    data: { label: 'Materiali' },
    canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusSales, Profile.KeusBackoffice]), resellerScopeGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('../modules/materials/pages/materials/materials.component').then(m => m.MaterialsComponent),
      },
      {
        path: 'create',
        data: { label: 'Crea materiale' },
        canActivate: [profileGuard([Profile.KeusAdmin])],
        loadComponent: () => import('../modules/materials/pages/materials-create/materials-create.component').then(m => m.MaterialsCreateComponent),
      },
      {
        path: 'edit/:id',
        data: { label: 'Dettaglio materiale' },
        loadComponent: () => import('../modules/materials/pages/materials-edit/materials-edit.component').then(m => m.MaterialsEditComponent),
      },
    ],
  },
  {
    path: 'global-technical-metrics',
    data: { label: 'Tecniche' },
    canActivate: [profileGuard([Profile.KeusAdmin]), resellerScopeGuard],
    loadComponent: () => import('../modules/metrics/pages/global-technical-metrics/global-technical-metrics.component').then(m => m.GlobalTechnicalMetricsComponent),
  },
  // The old address of the companies section, kept for the saved links.
  {
    path: 'clients',
    redirectTo: 'companies',
    pathMatch: 'prefix'
  },
  {
    path: 'companies',
    canActivate: [resellerOwnWorkspaceGuard, profileGuard([Profile.KeusAdmin, Profile.KeusSales, Profile.KeusBackoffice, Profile.KeusAccounting])],
    data: {
      label: 'Aziende'
    },
    children: [
      {
        path: '',
        loadComponent: () => import('../modules/companies/pages/companies/companies.component').then(m => m.CompaniesComponent),
      },
      {
        path: 'create',
        canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusSales, Profile.KeusBackoffice])],
        loadComponent: () => import('../modules/companies/pages/companies-create/companies-create.component').then(m => m.CompaniesCreateComponent),
        data: {
          label: 'Crea azienda'
        }
      },
      {
        path: 'edit/:companyId',
        data: {
          label: 'Dettaglio azienda'
        },
        children: companyDetailRoutes
      }
    ]
  },
  {
    path: 'resellers',
    canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusSales, Profile.KeusBackoffice, Profile.KeusAccounting]), resellerScopeGuard],
    data: {
      label: 'Rivenditori'
    },
    children: [
      {
        path: '',
        loadComponent: () => import('../modules/resellers/pages/resellers/resellers.component').then(m => m.ResellersComponent),
      },
      {
        path: 'create',
        canActivate: [profileGuard([Profile.KeusAdmin, Profile.KeusSales])],
        loadComponent: () => import('../modules/resellers/pages/resellers-create/resellers-create.component').then(m => m.ResellersCreateComponent),
        data: {
          label: 'Crea rivenditore'
        }
      },
      {
        path: 'tiers',
        canActivate: [profileGuard([Profile.KeusAdmin])],
        loadComponent: () => import('../modules/resellers/pages/resellers-tiers/resellers-tiers.component').then(m => m.ResellersTiersComponent),
        data: {
          label: 'Canoni'
        }
      },
      {
        path: 'edit/:resellerId',
        loadComponent: () => import('../modules/resellers/pages/resellers-edit/resellers-edit.component').then(m => m.ResellersEditComponent),
        data: {
          label: 'Dettaglio rivenditore'
        }
      },
      {
        path: 'edit/:resellerId/transfer',
        canActivate: [profileGuard([Profile.KeusAdmin])],
        loadComponent: () => import('../modules/resellers/pages/resellers-transfer/resellers-transfer.component').then(m => m.ResellersTransferComponent),
        data: {
          label: 'Trasferimento aziende'
        }
      }
    ]
  },
  {
    path: 'collaborators',
    canActivate: [profileGuard([Profile.KeusAdmin])],
    data: {
      label: 'Collaboratori'
    },
    children: [
      {
        path: '',
        loadComponent: () => import('../modules/collaborators/pages/collaborators/collaborators.component').then(m => m.CollaboratorsComponent),
      },
      {
        path: 'create',
        loadComponent: () => import('../modules/collaborators/pages/collaborators-create/collaborators-create.component').then(m => m.CollaboratorsCreateComponent),
        data: {
          label: 'Crea collaboratore'
        }
      },
      {
        path: 'edit/:collaboratorId',
        canActivate: [notSelfGuard('collaboratorId')],
        loadComponent: () => import('../modules/collaborators/pages/collaborators-edit/collaborators-edit.component').then(m => m.CollaboratorsEditComponent),
        data: {
          label: 'Dettaglio collaboratore'
        }
      }
    ]
  },
  {
    path: 'products',
    data: {
      label: 'Prodotti'
    },
    children: [
      {
        path: '',
        canActivate: [resellerOwnWorkspaceGuard],
        loadComponent: () => import('../modules/products/pages/products/products.component').then(m => m.ProductsComponent),
      },
      {
        path: 'create',
        loadComponent: () => import('../modules/products/pages/products-create/products-create.component').then(m => m.ProductsCreateComponent),
        data: {
          label: 'Crea prodotto'
        },
        canActivate: [profileGuard([Profile.KeusAdmin]), resellerScopeGuard]
      },
      {
        path: 'edit/:productId',
        loadComponent: () => import('../modules/products/pages/products-edit/products-edit.component').then(m => m.ProductsEditComponent),
        data: {
          label: 'Dettaglio prodotto'
        },
        canActivate: [profileGuard([Profile.KeusAdmin]), resellerScopeGuard]
      },
      {
        path: 'workspaces/:productId', // This slug name has to be unique
        data: {
          label: 'Workspace prodotto',
          area: AppArea.ProductWorkspace
        },
        canActivate: [profileGuard(CAPABILITY_PROFILES[Capability.OpenProductWorkspaces])],
        loadChildren: () => import('../routes/product-workspace.routes').then(m => m.productWorkspaceRoutes)
      }
    ]
  },
  {
    path: 'access-denied',
    loadComponent: () => import('../pages/access-denied/access-denied.component').then(m => m.AccessDeniedComponent),
    data: {
      label: 'Accesso negato'
    }
  },
  {
    // The account lives in a dialog now: old links open it over the dashboard
    path: 'account',
    redirectTo: () => inject(Router).createUrlTree(['/dashboard'], { queryParams: { profilo: 'dati' } })
  }
];

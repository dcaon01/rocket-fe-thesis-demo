import { Routes } from '@angular/router';
import { sessionGuard } from './auth/guards/session.guard';
import { AppArea } from './core/enums/app-area.enum';
import { accessBlockedGuard, resellerAccessGuard } from './core/guards/reseller-access.guard';
import { resellerWorkspaceGuard } from './core/guards/reseller-workspace.guard';

/**
 * Application shell routes.
 * Only the outer frame lives here: the authenticated layout, the three areas
 * loaded from their own files, the blocking screen of the resellers, the auth pages and the payment landings.
 *
 * Declaration order matters: the reseller workspace must come before the empty
 * path, or the resellers list of the global area would swallow it.
 */
export const routes: Routes = [
  // Main layout routes
  {
    path: '',
    loadComponent: () => import('./core/components/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [sessionGuard(['authenticated'])],
    canActivateChild: [resellerAccessGuard],
    children: [
      // Reseller workspace: the perimeter of a single reseller.
      {
        path: 'resellers/workspaces/:resellerId',
        canActivate: [resellerWorkspaceGuard],
        data: {
          label: 'Workspace rivenditore',
          area: AppArea.ResellerWorkspace
        },
        loadChildren: () => import('./core/routes/reseller-workspace.routes').then(m => m.resellerWorkspaceRoutes)
      },
      // Global area, with the product workspace nested under /products.
      {
        path: '',
        data: {
          area: AppArea.Global
        },
        loadChildren: () => import('./core/routes/global-area.routes').then(m => m.globalAreaRoutes)
      }
    ]
  },
  // Blocking screen of a reseller that cannot work in Rocket, outside the layout
  {
    path: 'access-blocked',
    canActivate: [sessionGuard(['authenticated']), accessBlockedGuard],
    data: { label: 'Accesso bloccato' },
    loadComponent: () => import('./core/pages/reseller-access-block/reseller-access-block.component').then(m => m.ResellerAccessBlockComponent)
  },
  // Auth routes
  {
    path: 'login',
    canActivate: [sessionGuard(['unauthenticated'])],
    loadComponent: () => import('./auth/pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'change-password',
    canActivate: [sessionGuard(['password-change-required'])],
    loadComponent: () => import('./auth/pages/change-password/change-password.component').then(m => m.ChangePasswordComponent)
  },
  // Stripe redirect pages (no auth required)
  {
    path: 'payment-success',
    loadComponent: () => import('./core/pages/payment-success/payment-success.component').then(m => m.PaymentSuccessComponent)
  },
  {
    path: 'payment-cancelled',
    loadComponent: () => import('./core/pages/payment-cancelled/payment-cancelled.component').then(m => m.PaymentCancelledComponent)
  },
  {
    path: 'mandate-success',
    loadComponent: () => import('./core/pages/mandate-success/mandate-success.component').then(m => m.MandateSuccessComponent)
  },
  {
    path: 'mandate-cancelled',
    loadComponent: () => import('./core/pages/mandate-cancelled/mandate-cancelled.component').then(m => m.MandateCancelledComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];

import { Component, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, filter, switchMap } from 'rxjs';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { ResellersApiService } from '../../../../services/api-services/resellers/resellers-api.service';
import { AppContextService } from '../../../../services/app-context/app-context.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { ResellerProductsComponent } from '../../components/reseller-products/reseller-products.component';

/**
 * Enabled products page of the reseller workspace: the same list as the section of the card, one step from the sidebar.
 * Each product opens its workspace.
 */
@Component({
  selector: 'rocket-reseller-enabled-products',
  imports: [
    PageHeaderComponent,
    ResellerProductsComponent,
  ],
  templateUrl: './reseller-enabled-products.component.html',
})
export class ResellerEnabledProductsComponent {
  /** Resellers API service instance. */
  private readonly _resellersApiService = inject(ResellersApiService);

  /** App context service instance. */
  private readonly _appContextService = inject(AppContextService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Whether the viewer works at a reseller, for the description of the page. */
  readonly isReseller = this._permissions.isReseller;

  /** Reseller of the workspace, reloaded when the workspace changes. */
  readonly reseller = toSignal(
    toObservable(this._appContextService.resellerId).pipe(
      filter((resellerId): resellerId is string => !!resellerId),
      distinctUntilChanged(),
      switchMap(resellerId => this._resellersApiService.getReseller(resellerId)),
    )
  );
}

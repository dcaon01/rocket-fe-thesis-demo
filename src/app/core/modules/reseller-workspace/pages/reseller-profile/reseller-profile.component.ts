import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { catchError, distinctUntilChanged, filter, finalize, of, switchMap } from 'rxjs';
import { CoreResponseResellerDto, CoreUpdateResellerDto } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { Capability } from '../../../../enums/capability.enum';
import { ResellerContractsApiService } from '../../../../services/api-services/reseller-contracts/reseller-contracts-api.service';
import { ResellersApiService } from '../../../../services/api-services/resellers/resellers-api.service';
import { AppContextService } from '../../../../services/app-context/app-context.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { ResellerCardComponent } from '../../components/reseller-card/reseller-card.component';

/**
 * Card page of the reseller workspace: company data, enabled products, contract in force and logo.
 * The contract, with tier, fee and discounts, is hidden from the profiles that may not read the economic terms.
 */
@Component({
  selector: 'rocket-reseller-profile',
  imports: [
    ...HlmButtonImports,
    ...HlmTooltipImports,
    PageHeaderComponent,
    ResellerCardComponent,
  ],
  templateUrl: './reseller-profile.component.html',
})
export class ResellerProfileComponent {
  /** Resellers API service instance. */
  private readonly _resellersApiService = inject(ResellersApiService);

  /** Reseller contracts API service instance. */
  private readonly _resellerContractsApiService = inject(ResellerContractsApiService);

  /** App context service instance. */
  private readonly _appContextService = inject(AppContextService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Whether the viewer works at a reseller, for the description of the page. */
  readonly isReseller = this._permissions.isReseller;

  /** Reference to the reseller card component. */
  card = viewChild<ResellerCardComponent>('card');

  /** Identifier of the reseller of the workspace, emitted when the workspace changes. */
  private readonly _resellerId$ = toObservable(this._appContextService.resellerId).pipe(
    filter((resellerId): resellerId is string => !!resellerId),
    distinctUntilChanged(),
  );

  /** Reseller of the workspace, reloaded when the workspace changes and replaced after a save. */
  readonly reseller = signal<CoreResponseResellerDto | undefined>(undefined);

  /** Whether the user can read tier, fee and discounts. */
  readonly canViewEconomics = computed(() => this._permissions.can(Capability.ViewResellerEconomics));

  /** Contract in force of the reseller, read only by who sees its economic terms; null when it has none. */
  readonly contract = toSignal(
    this._resellerId$.pipe(switchMap(resellerId => this.canViewEconomics()
      ? this._resellerContractsApiService.getContractInForce(resellerId).pipe(catchError(() => of(null)))
      : of(null)
    )),
    { initialValue: null }
  );

  /** Whether the user can change the company data of the reseller. */
  readonly canEdit = computed(() => this._permissions.canManageReseller(this.reseller()));

  /** Saving state signal. */
  isSaving = signal<boolean>(false);

  /**
   * Constructor of the page component.
   */
  constructor() {
    // Load the reseller of the workspace, again when the workspace changes.
    this._resellerId$.pipe(
      switchMap(resellerId => this._resellersApiService.getReseller(resellerId)),
      takeUntilDestroyed(),
    ).subscribe(reseller => this.reseller.set(reseller));
  }

  /**
   * Saves the changed company data and shows the updated reseller.
   * A cleared optional field is sent as null, which removes it.
   */
  save(): void {
    const card = this.card();
    const reseller = this.reseller();
    const form = card?.companyDataForm;
    if (!card || !reseller || !form || !form.dirty || form.invalid) return;

    const value = form.getRawValue();
    const update: CoreUpdateResellerDto = {};
    if (form.controls.email.dirty) update.email = value.email ?? undefined;
    if (form.controls.phoneNumber.dirty) update.phoneNumber = value.phoneNumber || null;
    if (form.controls.pec.dirty) update.pec = value.pec || null;
    if (form.controls.legalAddress.dirty) update.legalAddress = card.buildLegalAddress();
    if (form.controls.vatNumber.dirty) update.vatNumber = value.vatNumber || null;
    if (form.controls.sdi.dirty) update.sdi = value.sdi || null;
    if (form.controls.fiscalCode.dirty) update.fiscalCode = value.fiscalCode || null;
    if (form.controls.iban.dirty) update.iban = value.iban || null;

    this.isSaving.set(true);
    this._resellersApiService.updateReseller(reseller.id, update).pipe(
      finalize(() => this.isSaving.set(false))
    ).subscribe(updated => this.reseller.set(updated));
  }
}

import { DatePipe } from '@angular/common';
import { Component, computed, inject, linkedSignal, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEllipsisVertical, lucideLockOpen } from '@ng-icons/lucide';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { catchError, EMPTY, finalize } from 'rxjs';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { STATUS_COLORS } from '../../../../constants/status-colors';
import { Capability } from '../../../../enums/capability.enum';
import { Profile } from '../../../../enums/profile.enum';
import { CoreUpdateResellerDto } from '../../../../../../../libs/api/src';
import { ResellersApiService } from '../../../../services/api-services/resellers/resellers-api.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { ResellerFormComponent } from '../../components/reseller-form/reseller-form.component';
import { CreateEditResellerForm } from '../../interfaces/create-edit-reseller-form.interface';

/**
 * Component for editing an existing reseller.
 */
@Component({
  selector: 'rocket-resellers-edit',
  imports: [
    ...BrnDialogImports,
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmDialogImports,
    ...HlmDropdownMenuImports,
    ...HlmTooltipImports,
    PageHeaderComponent,
    ResellerFormComponent,
    DatePipe,
    NgIcon,
    RouterLink,
  ],
  providers: [
    provideIcons({
      lucideEllipsisVertical,
      lucideLockOpen,
    })
  ],
  templateUrl: './resellers-edit.component.html',
  styleUrl: './resellers-edit.component.css'
})
export class ResellersEditComponent {
  /** Resellers api service. */
  private readonly _resellersService = inject(ResellersApiService);

  /** Activated route. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Router service. */
  private readonly _router = inject(Router);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Signal to hold reseller data for editing; a reseller the user may not read sends it to access denied. */
  readonly resellerData = toSignal(
    this._resellersService.getReseller(this._activatedRoute.snapshot.params['resellerId']).pipe(
      catchError(() => {
        this._router.navigate(['/access-denied']);
        return EMPTY;
      })
    )
  );

  /** Since when the reseller is blocked for an unpaid invoice, cleared by the restore without touching the form. */
  readonly accessSuspendedAt = linkedSignal(() => this.resellerData()?.accessSuspendedAt);

  /** Whether the restore of the access is running. */
  isRestoring = signal<boolean>(false);

  /** Reference to the reseller form component. */
  form = viewChild<ResellerFormComponent>('form');

  /** Reference to the restore confirmation dialog. */
  restoreDialog = viewChild<BrnDialog>('restoreDialog');

  /** Colors of the mark of a reseller with unpaid invoices. */
  readonly overdueBadgeClass = STATUS_COLORS.negative;

  /** Colors of the mark of a reseller blocked for an unpaid invoice. */
  readonly suspendedBadgeClass = STATUS_COLORS.negative;

  /** Whether the user can edit this reseller: a Keus salesperson only its own. */
  readonly canEdit = computed(() => this._permissions.canManageReseller(this.resellerData()));

  /** Whether the user can give Rocket back to a reseller blocked for an unpaid invoice. */
  readonly canRestoreAccess = computed(() => this._permissions.can(Capability.ManageAccess) && !!this.accessSuspendedAt());

  /** Whether the admin can transfer the companies of this reseller: only once it is inactive (UR-RK-105). */
  readonly canTransfer = computed(() => this.resellerData()?.status === 'INACTIVE' && this._permissions.hasAnyProfile([Profile.KeusAdmin]));

  /**
   * Method to handle reseller editing logic.
   * @param resellerForm the reseller form data got from the child form component.
   */
  editReseller(resellerForm: FormGroup<CreateEditResellerForm>) {
    if (!resellerForm.dirty) return;

    const updateReseller: CoreUpdateResellerDto = {};

    if (resellerForm.get('companyName')?.dirty) updateReseller.companyName = resellerForm.value.companyName ?? undefined;
    if (resellerForm.get('email')?.dirty) updateReseller.email = resellerForm.value.email ?? undefined;
    if (resellerForm.get('phoneNumber')?.dirty) updateReseller.phoneNumber = resellerForm.value.phoneNumber || null;
    if (resellerForm.get('vatNumber')?.dirty) updateReseller.vatNumber = resellerForm.value.vatNumber || null;
    if (resellerForm.get('pec')?.dirty) updateReseller.pec = resellerForm.value.pec || null;
    if (resellerForm.get('sdi')?.dirty) updateReseller.sdi = resellerForm.value.sdi || null;
    if (resellerForm.get('status')?.dirty) updateReseller.status = resellerForm.value.status ?? undefined;
    if (resellerForm.get('iban')?.dirty) updateReseller.iban = resellerForm.value.iban || null;
    if (resellerForm.get('fiscalCode')?.dirty) updateReseller.fiscalCode = resellerForm.value.fiscalCode || null;
    if (resellerForm.get('legalAddress')?.dirty) updateReseller.legalAddress = this.form()?.buildLegalAddress();

    if (resellerForm.get('assignedSalesId')?.dirty) {
      updateReseller.assignedSalesId = resellerForm.value.assignedSalesId || null;
      updateReseller.assignedSalesName = resellerForm.value.assignedSalesId ? this.form()?.assignedSalesNameOf(resellerForm.value.assignedSalesId) : null;
    }

    this._resellersService.updateReseller(this.resellerData()?.id ?? '', updateReseller).pipe(finalize(() => {
      this._router.navigate(['/resellers']);
    })).subscribe();
  }

  /**
   * Opens the confirmation of the restore of the access.
   */
  openRestoreDialog(): void {
    this.restoreDialog()?.open();
  }

  /**
   * Closes the confirmation of the restore of the access.
   */
  closeRestoreDialog(): void {
    this.restoreDialog()?.close();
  }

  /**
   * Gives Rocket back to the blocked reseller before the money arrives, once confirmed.
   */
  restoreAccess(): void {
    const reseller = this.resellerData();
    if (!reseller || this.isRestoring()) return;

    this.isRestoring.set(true);
    this._resellersService.restoreAccess(reseller.id).pipe(finalize(() => this.isRestoring.set(false))).subscribe({
      next: restored => {
        this.accessSuspendedAt.set(restored.accessSuspendedAt);
        this.restoreDialog()?.close();
      },
      error: error => console.error('Error restoring the access of the reseller:', error)
    });
  }
}

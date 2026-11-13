import { DatePipe } from '@angular/common';
import { Component, inject, output, signal, viewChild } from '@angular/core';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { finalize } from 'rxjs';
import { CoreResponseScheduleEntryDto } from '../../../../../../../libs/api/src';
import { CustomerChargeKind } from '../../../../enums/customer-charge-kind.enum';
import { CustomerChargesApiService } from '../../../../services/api-services/customer-charges/customer-charges-api.service';
import { AppContextService } from '../../../../services/app-context/app-context.service';

/**
 * Confirmation of a due date of a customer marked collected, or not collected, for the reseller whose workspace is
 * open: the change moves the due date in or out of its invoices, so it is never applied on a single click.
 * Usage: <rocket-collected-dialog #collectedDialog (changed)="reload()" />, then collectedDialog.open(entry).
 */
@Component({
  selector: 'rocket-collected-dialog',
  imports: [
    ...BrnDialogImports,
    ...HlmButtonImports,
    ...HlmDialogImports,
    DatePipe,
  ],
  templateUrl: './collected-dialog.component.html',
})
export class CollectedDialogComponent {
  /** Customer charges API service instance. */
  private readonly _customerChargesApiService = inject(CustomerChargesApiService);

  /** Context of the workspace, for the reseller. */
  private readonly _context = inject(AppContextService);

  /** Reference to the dialog. */
  private readonly _dialog = viewChild<BrnDialog>('dialog');

  /** Emits once the due date has been marked, so the caller reads its due dates again. */
  changed = output<void>();

  /** Due date waiting for the confirmation of its new collected state. */
  pending = signal<CoreResponseScheduleEntryDto | null>(null);

  /** Whether the change is being saved. */
  isSaving = signal<boolean>(false);

  /**
   * Opens the confirmation for a due date of a customer.
   * @param entry the due date.
   */
  open(entry: CoreResponseScheduleEntryDto): void {
    this.pending.set(entry);
    this._dialog()?.open();
  }

  /**
   * Closes the dialog.
   */
  close(): void {
    this.pending.set(null);
    this._dialog()?.close();
  }

  /**
   * Marks the due date waiting for confirmation collected, or not collected, then tells the caller.
   */
  confirm(): void {
    const resellerId = this._context.resellerId();
    const entry = this.pending();
    const charge = entry?.charge;
    if (!resellerId || !entry || !charge) return;

    this.isSaving.set(true);
    const dueDate = charge.kind === CustomerChargeKind.Recurring ? entry.dueDate : undefined;
    this._customerChargesApiService.setCollected(resellerId, charge.id, !entry.collected, dueDate).pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: () => {
        this.close();
        this.changed.emit();
      },
      error: (error) => console.error('Error marking the due date:', error),
    });
  }
}

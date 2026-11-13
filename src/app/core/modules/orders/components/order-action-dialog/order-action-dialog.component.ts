import { Component, computed, inject, output, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDatePickerImports } from '@spartan-ng/helm/date-picker';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { EMPTY, finalize, Observable, of, Subscription, switchMap } from 'rxjs';
import { CoreCustomizationEvaluation, CoreResponseOrderCustomizationDto, CoreResponseOrderDto, CoreResponseOrderLineDto } from '../../../../../../../libs/api/src';
import { FileDropComponent } from '../../../../components/file-drop/file-drop.component';
import { Financier } from '../../../../enums/financier.enum';
import { OrderRefusalReason } from '../../../../enums/order-refusal-reason.enum';
import { OrderStatus } from '../../../../enums/order-status.enum';
import { SalesChannel } from '../../../../enums/sales-channel.enum';
import { OrderRefusalReasonPipe } from '../../../../pipes/order-refusal-reason/order-refusal-reason.pipe';
import { OrdersApiService } from '../../../../services/api-services/orders/orders-api.service';
import { S3UploadService } from '../../../../services/api-services/s3/s3-upload.service';
import { OrderDocumentsService } from '../../../../services/documents/order-documents.service';
import { OrderActionKind } from '../../../../services/order-actions/order-actions.service';
import { OrderActionForm } from '../../interfaces/order-action-form.interface';

/** Warning of a new evaluation once the reseller offer is approved: the approval is voided. */
const APPROVAL_VOIDED = 'L\'approvazione dell\'offerta decade: il rivenditore deve richiederla di nuovo.';

/** What an action is about, besides the order. */
export type OrderActionContext = {
  /** Customization the action is about. */
  customization?: CoreResponseOrderCustomizationDto;
  /** Order line the action is about. */
  line?: CoreResponseOrderLineDto;
  /** Outcomes of the customizations, for the quotation. */
  evaluations?: CoreCustomizationEvaluation[] | null;
};

/** Action waiting for confirmation in the dialog. */
type PendingAction = OrderActionContext & {
  /** Which action it is, to show its fields. */
  kind: OrderActionKind;
  /** Title of the dialog. */
  title: string;
  /** Explanation of what happens. */
  description: string;
  /** Label of the confirm button. */
  confirmLabel: string;
  /** Whether the action cannot be undone. */
  destructive?: boolean;
};

/**
 * Dialog that confirms an action on an order, with the fields the action asks for, and runs it.
 * The order page and the order list open the same dialog, so an action reads and behaves the same in both.
 */
@Component({
  selector: 'rocket-order-action-dialog',
  imports: [
    ...BrnDialogImports,
    ...BrnSelectImports,
    ...HlmButtonImports,
    ...HlmDatePickerImports,
    ...HlmDialogImports,
    ...HlmInputImports,
    ...HlmLabelImports,
    ...HlmSelectImports,
    ...HlmTextareaImports,
    FileDropComponent,
    OrderRefusalReasonPipe,
    ReactiveFormsModule,
  ],
  templateUrl: './order-action-dialog.component.html',
})
export class OrderActionDialogComponent {
  /** Orders API service instance. */
  private readonly _ordersApiService = inject(OrdersApiService);

  /** S3 upload service instance. */
  private readonly _s3UploadService = inject(S3UploadService);

  /** Order documents service instance. */
  private readonly _orderDocumentsService = inject(OrderDocumentsService);

  /** The order once the action has run. */
  done = output<CoreResponseOrderDto>();

  /** Dialog reference. */
  dialog = viewChild<BrnDialog>('dialog');

  /** Refusal reasons of an offer. */
  refusalReasons = Object.values(OrderRefusalReason);

  /** Finance companies. */
  financiers = Object.values(Financier);

  /** Form group of the fields the actions ask for. */
  actionForm = new FormGroup<OrderActionForm>({
    discountPercent: new FormControl<number | null>(null),
    approvalRefusalReason: new FormControl<string | null>(null),
    refusalReason: new FormControl<OrderRefusalReason | null>(null),
    refusalNote: new FormControl<string | null>(null),
    financier: new FormControl<Financier | null>(null),
    financierReference: new FormControl<string | null>(null),
    financedYears: new FormControl<number | null>(null),
    deliveryDate: new FormControl<Date | null>(null),
  });

  /** Order the action is about; the offer reads it in full, lines included. */
  order = signal<CoreResponseOrderDto | null>(null);

  /** Action waiting for confirmation. */
  pendingAction = signal<PendingAction | null>(null);

  /** PDF chosen in the dialog: the signed offer or the contract of the finance company. */
  actionFile = signal<File | null>(null);

  /** Error on the PDF chosen in the dialog. */
  actionFileError = signal<string | null>(null);

  /** Whether the action is running, or the full order is being read. */
  isLoading = signal<boolean>(false);

  /** Reading of the full order for the offer, cancelled when the dialog opens again or closes. */
  private _fullOrder?: Subscription;

  /** Highest discount on the customization of the dialog: the reseller margin on the indirect channel. */
  readonly maxCustomizationDiscount = computed(() => this.pendingAction()?.customization?.resellerMarginPercent ?? 100);

  /**
   * Opens the dialog of an action, with its fields prefilled from the order.
   * @param kind the action.
   * @param order the order, as the list or the page holds it.
   * @param context the customization, the line or the outcomes the action is about.
   */
  open(kind: OrderActionKind, order: CoreResponseOrderDto, context: OrderActionContext = {}): void {
    this._fullOrder?.unsubscribe();
    this.isLoading.set(false);
    this.order.set(order);
    this.actionForm.reset({
      discountPercent: context.customization?.discountPercent ?? 0,
      financier: (order.financier as Financier | undefined) ?? Financier.Grenke,
      financierReference: order.financierReference ?? null,
      financedYears: order.financedYears ?? null,
    });
    this.actionFile.set(null);
    this.actionFileError.set(null);
    this.pendingAction.set({ ...this._describeAction(kind, order, context), ...context });
    this.dialog()?.open();

    // A row of the list has no lines: the offer reads them now, so that its tab still opens inside the click.
    if (kind === 'offer' && !order.lines) {
      this.isLoading.set(true);
      this._fullOrder = this._ordersApiService.getOrder(order.id).pipe(finalize(() => this.isLoading.set(false)))
        .subscribe(full => this.order.set(full));
    }
  }

  /**
   * Closes the dialog.
   */
  close(): void {
    this._fullOrder?.unsubscribe();
    this.pendingAction.set(null);
    this.dialog()?.close();
  }

  /**
   * Keeps the PDF dropped or chosen in the dialog.
   * @param file the file.
   */
  onActionFileSelected(file: File): void {
    if (file.type !== 'application/pdf') {
      this.actionFileError.set('Il file deve essere un PDF.');
      return;
    }
    this.actionFileError.set(null);
    this.actionFile.set(file);
  }

  /**
   * Tells whether the fields of the pending action are filled in.
   * @returns true when the action can be confirmed.
   */
  isActionValid(): boolean {
    const value = this.actionForm.getRawValue();
    switch (this.pendingAction()?.kind) {
      case 'offer':
        // From the list the lines are read when the dialog opens: without them the offer would come out empty.
        return Boolean(this.order()?.lines);
      case 'saveQuotation':
        return Boolean(this.pendingAction()?.evaluations);
      case 'discountCustomization':
        return value.discountPercent !== null && value.discountPercent >= 0 && value.discountPercent <= this.maxCustomizationDiscount();
      case 'refuseApproval':
        return Boolean(value.approvalRefusalReason?.trim());
      case 'accept':
        return Boolean(this.actionFile());
      case 'refuse':
        return Boolean(value.refusalReason) && (value.refusalReason !== OrderRefusalReason.Other || Boolean(value.refusalNote?.trim()));
      case 'financing':
        return value.financier === Financier.None || (Boolean(value.financierReference?.trim()) && (value.financedYears === null || value.financedYears >= 1));
      case 'confirm':
        return Boolean(value.deliveryDate);
      case 'completeProvisioning':
        return Boolean(this.pendingAction()?.line);
      default:
        return true;
    }
  }

  /**
   * Runs the action waiting for confirmation.
   */
  confirm(): void {
    const order = this.order();
    const action = this.pendingAction();
    if (!order || !action || !this.isActionValid()) return;

    // The dialog closes only once the action succeeds: on an error the fields and the file stay, to try again.
    this.isLoading.set(true);
    // The offer opens its tab inside this click, before any request.
    if (action.kind === 'offer') {
      this._orderDocumentsService.offer(order, true).pipe(finalize(() => this.isLoading.set(false)))
        .subscribe(updated => {
          this.close();
          if (updated) this.done.emit(updated);
        });
      return;
    }

    this._runAction(order, action).pipe(finalize(() => this.isLoading.set(false)))
      .subscribe(updated => {
        this.close();
        this.done.emit(updated);
      });
  }

  /**
   * Formats a date for display in the date picker.
   * @param date the date to format.
   * @returns the formatted date string.
   */
  formatDate(date: Date | null): string {
    if (!date) return '';
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  }

  /**
   * Builds the request of an action from the fields of the dialog.
   * @param order the order.
   * @param action the action, with what it is about.
   * @returns the request.
   */
  private _runAction(order: CoreResponseOrderDto, action: PendingAction): Observable<CoreResponseOrderDto> {
    const value = this.actionForm.getRawValue();
    const file = this.actionFile();
    const customizationId = action.customization?.id ?? '';
    switch (action.kind) {
      case 'requestQuote':
        return this._ordersApiService.requestQuote(order.id);
      case 'saveQuotation':
        return this._ordersApiService.saveQuotation(order.id, { evaluations: action.evaluations! });
      case 'discountCustomization':
        return this._ordersApiService.setCustomizationDiscount(order.id, customizationId, { discountPercent: value.discountPercent ?? 0 });
      case 'requestApproval':
        return this._ordersApiService.requestApproval(order.id);
      case 'approve':
        return this._ordersApiService.approveOffer(order.id);
      case 'refuseApproval':
        return this._ordersApiService.refuseApproval(order.id, { reason: value.approvalRefusalReason!.trim() });
      case 'accept':
        return this._s3UploadService.uploadOrderFile('ORDER_SIGNED_OFFER', order.id, file!).pipe(
          switchMap(signedOfferS3Key => this._ordersApiService.acceptOrder(order.id, { signedOfferS3Key }))
        );
      case 'refuse':
        return this._ordersApiService.refuseOrder(order.id, {
          reason: value.refusalReason!,
          ...(value.refusalNote?.trim() ? { note: value.refusalNote.trim() } : {}),
        });
      case 'financing': {
        const contractKey$: Observable<string | null> = file
          ? this._s3UploadService.uploadOrderFile('ORDER_FINANCING_CONTRACT', order.id, file)
          : of(null);
        return contractKey$.pipe(switchMap(financingContractS3Key => this._ordersApiService.updateFinancing(order.id, {
          financier: value.financier ?? Financier.None,
          ...(value.financier !== Financier.None && value.financierReference?.trim() ? { financierReference: value.financierReference.trim() } : {}),
          ...(value.financier !== Financier.None && value.financedYears ? { financedYears: value.financedYears } : {}),
          ...(financingContractS3Key ? { financingContractS3Key } : {}),
        })));
      }
      case 'confirm':
        return this._ordersApiService.confirmOrder(order.id, { deliveryDate: this._isoDate(value.deliveryDate!) });
      case 'completeProvisioning':
        if (!action.line) return EMPTY;
        return this._ordersApiService.completeLineProvisioning(order.id, action.line.productId).pipe(
          switchMap(() => this._ordersApiService.getOrder(order.id)),
        );
      default:
        return this._ordersApiService.cancelOrder(order.id);
    }
  }

  /**
   * Returns the title, the explanation and the button of an action.
   * @param kind the action.
   * @param order the order.
   * @param context the customization or the line the action is about.
   * @returns the action ready for the dialog.
   */
  private _describeAction(kind: OrderActionKind, order: CoreResponseOrderDto, context: OrderActionContext): Omit<PendingAction, keyof OrderActionContext> {
    const label = context.customization ? `«${this._customizationLabel(order, context.customization)}»` : '';
    switch (kind) {
      case 'requestQuote':
        return {
          kind,
          title: 'Richiedere la quotazione?',
          description: 'L\'ordine passa a «Da quotare» e compare nella coda del backoffice, che valuta la personalizzazione.',
          confirmLabel: 'Richiedi',
        };
      case 'saveQuotation':
        return {
          kind,
          title: 'Salvare la quotazione?',
          description: 'L\'ordine passa a «Quotato» e chi vende riceve una mail con l\'esito di ogni personalizzazione. Quelle non accolte restano fuori dall\'offerta.'
            + (order.status === OrderStatus.Approved ? ' ' + APPROVAL_VOIDED : ''),
          confirmLabel: 'Salva',
        };
      case 'discountCustomization':
        return {
          kind,
          title: `Sconto su ${label}`,
          description: 'Lo sconto al cliente sulla quotazione della personalizzazione.',
          confirmLabel: 'Applica',
        };
      case 'requestApproval':
        return {
          kind,
          title: 'Richiedere l\'approvazione?',
          description: 'L\'ordine passa a «Da approvare»: il backoffice Keus controlla l\'offerta prima che venga generata.',
          confirmLabel: 'Richiedi',
        };
      case 'approve':
        return {
          kind,
          title: 'Approvare l\'offerta?',
          description: 'Il rivenditore riceve l\'avviso e può generare l\'offerta.',
          confirmLabel: 'Approva',
        };
      case 'refuseApproval':
        return {
          kind,
          title: 'Rifiutare l\'approvazione',
          description: 'L\'ordine torna modificabile e il motivo arriva al rivenditore.',
          confirmLabel: 'Rifiuta',
          destructive: true,
        };
      case 'offer':
        return {
          kind,
          title: 'Generare l\'offerta?',
          description: order.channel === SalesChannel.Direct
            ? 'Rocket compila l\'offerta dal template in vigore e la apre in una nuova scheda, da salvare o stampare in PDF. L\'ordine passa a «Inviato».'
            : 'Rocket compila l\'offerta dal template in vigore e la scarica in Word, da adattare prima di inviarla. L\'ordine passa a «Inviato».',
          confirmLabel: 'Genera',
        };
      case 'completeProvisioning':
        return {
          kind,
          title: 'Completare l\'erogazione?',
          description: `La riga di ${context.line?.productName ?? ''} passa a «Erogata» e nasce il suo contratto. Il prodotto ha già confermato il tenant e tutti gli utenti. L'azione non si può annullare.`,
          confirmLabel: 'Completa',
        };
      case 'accept':
        return {
          kind,
          title: 'Registrare l\'accettazione',
          description: 'Carica l\'offerta firmata: l\'ordine passa ad «Accettato».',
          confirmLabel: 'Registra',
        };
      case 'refuse':
        return {
          kind,
          title: 'Registrare il rifiuto',
          description: 'L\'ordine passa a «Rifiutato», che è uno stato finale.',
          confirmLabel: 'Registra',
          destructive: true,
        };
      case 'financing':
        return {
          kind,
          title: 'Finanziamento',
          description: 'Con il finanziamento non si genera il link di pagamento: servono il riferimento della pratica e, prima della conferma, il contratto della finanziaria.',
          confirmLabel: 'Salva',
        };
      case 'confirm':
        return {
          kind,
          title: 'Confermare l\'ordine',
          description: 'Indica la data prevista di consegna: le righe passano a «Da erogare».',
          confirmLabel: 'Conferma',
        };
      case 'cancel':
        return {
          kind,
          title: 'Annullare l\'ordine?',
          description: 'L\'ordine passa ad «Annullato» ed esce dalla coda. Questa azione non può essere annullata.',
          confirmLabel: 'Annulla l\'ordine',
          destructive: true,
        };
    }
  }

  /**
   * Formats a date as the backend reads it.
   * @param date the date.
   * @returns the date as YYYY-MM-DD.
   */
  private _isoDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  /**
   * Names a customization by the product of its line.
   * @param order the order.
   * @param customization the customization.
   * @returns the label.
   */
  private _customizationLabel(order: CoreResponseOrderDto, customization: CoreResponseOrderCustomizationDto): string {
    return order.lines?.find(line => line.productId === customization.productId)?.productName ?? 'Personalizzazione';
  }
}

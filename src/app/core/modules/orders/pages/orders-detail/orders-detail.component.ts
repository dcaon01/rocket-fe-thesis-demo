import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBan, lucideCalculator, lucideCheck, lucideCircleCheck, lucideCircleX, lucideDownload, lucideEllipsisVertical, lucideFileCheck, lucideFileText, lucideLandmark, lucidePercent, lucideSend } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmItemImports } from '@spartan-ng/helm/item';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { finalize, forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { CoreResponseOrderCustomizationDto, CoreResponseOrderDto, CoreResponseOrderLineDto, CoreUpdateOrderDto } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { FormToolbarComponent } from '../../../../components/form-toolbar/form-toolbar.component';
import { Capability } from '../../../../enums/capability.enum';
import { CustomizationStatus } from '../../../../enums/customization-status.enum';
import { OrderStatus } from '../../../../enums/order-status.enum';
import { OrdersApiService } from '../../../../services/api-services/orders/orders-api.service';
import { S3OrderEntityType, S3UploadService } from '../../../../services/api-services/s3/s3-upload.service';
import { OrderDocumentsService } from '../../../../services/documents/order-documents.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { CustomizationAction, customizationFileEntity, OrderFormComponent } from '../../components/order-form/order-form.component';
import { CustomizationFileValue } from '../../interfaces/create-edit-order-form.interface';
import { OrderActionDialogComponent } from '../../components/order-action-dialog/order-action-dialog.component';
import { OrderActionKind, OrderActionsService, OrderStepKind, ORDER_STEPS } from '../../../../services/order-actions/order-actions.service';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { OrderStatusDirective } from '../../../../directives/order-status.directive';
import { OrderStatusPipe } from '../../../../pipes/order-status/order-status.pipe';
import { fitFrameToContent } from '../../../../utils/fit-frame.util';
import { openInNewTab } from '../../../../utils/open-in-new-tab.util';

/** Steps of the order that can take the primary button. */
type PrimaryAction = Extract<OrderActionKind, 'approve' | 'confirm' | 'accept' | 'offer' | 'requestApproval' | 'requestQuote'>;

/** Action of a customization card, as the dialog names it. */
const CUSTOMIZATION_ACTIONS: Record<CustomizationAction, OrderActionKind> = {
  discount: 'discountCustomization',
};

/**
 * Page of a single order: its data, editable while it is a draft, and the actions that move it
 * along its lifecycle, each confirmed in one dialog.
 */
@Component({
  selector: 'rocket-orders-detail',
  imports: [
    ...HlmButtonImports,
    ...HlmDropdownMenuImports,
    ...HlmItemImports,
    ...HlmTabsImports,
    PageHeaderComponent,
    FormToolbarComponent,
    OrderFormComponent,
    OrderActionDialogComponent,
    NgIcon,
    ...HlmBadgeImports,
    ...HlmTooltipImports,
    OrderStatusDirective,
    OrderStatusPipe,
    DatePipe,
  ],
  providers: [
    provideIcons({
      lucideBan,
      lucideCalculator,
      lucideCheck,
      lucideCircleCheck,
      lucideCircleX,
      lucideDownload,
      lucideEllipsisVertical,
      lucideFileCheck,
      lucideFileText,
      lucideLandmark,
      lucidePercent,
      lucideSend,
    })
  ],
  templateUrl: './orders-detail.component.html',
})
export class OrdersDetailComponent {

  /** Activated route instance. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Orders API service instance. */
  private readonly _ordersApiService = inject(OrdersApiService);

  /** S3 upload service instance. */
  private readonly _s3UploadService = inject(S3UploadService);

  /** Order documents service instance. */
  private readonly _orderDocumentsService = inject(OrderDocumentsService);

  /** Sanitizer, to show the offer filled from a trusted template. */
  private readonly _sanitizer = inject(DomSanitizer);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Order actions service instance. */
  private readonly _orderActions = inject(OrderActionsService);

  /** Whether the viewer works at a reseller, for the description of the page. */
  readonly isReseller = this._permissions.isReseller;

  /** View child reference to the order form component. */
  form = viewChild<OrderFormComponent>('form');

  /** Action dialog reference. */
  actionDialog = viewChild<OrderActionDialogComponent>('actionDialog');

  /** Order shown in the page. */
  order = signal<CoreResponseOrderDto | null>(null);

  /** Whether the order can be edited: only a draft, by whoever edits orders. */
  readonly canEdit = computed(() => this._orderActions.canEdit(this.order()));

  /** Whether the seller can send the draft to the pricing of its customization. */
  readonly canRequestQuote = computed(() => this._orderActions.canRequestQuote(this.order()));

  /** Whether the back office can price or refuse the customizations: up to the acceptance. */
  readonly canEvaluateCustomizations = computed(() => this._orderActions.canEvaluateCustomizations(this.order()));

  /** Whether the reseller can ask Keus to approve its offer: every customization priced. */
  readonly canRequestApproval = computed(() => this._orderActions.canRequestApproval(this.order()));

  /** Whether the Keus back office can approve or refuse the offer of the reseller. */
  readonly canApprove = computed(() => this._orderActions.canApprove(this.order()));

  /** Whether the seller can generate the offer: direct from a draft or a priced order, indirect once approved. */
  readonly canGenerateOffer = computed(() => this._orderActions.canGenerateOffer(this.order()));

  /** Why the draft cannot go ahead, shown under the title; null when nothing blocks it. */
  readonly blockedReason = computed(() => this._orderActions.blockerMessage(this.order()));

  /**
   * Returns the actions the user may run on a customization, shown in its card.
   * @param customization the customization.
   * @returns the actions.
   */
  readonly customizationActionsFor = (customization: CoreResponseOrderCustomizationDto): CustomizationAction[] => {
    const status = this.order()?.status ?? '';
    const actions: CustomizationAction[] = [];
    if (this._permissions.can(Capability.CreateOrders) && status === OrderStatus.Priced && customization.status === CustomizationStatus.Quoted) {
      actions.push('discount');
    }
    return actions;
  };

  /** Whether the offer already generated can be downloaded again; the indirect one reads the seller, which only sellers may. */
  readonly canDownloadOffer = computed(() => this._orderActions.canDownloadOffer(this.order()));

  /** Whether the outcome of the offer can be recorded. */
  readonly canRecordOutcome = computed(() => this._orderActions.canRecordOutcome(this.order()));

  /** Whether the financing can be set: direct channel, before the confirmation. */
  readonly canManageFinancing = computed(() => this._orderActions.canManageFinancing(this.order()));

  /** Whether the back office can confirm the order. */
  readonly canConfirm = computed(() => this._orderActions.canConfirm(this.order()));

  /** Whether the order can be cancelled: before the confirmation. */
  readonly canCancel = computed(() => this._orderActions.canCancel(this.order()));

  /** Why the offer step is disabled, null when the offer can be shown. */
  readonly offerHint = computed<string | null>(() => {
    if (!this.order()?.offerTemplateId) return 'L\'offerta si vede dopo averla generata.';
    if (!this.canDownloadOffer()) return 'L\'offerta del canale indiretto la vede solo chi vende.';
    return null;
  });

  /** Offer shown in its step: the HTML in the page, or the Word file to download. */
  offerPreview = signal<{ html: SafeHtml } | { docx: true } | null>(null);

  /** Tab of the offer step: the offer generated, or the signed one. */
  offerView = signal<string>('original');

  /** Signed URL of the signed offer, for the browser viewer. */
  signedOfferUrl = signal<SafeResourceUrl | null>(null);

  /** Next step of the order for the current user, shown as the primary button. */
  readonly nextAction = computed<PrimaryAction | null>(() => {
    if (this.canApprove()) return 'approve';
    if (this.canConfirm()) return 'confirm';
    if (this.canRecordOutcome()) return 'accept';
    if (this.canGenerateOffer()) return 'offer';
    if (this.canRequestApproval()) return 'requestApproval';
    if (this.canRequestQuote()) return 'requestQuote';
    return null;
  });

  /** Label and icon of each step the primary button can show. */
  readonly primaryActions = ORDER_STEPS;

  /**
   * Whether the draft has changes or files waiting to be saved.
   * @returns true when saving comes first.
   */
  savePending(): boolean {
    return this.canEdit() && Boolean(this.form()?.changed());
  }

  /**
   * Whether the quotation takes the primary button: the order waits for it, or the back office changed an outcome.
   * @returns true when the back office has a quotation to save.
   */
  quotationPending(): boolean {
    return this.canEvaluateCustomizations()
      && (this.order()?.status === OrderStatus.ToBePriced || Boolean(this.form()?.evaluationDirty()));
  }

  /**
   * Whether a step would take the blocked draft out of the draft, so it stays off.
   * @param kind the step.
   * @returns true when the step is held back.
   */
  isBlocked(kind: OrderStepKind): boolean {
    return this._orderActions.isBlocked(kind, this.order());
  }

  /**
   * Whether a step is shown as the primary button, and so left out of the menu.
   * @param kind the step.
   * @returns true when the primary button shows it.
   */
  isPrimary(kind: PrimaryAction): boolean {
    return this.nextAction() === kind && !this.savePending();
  }

  /**
   * Constructor of the page component.
   */
  constructor() {
    // Load the order.
    this._ordersApiService.getOrder(this._activatedRoute.snapshot.params['orderId'])
      .subscribe(order => this.order.set(order));

    // Show the signed offer once it is uploaded.
    this._loadSignedOffer();

    // Fill the offer again whenever a new one is generated, to show it in its step.
    effect(() => {
      const order = this.order();
      const generatedAt = order?.offerGeneratedAt;
      if (!order || !generatedAt || this.offerHint()) {
        this.offerPreview.set(null);
        return;
      }
      untracked(() => this._orderDocumentsService.offerDocument(order).subscribe({
        next: document => this.offerPreview.set('html' in document
          ? { html: this._sanitizer.bypassSecurityTrustHtml(document.html) }
          : { docx: true }),
        error: error => console.error('Offer could not be filled', error),
      }));
    });
  }

  /**
   * Whether the options menu has an entry, so the button is rendered only then.
   * @returns true when the menu is not empty.
   */
  hasMenuActions(): boolean {
    return (this.canRequestQuote() && !this.isPrimary('requestQuote'))
      || (this.canRequestApproval() && !this.isPrimary('requestApproval'))
      || this.canApprove()
      || (this.canGenerateOffer() && !this.isPrimary('offer'))
      || this.canDownloadOffer()
      || this.canRecordOutcome()
      || this.canManageFinancing()
      || (this.canConfirm() && !this.isPrimary('confirm'))
      || Boolean(this.order()?.signedOfferS3Key)
      || Boolean(this.order()?.financingContractS3Key)
      || this.canCancel();
  }

  /**
   * Opens the signed offer once it is uploaded.
   */
  private _loadSignedOffer(): void {
    effect(() => {
      const s3Key = this.order()?.signedOfferS3Key;
      if (!s3Key) {
        this.signedOfferUrl.set(null);
        return;
      }
      untracked(() => this._s3UploadService.getDownloadUrl('ORDER_SIGNED_OFFER', s3Key).subscribe(url =>
        this.signedOfferUrl.set(this._sanitizer.bypassSecurityTrustResourceUrl(url))));
    });
  }

  /**
   * Fits the offer frame to its content, so that the page scrolls instead of the frame.
   * @param event the load event of the frame.
   */
  fitPreview(event: Event): void {
    fitFrameToContent(event);
  }

  /**
   * Uploads the files chosen for the customizations, then saves the changed parts of the draft with their keys.
   */
  editOrder(): void {
    const order = this.order();
    const form = this.form();
    if (!order || !form || !form.changed()) return;

    form.setUploadingState(true);
    this._uploadPendingFiles(order.id, form.pendingFiles()).pipe(
      switchMap(uploadedKeys => this._ordersApiService.updateOrder(order.id, this._buildUpdate(form, uploadedKeys))),
      finalize(() => form.setUploadingState(false)),
    ).subscribe(updated => this.order.set(updated));
  }

  /**
   * Opens the dialog of the action chosen on a customization card.
   * @param event the action and its customization.
   */
  onCustomizationAction(event: { action: CustomizationAction; customization: CoreResponseOrderCustomizationDto }): void {
    this.openAction(CUSTOMIZATION_ACTIONS[event.action], event.customization);
  }

  /**
   * Opens the completion of a line left behind.
   * @param line the order line.
   */
  onCompleteLine(line: CoreResponseOrderLineDto): void {
    this.openAction('completeProvisioning', undefined, line);
  }

  /**
   * Opens the dialog of an action; the quotation carries the outcomes given in the form.
   * @param kind the action.
   * @param customization the customization the action is about.
   * @param line the order line the action is about.
   */
  openAction(kind: OrderActionKind, customization?: CoreResponseOrderCustomizationDto, line?: CoreResponseOrderLineDto): void {
    const order = this.order();
    if (!order) return;

    const evaluations = kind === 'saveQuotation' ? this.form()?.evaluationsValue() : undefined;
    this.actionDialog()?.open(kind, order, { customization, line, evaluations });
  }

  /**
   * Fills the offer again from the template it was generated from, without recording anything.
   */
  downloadOffer(): void {
    const order = this.order();
    if (!order) return;
    this._orderDocumentsService.offer(order, false).subscribe();
  }

  /**
   * Opens a file of the order in a new tab.
   * @param entityType the kind of order file.
   * @param s3Key the S3 key of the file.
   */
  downloadFile(entityType: S3OrderEntityType, s3Key: string | undefined): void {
    if (!s3Key) return;
    this._s3UploadService.getDownloadUrl(entityType, s3Key).subscribe(url => openInNewTab(url));
  }

  /**
   * Uploads the files chosen for the customizations.
   * @param orderId the identifier of the order.
   * @param files the files, each with its kind.
   * @returns the S3 keys of the uploaded files, by file.
   */
  private _uploadPendingFiles(orderId: string, files: (CustomizationFileValue & { file: File })[]): Observable<Map<File, string>> {
    if (!files.length) return of(new Map<File, string>());
    return forkJoin(files.map(({ file, type }) => this._s3UploadService.uploadOrderFile(customizationFileEntity(type), orderId, file)
      .pipe(map(s3Key => [file, s3Key] as const)))).pipe(map(keys => new Map(keys)));
  }

  /**
   * Builds the update of the draft with only the changed parts; the lines carry their customizations along.
   * @param form the order form.
   * @param uploadedKeys the S3 keys of the files just uploaded, by file.
   * @returns the update.
   */
  private _buildUpdate(form: OrderFormComponent, uploadedKeys: Map<File, string>): CoreUpdateOrderDto {
    const { code, lines, customizations } = form.orderForm.controls;
    return {
      ...(code.dirty && code.value?.trim() ? { code: code.value.trim() } : {}),
      ...(lines.dirty ? { lines: form.linesValue() } : {}),
      ...(lines.dirty || customizations.dirty ? { customizations: form.customizationsValue(uploadedKeys) } : {}),
    };
  }
}

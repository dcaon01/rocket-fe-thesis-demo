import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCalendarClock, lucideCircleStop, lucideCopy, lucideCreditCard, lucideEllipsisVertical, lucideExternalLink, lucideFileText, lucideLink, lucideLock, lucideLockOpen, lucideRotateCcw, lucideScrollText, lucideSquareArrowOutUpRight, lucideUsers } from '@ng-icons/lucide';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmDatePickerImports } from '@spartan-ng/helm/date-picker';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { distinctUntilChanged, filter, Observable, switchMap } from 'rxjs';
import { CoreResponseContractDto } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { STATUS_COLORS } from '../../../../constants/status-colors';
import { ContractStatusDirective } from '../../../../directives/contract-status.directive';
import { Capability } from '../../../../enums/capability.enum';
import { ContractStatus } from '../../../../enums/contract-status.enum';
import { SeatEventKind } from '../../../../enums/seat-event-kind.enum';
import { ContractStatusPipe } from '../../../../pipes/contract-status/contract-status.pipe';
import { ContractsApiService } from '../../../../services/api-services/contracts/contracts-api.service';
import { PlansApiService } from '../../../../services/api-services/plans/plans-api.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { ToasterService } from '../../../../services/toaster/toaster.service';
import { openInNewTab } from '../../../../utils/open-in-new-tab.util';
import { formSteps, StepTab } from '../../../../utils/form-steps.util';
import { StepListComponent } from '../../../../components/step-list/step-list.component';
import { DunningStepPipe } from '../../../../pipes/dunning-step/dunning-step.pipe';

/** Actions on a contract that ask for a confirmation. */
type ContractAction = 'terminate' | 'withdraw' | 'terminateNow' | 'suspend' | 'restore' | 'postpone';

/**
 * Page of a contract: born with the provisioning of its order line, read only, with its cancellation and end,
 * and with the access of its company when an invoice stays unpaid.
 */
@Component({
  selector: 'rocket-contracts-detail',
  imports: [
    ...BrnDialogImports,
    ...HlmBadgeImports,
    ...HlmAlertImports,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmDatePickerImports,
    ...HlmDialogImports,
    ...HlmDropdownMenuImports,
    ...HlmLabelImports,
    ...HlmTableImports,
    ...HlmTabsImports,
    ...HlmTooltipImports,
    PageHeaderComponent,
    StepListComponent,
    DunningStepPipe,
    ContractStatusDirective,
    ContractStatusPipe,
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    NgIcon
  ],
  providers: [
    provideIcons({
      lucideCalendarClock,
      lucideCircleStop,
      lucideCopy,
      lucideCreditCard,
      lucideEllipsisVertical,
      lucideExternalLink,
      lucideFileText,
      lucideLink,
      lucideLock,
      lucideLockOpen,
      lucideRotateCcw,
      lucideScrollText,
      lucideSquareArrowOutUpRight,
      lucideUsers
    })
  ],
  templateUrl: './contracts-detail.component.html',
  styleUrl: './contracts-detail.component.css'
})
export class ContractsDetailComponent {
  /** Router instance. */
  private readonly _router = inject(Router);
  /** Activated route instance. */
  private readonly _activatedRoute = inject(ActivatedRoute);
  /** Contracts API service instance. */
  private readonly _contractsApiService = inject(ContractsApiService);
  /** Plans API service instance. */
  private readonly _plansApiService = inject(PlansApiService);
  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);
  /** Toaster service instance. */
  private readonly _toasterService = inject(ToasterService);

  /** Reference to the action confirmation dialog. */
  actionDialog = viewChild<BrnDialog>('actionDialog');

  /** Contract statuses, for the template. */
  readonly ContractStatus = ContractStatus;

  /** Kinds of change of the seats, for the template. */
  readonly SeatEventKind = SeatEventKind;

  /** Colors of the badge of an access suspended for an unpaid invoice. */
  readonly suspendedBadgeClass = STATUS_COLORS.negative;

  /** Colors of the badge of a suspension postponed by the administration. */
  readonly postponedBadgeClass = STATUS_COLORS.warning;

  /** Colors of the badge of a payment the company has not set up yet. */
  readonly paymentBadgeClass = STATUS_COLORS.warning;

  /** Identifier of the product, from the route. */
  readonly productId = this._activatedRoute.snapshot.paramMap.get('productId') ?? '';
  /** Identifier of the contract, from the route. */
  private readonly _contractId = this._activatedRoute.snapshot.paramMap.get('contractId') ?? '';

  /** Contract shown by the page. */
  contract = signal<CoreResponseContractDto | undefined>(undefined);

  /** First day the suspension can be postponed to: tomorrow. */
  readonly minPostponeDate = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1);

  /** Date the suspension waits for, chosen in the postpone dialog. */
  postponeControl = new FormControl<Date | null>(null);

  /** Action waiting for confirmation. */
  currentAction = signal<ContractAction | null>(null);

  /** Loaded contract, as a stream for the data read alongside it. */
  private readonly _loaded$ = toObservable(this.contract).pipe(
    filter((contract): contract is CoreResponseContractDto => !!contract),
    distinctUntilChanged((previous, current) => previous.id === current.id),
  );

  /** Plan of the contract. */
  readonly plan = toSignal(this._loaded$.pipe(switchMap(contract => this._plansApiService.getPlan(contract.productId, contract.planId))));

  /** Whether the user can withdraw the cancellation of this contract. */
  readonly canManage = computed(() => this._permissions.canChangeContract(Capability.ManageContracts, this.contract()));

  /** Whether the user can record the cancellation of this contract. */
  readonly canCancel = computed(() => this._permissions.canChangeContract(Capability.CancelContracts, this.contract()));

  /** Whether the user can terminate a contract at once. */
  readonly canTerminateNow = computed(() => this._permissions.can(Capability.TerminateContracts));

  /** Changes of the users of the tenant, newest first. */
  readonly seatEvents = computed(() => [...(this.contract()?.seatEvents ?? [])].reverse());

  /** Whether the contract is still in force. */
  readonly isInForce = computed(() => this.contract()?.status !== ContractStatus.Terminated);

  /** Whether the user can suspend and restore the access of a direct contract, or postpone its suspension. */
  readonly canManageAccess = computed(() => this._permissions.can(Capability.ManageAccess) && !this.contract()?.resellerPath);

  /** Date the suspension of the access waits for, while it is still ahead. */
  readonly postponedUntil = computed(() => {
    const until = this.contract()?.suspensionPostponedUntil;
    return until && !this.contract()?.accessSuspendedAt && new Date(until) > new Date() ? until : null;
  });

  /** Whether the user can generate the checkout of the contract. */
  readonly canCollectMandate = computed(() => this._permissions.can(Capability.CollectMandates));

  /** Whether the company must still complete the checkout: no mandate, no subscription. */
  readonly awaitsPayment = computed(() => this.isInForce() && !!this.contract()?.paymentRequired);

  /** End of the period paid: through the reseller on a contract taking over a transferred one, else by Stripe. */
  readonly paidUntil = computed(() => this.contract()?.paidUntil ?? this.contract()?.subscriptionPaidUntil);

  /**
   * Date of the next charge: the period billed to the reseller on an indirect contract, else the end of the period
   * Stripe paid, while the subscription renews.
   */
  readonly nextCharge = computed(() => {
    const contract = this.contract();
    if (contract?.nextBillingDate) return contract.nextBillingDate;
    return contract?.status === ContractStatus.Active && contract.stripeSubscriptionId ? contract.subscriptionPaidUntil : undefined;
  });

  /** Colors of the badge of the payment status in its section: waiting, financed or charged. */
  readonly paymentStatusClass = computed(() => {
    if (this.awaitsPayment()) return STATUS_COLORS.warning;
    return this.contract()?.financed ? STATUS_COLORS.info : STATUS_COLORS.positive;
  });

  /** Why the payment section is off, null while the contract has a payment to follow. */
  readonly paymentHint = computed<string | null>(() => {
    const contract = this.contract();
    if (contract?.resellerPath) return 'Il contratto lo paga il rivenditore.';
    if (!this.isInForce()) return 'Il contratto è cessato.';
    if (!contract?.stripeSubscriptionId && !this.awaitsPayment()) return 'Il contratto non ha un pagamento da seguire.';
    return null;
  });

  /** Sections of the page, chosen freely; the payment only on a direct contract in force that is paid or awaited. */
  readonly tabs = computed<StepTab[]>(() => [
    { id: 'contract', label: 'Contratto', icon: 'lucideScrollText', noFields: true },
    { id: 'seats', label: 'Postazioni', icon: 'lucideUsers', noFields: true },
    { id: 'payment', label: 'Pagamento', icon: 'lucideCreditCard', disabled: this.paymentHint() !== null, hint: this.paymentHint() ?? undefined, noFields: true },
  ]);

  /** Navigation through the sections. */
  readonly steps = formSteps(this.tabs, signal(false));

  /** Checkout link still valid, if any. */
  readonly checkoutUrl = computed(() => {
    const contract = this.contract();
    const expiresAt = contract?.checkoutSessionExpiresAt;
    return contract?.checkoutSessionUrl && expiresAt && new Date(expiresAt) > new Date() ? contract.checkoutSessionUrl : null;
  });

  /**
   * Constructor that loads the contract.
   */
  constructor() {
    // Load the contract on initialization.
    this._load();
  }

  /**
   * Whether the options menu has an entry, so the button is rendered only then.
   * @returns true when the menu is not empty.
   */
  hasMenuActions(): boolean {
    return (this.canCancel() && this.contract()?.status === ContractStatus.Active && Boolean(this.contract()?.renewalDate))
      || (this.canManage() && this.contract()?.status === ContractStatus.Terminating && !this.contract()?.financed)
      || this.canManageAccess()
      || this.canTerminateNow();
  }

  /**
   * Opens the document of the contract in a new tab, through a short-lived link.
   */
  openDocument(): void {
    this._contractsApiService.getDocumentUrl(this.productId, this._contractId).subscribe(url => openInNewTab(url));
  }

  /**
   * Generates the checkout that collects the SEPA mandate of the company and starts the subscription.
   */
  generateCheckout(): void {
    this._contractsApiService.createMandateCheckout(this.productId, this._contractId).subscribe({
      next: (contract) => this._setKeepingPayment(contract),
      error: (error) => console.error('Error generating the checkout:', error)
    });
  }

  /**
   * Copies the checkout link, to send it to the company.
   */
  copyCheckoutLink(): void {
    const url = this.checkoutUrl();
    if (!url) return;
    navigator.clipboard.writeText(url);
    this._toasterService.showSuccess('Link al pagamento copiato');
  }

  /**
   * Opens the checkout link, to fill it in on behalf of the company.
   */
  openCheckoutLink(): void {
    const url = this.checkoutUrl();
    if (url) openInNewTab(url);
  }

  /**
   * Opens the confirmation of an action.
   * @param action the action to confirm.
   */
  openActionDialog(action: ContractAction): void {
    this.postponeControl.reset(null);
    this.currentAction.set(action);
    this.actionDialog()?.open();
  }

  /**
   * Closes the confirmation dialog.
   */
  closeActionDialog(): void {
    this.currentAction.set(null);
    this.actionDialog()?.close();
  }

  /**
   * Runs the confirmed action.
   */
  confirmAction(): void {
    const action = this.currentAction();
    const until = this.postponeControl.value;
    if (!action) return;
    let request$: Observable<CoreResponseContractDto>;
    switch (action) {
      case 'terminate':
        request$ = this._contractsApiService.terminateAtRenewal(this.productId, this._contractId);
        break;
      case 'withdraw':
        request$ = this._contractsApiService.withdrawTermination(this.productId, this._contractId);
        break;
      case 'terminateNow':
        request$ = this._contractsApiService.terminateNow(this.productId, this._contractId);
        break;
      case 'suspend':
        request$ = this._contractsApiService.suspendAccess(this.productId, this._contractId);
        break;
      case 'restore':
        request$ = this._contractsApiService.restoreAccess(this.productId, this._contractId);
        break;
      case 'postpone':
        if (!until || until < this.minPostponeDate) return;
        request$ = this._contractsApiService.postponeSuspension(this.productId, this._contractId, until.toISOString());
        break;
    }
    request$.subscribe({
      next: (contract) => {
        this._setKeepingPayment(contract);
        this.closeActionDialog();
      },
      error: (error) => console.error('Error changing the status of the contract:', error)
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
   * Shows a contract returned by an action, keeping whether it waits for its payment: only the detail tells it.
   * @param contract the contract returned by the action.
   */
  private _setKeepingPayment(contract: CoreResponseContractDto): void {
    this.contract.set({ ...contract, paymentRequired: this.contract()?.paymentRequired });
  }

  /**
   * Loads the contract from the route; a contract the user may not read sends it to access denied.
   */
  private _load(): void {
    this._contractsApiService.getContract(this.productId, this._contractId).subscribe({
      next: (contract) => this.contract.set(contract),
      error: (error) => {
        console.error('Error loading the contract:', error);
        this._router.navigate(['/access-denied']);
      }
    });
  }

  /**
   * Tells whether a date of the contract has already come, to fill its step on the timeline.
   * @param date the date, absent when not set.
   * @returns true when the date is today or before.
   */
  isPast(date: string | null | undefined): boolean {
    return !!date && new Date(date).getTime() <= Date.now();
  }
}

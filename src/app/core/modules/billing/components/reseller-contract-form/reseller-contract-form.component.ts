import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCreditCard, lucideDownload, lucideFileText, lucideHandCoins, lucideLandmark, lucideLink, lucideReceiptEuro } from '@ng-icons/lucide';
import { BrnComboboxImports, comboboxContainsFilter } from '@spartan-ng/brain/combobox';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmDatePickerImports } from '@spartan-ng/helm/date-picker';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmItemImports } from '@spartan-ng/helm/item';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { catchError, map, of } from 'rxjs';
import {
  CoreCreateResellerContractDto,
  CoreResellerFee,
  CoreResponseResellerContractDto,
  CoreResponseResellerTierConfigDto,
  CoreUpdateResellerContractDto,
} from '../../../../../../../libs/api/src';
import { INTEGRATIONS_ENABLED } from '../../../../constants/features';
import { ResellerContractStatus } from '../../../../enums/reseller-contract-status.enum';
import { ResellerTier } from '../../../../enums/reseller-tier.enum';
import { ResellerTierPipe } from '../../../../pipes/reseller-tier/reseller-tier.pipe';
import { ResellerContractsApiService } from '../../../../services/api-services/reseller-contracts/reseller-contracts-api.service';
import { ResellersApiService } from '../../../../services/api-services/resellers/resellers-api.service';
import { ProductsCacheService } from '../../../../services/cache/products-cache.service';
import { COMBOBOX_PAGE_SIZE, remoteOptions } from '../../../../utils/remote-options.util';
import { CreateEditResellerContractForm } from '../../interfaces/create-edit-reseller-contract-form.interface';
import { ResellerContractMandatesComponent } from '../reseller-contract-mandates/reseller-contract-mandates.component';
import { formSteps, sectionsComplete, StepTab } from '../../../../utils/form-steps.util';
import { formChanges } from '../../../../utils/form-changes.util';
import { StepListComponent } from '../../../../components/step-list/step-list.component';

/**
 * Form of a contract between Keus and a reseller. Picking the tier fills the margins and the
 * yearly fee, which are shown but never edited: the contract takes them from the tier. The products
 * of the contract in force are the starting point of a new one.
 */
@Component({
  selector: 'rocket-reseller-contract-form',
  imports: [
    ...BrnComboboxImports,
    ...BrnSelectImports,
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmComboboxImports,
    ...HlmDatePickerImports,
    ...HlmInputImports,
    ...HlmItemImports,
    ...HlmLabelImports,
    ...HlmSelectImports,
    ...HlmTabsImports,
    ...HlmTooltipImports,
    ResellerContractMandatesComponent,
    ResellerTierPipe,
    ReactiveFormsModule,
    NgIcon,
    CurrencyPipe,
    DatePipe,
    StepListComponent,
  ],
  providers: [
    provideIcons({
      lucideCreditCard,
      lucideDownload,
      lucideFileText,
      lucideHandCoins,
      lucideLandmark,
      lucideLink,
      lucideReceiptEuro
    })
  ],
  templateUrl: './reseller-contract-form.component.html',
  styleUrl: './reseller-contract-form.component.css'
})
export class ResellerContractFormComponent {
  /** Resellers api service. */
  private readonly _resellersService = inject(ResellersApiService);
  /** Reseller contracts api service. */
  private readonly _resellerContractsService = inject(ResellerContractsApiService);
  /** Products cache service, for the products a contract can enable. */
  private readonly _productsCacheService = inject(ProductsCacheService);

  /** Contract being edited; absent when a new one is opened. */
  contractData = input<CoreResponseResellerContractDto | undefined>(undefined);

  /** Whether the form shows a new record, whose sections open one after the other. */
  creating = input<boolean>(false);
  /** Whether the terms are read only: past the draft, or without the right to edit them. */
  readonly = input<boolean>(false);
  /** Whether the user can regenerate an expired checkout link. */
  canRefreshCheckout = input<boolean>(false);

  /** Contract statuses, for the template. */
  readonly ResellerContractStatus = ResellerContractStatus;

  /** Partner tiers a contract can be opened on. */
  readonly resellerTiers = Object.values(ResellerTier);
  /** Contains filter of the reseller combobox. */
  readonly comboboxContainsFilter = comboboxContainsFilter;

  /** Form group of the reseller contract. */
  contractForm = new FormGroup<CreateEditResellerContractForm>({
    resellerId: new FormControl<string | null>(null, [Validators.required]),
    tier: new FormControl<CoreCreateResellerContractDto['tier'] | null>(null, [Validators.required]),
    productIds: new FormControl<string[] | null>([], [Validators.required]),
    validityDate: new FormControl<Date | null>(new Date(), [Validators.required]),
    activationPercent: new FormControl<number | null>(null, [Validators.required, Validators.min(0), Validators.max(100)]),
    recurringPercent: new FormControl<number | null>(null, [Validators.required, Validators.min(0), Validators.max(100)]),
    customizationPercent: new FormControl<number | null>(null, [Validators.required, Validators.min(0), Validators.max(100)]),
    firstYearFee: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    secondYearFee: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    ongoingFee: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
  });

  /** Resellers a contract can be opened with, searched by company name. */
  readonly resellers = remoteOptions(search =>
    this._resellersService.listResellers({ limit: COMBOBOX_PAGE_SIZE }, { companyName: search }).pipe(
      map(page => page.items.map(reseller => ({ value: reseller.id, label: `${reseller.companyName} (${reseller.code})` }))),
    ),
  );

  /** Products a reseller can be enabled to sell: the ones open to the indirect channel. */
  readonly resellerProducts = computed(() =>
    this._productsCacheService.products().filter(product => product.resellerPlansEnabled)
  );

  /** Label shown for a product of the contract. */
  readonly productLabel = (id: string): string => this._productsCacheService.products().find(product => product.id === id)?.name ?? '';

  /** Configuration of every partner tier. */
  private readonly _tierConfigs = toSignal(
    this._resellersService.getTierConfigs().pipe(catchError(() => of([] as CoreResponseResellerTierConfigDto[]))),
    { initialValue: [] as CoreResponseResellerTierConfigDto[] }
  );

  /** Contract in force of the chosen reseller, which a new contract succeeds. */
  inForce = signal<CoreResponseResellerContractDto | null>(null);

  /** Whether a new contract is being opened. */
  isCreate = computed(() => !this.contractData());

  /** Whether the contract starts at the renewal of another contract in force. */
  succeedsAnother = computed(() => !!this.inForce() && this.inForce()?.id !== this.contractData()?.id);

  /** Whether the terms can be modified; otherwise their values show as text. */
  isEditable = computed(() => !this.readonly());

  /** Whether reseller and tier can be picked: only while opening the contract, they never change after. */
  isIdentityEditable = computed(() => this.isEditable() && this.isCreate());

  /** Whether the start date can be picked: a contract that succeeds another starts at its renewal. */
  isValidityDateEditable = computed(() => this.isEditable() && !this.succeedsAnother());

  /** Label shown for the selected reseller. */
  readonly resellerOptionLabel = (value: string): string =>
    this.resellers.labelOf(value) ?? this.contractData()?.resellerName ?? '';

  /** Whether the contract takes mandates: from its signing until it ends. */
  readonly takesMandates = computed(() => {
    const status = this.contractData()?.status;
    return status === ResellerContractStatus.Signed || status === ResellerContractStatus.Active || status === ResellerContractStatus.EndedAtRenewal;
  });

  /** Sections of the form; the agreement, the first fee and the mandates once the contract is signed. */
  readonly tabs = computed<StepTab[]>(() => [
    { id: 'conditions', label: 'Condizioni', icon: 'lucideHandCoins' },
    { id: 'fee', label: 'Canone', icon: 'lucideReceiptEuro', noFields: true },
    { id: 'signed', label: 'Contratto firmato', icon: 'lucideFileText', disabled: !this.contractData()?.signedContractS3Key, hint: 'Il contratto firmato si carica con la firma.', noFields: true },
    // Demo mode (INTEGRATIONS_ENABLED=false), not part of the original Rocket.
    ...(INTEGRATIONS_ENABLED ? [{ id: 'payments', label: 'Pagamenti', icon: 'lucideLandmark', disabled: !this.takesMandates(), hint: 'Canone e mandati SEPA si attivano dopo la firma del contratto.', noFields: true }] : []),
  ]);

  /** Navigation through the sections, one after the other while creating, each once its required fields are valid. */
  readonly steps = formSteps(this.tabs, this.creating, sectionsComplete(this.contractForm, {
    conditions: ['resellerId', 'tier', 'productIds', 'validityDate', 'activationPercent', 'recurringPercent', 'customizationPercent'],
    fee: ['firstYearFee', 'secondYearFee', 'ongoingFee'],
  }));

  /** Whether the form holds changes to save: a value brought back to where it was is no change. */
  readonly changed = formChanges(this.contractForm);

  /** Whether the checkout session has expired. */
  checkoutExpired = computed(() => {
    const expiresAt = this.contractData()?.checkoutSessionExpiresAt;
    return !!expiresAt && new Date(expiresAt) < new Date();
  });

  /** Asks to download the signed agreement. */
  downloadRequested = output<void>();
  /** Asks to regenerate the checkout link. */
  refreshCheckoutRequested = output<void>();

  /**
   * Constructor that wires the prefill from the tier and the population from an existing contract.
   */
  constructor() {
    // Populate the form from the contract being edited.
    effect(() => {
      const contract = this.contractData();
      const readonly = this.readonly();
      if (!contract) return;
      untracked(() => this._populate(contract, readonly));
    });

    // Load the contract in force of the reseller picked for a new contract.
    this.contractForm.controls.resellerId.valueChanges.pipe(takeUntilDestroyed()).subscribe(resellerId => {
      if (this.isCreate()) this._loadInForce(resellerId);
    });

    // Preload the margins and the fee of the tier picked for a new contract.
    this.contractForm.controls.tier.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.isCreate()) this._applyTierDefaults();
    });
  }

  /**
   * Builds the body that opens a new contract.
   * @returns the create DTO.
   */
  buildCreateDto(): CoreCreateResellerContractDto {
    const value = this.contractForm.getRawValue();
    return {
      tier: value.tier!,
      productIds: value.productIds ?? [],
      ...(!this.succeedsAnother() && value.validityDate ? { validityDate: value.validityDate.toISOString() } : {}),
      margin: this._marginOf(),
      fee: this._feeOf(),
    };
  }

  /**
   * Builds the body that updates a draft, with the products and the start date when they changed.
   * @returns the update DTO.
   */
  buildUpdateDto(): CoreUpdateResellerContractDto {
    const controls = this.contractForm.controls;
    return {
      ...(controls.productIds.dirty ? { productIds: controls.productIds.value ?? [] } : {}),
      ...(controls.validityDate.dirty && controls.validityDate.value ? { validityDate: controls.validityDate.value.toISOString() } : {}),
    };
  }

  /**
   * Formats a date for the date pickers.
   * @param date the date to format.
   * @returns the formatted date.
   */
  formatDate(date: Date | null): string {
    if (!date) return '';
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  }

  /**
   * Fills the form from an existing contract; reseller and tier never change on a contract.
   * @param contract the contract being edited.
   * @param readonly whether the terms are frozen.
   */
  private _populate(contract: CoreResponseResellerContractDto, readonly: boolean): void {
    this.contractForm.patchValue({
      resellerId: contract.resellerId,
      tier: contract.tier,
      productIds: contract.productIds,
      validityDate: new Date(contract.validityDate),
      activationPercent: contract.margin?.activationPercent ?? null,
      recurringPercent: contract.margin?.recurringPercent ?? null,
      customizationPercent: contract.margin?.customizationPercent ?? null,
      firstYearFee: contract.fee.firstYearCents / 100,
      secondYearFee: contract.fee.secondYearCents / 100,
      ongoingFee: contract.fee.ongoingCents / 100,
    }, { emitEvent: false });
    this.contractForm.markAsPristine();

    if (readonly) {
      this.contractForm.disable({ emitEvent: false });
    } else {
      this.contractForm.enable({ emitEvent: false });
      this.contractForm.controls.resellerId.disable({ emitEvent: false });
      this.contractForm.controls.tier.disable({ emitEvent: false });
    }

    this._loadInForce(contract.resellerId);
  }

  /**
   * Loads the contract in force of a reseller: a new contract starts at its renewal.
   * @param resellerId the reseller.
   */
  private _loadInForce(resellerId: string | null): void {
    this.inForce.set(null);
    if (!resellerId) return;
    this._resellerContractsService.getContractInForce(resellerId).pipe(catchError(() => of(null))).subscribe(contract => {
      this.inForce.set(contract);
      if (!this.isCreate()) {
        if (this.succeedsAnother()) this.contractForm.controls.validityDate.disable({ emitEvent: false });
        return;
      }
      const validityDate = this.contractForm.controls.validityDate;
      if (contract && !this.contractForm.controls.productIds.dirty) {
        this.contractForm.controls.productIds.setValue(contract.productIds);
      }
      if (contract) {
        const renewal = new Date(contract.validityDate);
        renewal.setFullYear(renewal.getFullYear() + contract.validityYears);
        validityDate.setValue(renewal);
        validityDate.disable();
      } else {
        validityDate.enable();
      }
    });
  }

  /**
   * Fills the margins and the fee of a new contract from its tier.
   */
  private _applyTierDefaults(): void {
    const config = this._tierConfigs().find(candidate => candidate.tier === this.contractForm.controls.tier.value);
    if (!config) return;
    this.contractForm.patchValue({
      activationPercent: config.activationDiscountPercent,
      recurringPercent: config.subscriptionDiscountPercent,
      customizationPercent: config.customizationDiscountPercent,
      firstYearFee: config.firstYearFeeCents / 100,
      secondYearFee: config.secondYearFeeCents / 100,
      ongoingFee: config.ongoingFeeCents / 100,
    });
  }

  /**
   * Reads the margin in the shape the API takes.
   * @returns the margin.
   */
  private _marginOf(): { activationPercent: number; recurringPercent: number; customizationPercent: number } {
    const value = this.contractForm.getRawValue();
    return {
      activationPercent: value.activationPercent ?? 0,
      recurringPercent: value.recurringPercent ?? 0,
      customizationPercent: value.customizationPercent ?? 0,
    };
  }

  /**
   * Reads the fee in the shape the API takes, in cents.
   * @returns the fee.
   */
  private _feeOf(): CoreResellerFee {
    const value = this.contractForm.getRawValue();
    return {
      firstYearCents: Math.round((value.firstYearFee ?? 0) * 100),
      secondYearCents: Math.round((value.secondYearFee ?? 0) * 100),
      ongoingCents: Math.round((value.ongoingFee ?? 0) * 100),
    };
  }
}

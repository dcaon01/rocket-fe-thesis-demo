import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { provideIcons } from '@ng-icons/core';
import { lucideCalendarClock, lucideReceipt } from '@ng-icons/lucide';
import { BrnComboboxImports, comboboxContainsFilter } from '@spartan-ng/brain/combobox';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmDatePickerImports } from '@spartan-ng/helm/date-picker';
import { HlmError } from '@spartan-ng/helm/form-field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { map, of, switchMap } from 'rxjs';
import { CoreCreateCustomerChargeDto, CoreResponseCustomerChargeDto, CoreUpdateCustomerChargeDto } from '../../../../../../../libs/api/src';
import { ChargeCadence } from '../../../../enums/charge-cadence.enum';
import { CustomerChargeKind } from '../../../../enums/customer-charge-kind.enum';
import { ChargeCadencePipe } from '../../../../pipes/charge-cadence/charge-cadence.pipe';
import { CompaniesApiService } from '../../../../services/api-services/companies/companies-api.service';
import { ResellersApiService } from '../../../../services/api-services/resellers/resellers-api.service';
import { AppContextService } from '../../../../services/app-context/app-context.service';
import { COMBOBOX_PAGE_SIZE, remoteOptions } from '../../../../utils/remote-options.util';
import { notBeforeValidator } from '../../../../validators/not-before.validator';
import { CreateEditCustomerChargeForm } from '../../interfaces/create-edit-customer-charge-form.interface';
import { MoneyInputDirective } from '../../../../directives/money-input.directive';
import { formSteps, sectionsComplete, StepTab } from '../../../../utils/form-steps.util';
import { formChanges } from '../../../../utils/form-changes.util';
import { StepListComponent } from '../../../../components/step-list/step-list.component';

/**
 * Form of an item the reseller of the workspace bills one of its customers, beyond the shares of its contracts: the
 * customer, what it bills and how much, then when it falls due, once or on a recurring rule. Kind and customer stay
 * as they are once the item exists.
 */
@Component({
  selector: 'rocket-customer-charge-form',
  imports: [
    ...BrnComboboxImports,
    ...BrnSelectImports,
    ...HlmButtonImports,
    ...HlmTooltipImports,
    ...HlmCardImports,
    ...HlmComboboxImports,
    ...HlmDatePickerImports,
    HlmError,
    ...HlmInputImports,
    ...HlmLabelImports,
    ...HlmSelectImports,
    ...HlmTabsImports,
    ...HlmTextareaImports,
    ChargeCadencePipe,
    MoneyInputDirective,
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    StepListComponent,
  ],
  providers: [provideIcons({ lucideCalendarClock, lucideReceipt })],
  templateUrl: './customer-charge-form.component.html',
})
export class CustomerChargeFormComponent {
  /** Companies API service instance. */
  private readonly _companiesApiService = inject(CompaniesApiService);

  /** Resellers API service instance. */
  private readonly _resellersApiService = inject(ResellersApiService);

  /** App context service instance. */
  private readonly _context = inject(AppContextService);

  /** The item to edit, absent while creating one. */
  chargeData = input<CoreResponseCustomerChargeDto | undefined>(undefined);

  /** Whether the form shows a new record, whose sections open one after the other. */
  creating = input<boolean>(false);

  /** Whether the form is shown without being editable, as for the share of a contract. */
  readonly = input<boolean>(false);

  /** Kinds of item a reseller adds by hand. */
  readonly kinds = [CustomerChargeKind.OneOff, CustomerChargeKind.Recurring];

  /** Cadences of a recurring item. */
  readonly cadences = Object.values(ChargeCadence);

  /** Kind of a one-off item. */
  readonly oneOff = CustomerChargeKind.OneOff;

  /** Kind of the share of a contract, which Rocket writes with a single due date. */
  readonly contractShare = CustomerChargeKind.Contract;

  /** Filter function used by the combobox to match items against the current search. */
  readonly comboboxContainsFilter = comboboxContainsFilter;

  /** Converts a company identifier to its label, used by the combobox for filtering and display. */
  readonly companyLabel = (companyId: string): string => this.companies.labelOf(companyId) ?? '';

  /** Code of the reseller whose workspace is open, to offer its companies only. */
  private readonly _resellerCode = toSignal(
    toObservable(this._context.resellerId).pipe(
      switchMap(resellerId => resellerId
        ? this._resellersApiService.getReseller(resellerId).pipe(map(reseller => reseller.code))
        : of(null)),
    ),
    { initialValue: null },
  );

  /** Customers of the reseller, searched by legal name. */
  readonly companies = remoteOptions(search =>
    this._companiesApiService.listCompanies({ limit: COMBOBOX_PAGE_SIZE }, { name: search, resellerCode: this._resellerCode() ?? undefined }).pipe(
      map(page => page.items.map(company => ({ value: company.id, label: this._companyLabelOf(company.name, company.vatNumber) }))),
    ),
  );

  /** Form group of the item. */
  chargeForm = new FormGroup<CreateEditCustomerChargeForm>({
    companyId: new FormControl<string | null>(null, [Validators.required]),
    description: new FormControl<string | null>(null, [Validators.required]),
    amount: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    kind: new FormControl<CustomerChargeKind | null>(CustomerChargeKind.OneOff, [Validators.required]),
    dueDate: new FormControl<Date | null>(null),
    ruleStart: new FormControl<Date | null>(null),
    cadence: new FormControl<ChargeCadence | null>(null),
    ruleEnd: new FormControl<Date | null>(null),
  });

  /** Ordered definition of the form sections shown in the sidebar navigation. */
  readonly tabs: StepTab[] = [
    { id: 'voce', label: 'Voce', icon: 'lucideReceipt' },
    { id: 'scadenza', label: 'Scadenza', icon: 'lucideCalendarClock' },
  ];

  /** Navigation through the sections, one after the other while creating, each once its required fields are valid. */
  readonly steps = formSteps(signal(this.tabs), this.creating, sectionsComplete(this.chargeForm, {
    voce: ['companyId', 'description', 'amount'],
    scadenza: ['kind', 'dueDate', 'ruleStart', 'cadence', 'ruleEnd'],
  }));

  /** Whether the form holds changes to save: a value brought back to where it was is no change. */
  readonly changed = formChanges(this.chargeForm);

  /** Kind chosen in the form. */
  selectedKind = toSignal(this.chargeForm.controls.kind.valueChanges, { initialValue: this.chargeForm.controls.kind.value });

  /** Whether the item has a single due date: a one-off item or the share of a contract. */
  hasSingleDueDate = computed(() => this.selectedKind() === this.oneOff || this.selectedKind() === this.contractShare);

  /** Whether the fields of the item can be changed. */
  isEditable = computed(() => !this.readonly());

  /** Whether customer and kind can be chosen: only while adding an editable item. */
  isIdentityEditable = computed(() => !this.readonly() && !this.chargeData());

  /**
   * Constructor of the component.
   */
  constructor() {
    // Ask for the due date of a one-off item, or for the rule of a recurring one.
    this.chargeForm.controls.kind.valueChanges.pipe(takeUntilDestroyed()).subscribe(kind => this._applyKindValidators(kind));
    this._applyKindValidators(this.chargeForm.controls.kind.value);

    // Check the end again when the first due date moves.
    this.chargeForm.controls.ruleStart.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.chargeForm.controls.ruleEnd.updateValueAndValidity());

    // Fill the form with the item to edit; kind and customer stay as they are.
    effect(() => {
      const charge = this.chargeData();
      if (!charge) return;

      untracked(() => {
        this.companies.remember({ value: charge.companyId, label: charge.companyName });
        this.chargeForm.reset({
          companyId: charge.companyId,
          description: charge.description,
          amount: charge.amountCents / 100,
          kind: charge.kind as CustomerChargeKind,
          dueDate: charge.dueDate ? this._localDay(charge.dueDate) : null,
          ruleStart: charge.ruleStart ? this._localDay(charge.ruleStart) : null,
          cadence: (charge.cadence as ChargeCadence | undefined) ?? null,
          ruleEnd: charge.ruleEnd ? this._localDay(charge.ruleEnd) : null,
        });
        this.chargeForm.controls.kind.disable();
        this.chargeForm.controls.companyId.disable();
      });
    });

    // A read-only item shows its values without letting them change.
    effect(() => {
      if (this.readonly()) {
        untracked(() => this.chargeForm.disable());
      }
    });
  }

  /**
   * Builds the body that adds the item.
   * @returns the create DTO.
   */
  buildCreateDto(): CoreCreateCustomerChargeDto {
    const value = this.chargeForm.getRawValue();
    const oneOff = value.kind === CustomerChargeKind.OneOff;

    return {
      kind: value.kind as CoreCreateCustomerChargeDto['kind'],
      companyId: value.companyId!,
      description: value.description!.trim(),
      amountCents: Math.round(value.amount! * 100),
      ...(oneOff && value.dueDate ? { dueDate: this._utcDay(value.dueDate) } : {}),
      ...(!oneOff && value.ruleStart ? { ruleStart: this._utcDay(value.ruleStart) } : {}),
      ...(!oneOff && value.cadence ? { cadence: value.cadence } : {}),
      ...(!oneOff && value.ruleEnd ? { ruleEnd: this._utcDay(value.ruleEnd) } : {}),
    };
  }

  /**
   * Builds the body that changes the item, with the changed fields only; an end cleared lets a recurring item go on.
   * @returns the update DTO.
   */
  buildUpdateDto(): CoreUpdateCustomerChargeDto {
    const controls = this.chargeForm.controls;

    return {
      ...(controls.description.dirty && controls.description.value ? { description: controls.description.value.trim() } : {}),
      ...(controls.amount.dirty && controls.amount.value != null ? { amountCents: Math.round(controls.amount.value * 100) } : {}),
      ...(controls.dueDate.dirty && controls.dueDate.value ? { dueDate: this._utcDay(controls.dueDate.value) } : {}),
      ...(controls.ruleStart.dirty && controls.ruleStart.value ? { ruleStart: this._utcDay(controls.ruleStart.value) } : {}),
      ...(controls.cadence.dirty && controls.cadence.value ? { cadence: controls.cadence.value } : {}),
      ...(controls.ruleEnd.dirty ? { ruleEnd: controls.ruleEnd.value ? this._utcDay(controls.ruleEnd.value) : null } : {}),
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
   * Asks for the due date of a one-off item, or for the start and the cadence of a recurring one, whose end may not
   * come before its start.
   * @param kind the kind chosen.
   */
  private _applyKindValidators(kind: CustomerChargeKind | null): void {
    const { dueDate, ruleStart, cadence, ruleEnd } = this.chargeForm.controls;
    const oneOff = kind === CustomerChargeKind.OneOff;

    dueDate.setValidators(oneOff ? [Validators.required] : []);
    ruleStart.setValidators(oneOff ? [] : [Validators.required]);
    cadence.setValidators(oneOff ? [] : [Validators.required]);
    ruleEnd.setValidators(oneOff ? [] : [notBeforeValidator(ruleStart)]);

    dueDate.updateValueAndValidity();
    ruleStart.updateValueAndValidity();
    cadence.updateValueAndValidity();
    ruleEnd.updateValueAndValidity();
  }

  /**
   * Turns the day chosen in a date picker into the midnight of that day in UTC, the day the backend counts.
   * @param date the day chosen, at local midnight.
   * @returns the day (ISO).
   */
  private _utcDay(date: Date): string {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString();
  }

  /**
   * Turns a day of the backend, at midnight UTC, into the local midnight of the same day that the date picker shows.
   * @param iso the day (ISO).
   * @returns the same day, at local midnight.
   */
  private _localDay(iso: string): Date {
    const date = new Date(iso);
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }

  /**
   * Builds the label of a company in the combobox.
   * @param name the legal name.
   * @param vatNumber the VAT number, if any.
   * @returns the label.
   */
  private _companyLabelOf(name: string, vatNumber: string | undefined): string {
    return vatNumber ? `${name} · ${vatNumber}` : name;
  }
}

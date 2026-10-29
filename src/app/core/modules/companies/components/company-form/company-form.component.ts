import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BrnComboboxImports, comboboxContainsFilter } from '@spartan-ng/brain/combobox';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { LEGAL_ADDRESS_COUNTRY, PROVINCES, provinceLabel } from '../../../../constants/legal-address';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBuilding2, lucideContact, lucideLandmark, lucideMail, lucideMapPin, lucidePhone, lucideReceiptText, lucideScrollText, lucideSend, lucideServer, lucideUserRound, lucideUsers } from '@ng-icons/lucide';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmError } from '@spartan-ng/helm/form-field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { CoreCompanyReferent, CoreLegalAddress, CoreResponseCompanyDto } from '../../../../../../../libs/api/src';
import { CompanyLegalAddressForm, CompanyReferentForm, CreateEditCompanyForm } from '../../interfaces/create-edit-company-form.interface';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { CompanyContractsComponent } from '../company-contracts/company-contracts.component';
import { CompanyTenantsComponent } from '../company-tenants/company-tenants.component';
import { CompanyUsersComponent } from '../company-users/company-users.component';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { Capability } from '../../../../enums/capability.enum';
import { formSteps, sectionsComplete, StepTab } from '../../../../utils/form-steps.util';
import { formChanges } from '../../../../utils/form-changes.util';
import { CompaniesApiService } from '../../../../services/api-services/companies/companies-api.service';
import { AppContextService } from '../../../../services/app-context/app-context.service';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { StepListComponent } from '../../../../components/step-list/step-list.component';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { CompanyStatusDirective } from '../../../../directives/company-status.directive';
import { AddressItemComponent } from '../../../../components/address-item/address-item.component';
import { ContactItemComponent } from '../../../../components/contact-item/contact-item.component';
import { CodeItemComponent } from '../../../../components/code-item/code-item.component';

/**
 * Component for the company form used in creating or editing companies.
 */
@Component({
  selector: 'rocket-company-form',
  imports: [
    ...BrnComboboxImports,
    ...HlmComboboxImports,
    ...HlmLabelImports,
    ...HlmInputImports,
    ...HlmSelectImports,
    ...BrnSelectImports,
    ReactiveFormsModule,
    HlmError,
    ...HlmTabsImports,
    ...HlmCardImports,
    ...HlmButtonImports,
    ...HlmTooltipImports,
    ...HlmBadgeImports,
    ...HlmAvatarImports,
    CompanyContractsComponent,
    CompanyTenantsComponent,
    CompanyUsersComponent,
    RouterLink,
    StepListComponent,
    AddressItemComponent,
    ContactItemComponent,
    CodeItemComponent,
    CompanyStatusDirective,
    NgIcon,
  ],
  providers: [
    provideIcons({
      lucideBuilding2,
      lucideContact,
      lucideLandmark,
      lucideMail,
      lucideMapPin,
      lucidePhone,
      lucideReceiptText,
      lucideScrollText,
      lucideServer,
      lucideUserRound,
      lucideUsers,
      lucideSend
    }),
  ],
  templateUrl: './company-form.component.html',
  styleUrl: './company-form.component.css'
})
export class CompanyFormComponent {
  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Companies API service instance. */
  private readonly _companiesApiService = inject(CompaniesApiService);

  /** App context service instance, for the links of the area. */
  private readonly _context = inject(AppContextService);

  /** Signal to hold company data for the edit company form. */
  companyData = input<CoreResponseCompanyDto | undefined>(undefined);

  /** Whether the form shows a new record, whose sections open one after the other. */
  creating = input<boolean>(false);

  /** Other records of the same real company, linked by a transfer, with their name and link; empty until read. */
  readonly twins = toSignal(
    toObservable(computed(() => this.companyData()?.sameAsCompanyIds ?? [])).pipe(
      switchMap(ids => ids.length === 0
        ? of([])
        : forkJoin(ids.map(id => this._companiesApiService.getCompany(id).pipe(catchError(() => of(null)))))),
      map(companies => companies
        .filter((company): company is CoreResponseCompanyDto => !!company)
        .map(company => ({ id: company.id, name: company.name, url: this._context.resolveUrl(`/companies/edit/${company.id}`) }))),
    ),
    { initialValue: [] },
  );

  /** Whether the form is shown read-only, to users who cannot edit companies. */
  readonly = input<boolean>(false);

  /** Regex pattern for Italian phone numbers (with or without +39 prefix). */
  private readonly phonePattern = /^(\+39[\s]?)?[0-9]{2,4}[\s]?[0-9]{6,8}$/;

  /** Regex pattern for Italian VAT number (11 digits). */
  private readonly vatPattern = /^[0-9]{11}$/;

  /** Regex pattern for SDI code (7 alphanumeric characters). */
  private readonly sdiPattern = /^[A-Z0-9]{7}$/i;

  /** Regex pattern for an IBAN: two letters, two check digits, up to 30 alphanumerics. */
  private readonly ibanPattern = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/i;

  /** Regex pattern for a fiscal code: 16 characters for a person, 11 digits for a company. */
  private readonly fiscalCodePattern = /^([A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]|[0-9]{11})$/i;

  /** Regex pattern for an Italian postal code (5 digits). */
  private readonly zipCodePattern = /^[0-9]{5}$/;


  /** Form group for creating/editing a company. */
  companyForm = new FormGroup<CreateEditCompanyForm>({
    name: new FormControl<string | null>(null, [Validators.required]),
    email: new FormControl<string | null>(null, [Validators.required, Validators.email]),
    phoneNumber: new FormControl<string | null>(null, [Validators.pattern(this.phonePattern)]),
    legalAddress: new FormGroup<CompanyLegalAddressForm>({
      street: new FormControl<string | null>(null, [Validators.required]),
      city: new FormControl<string | null>(null, [Validators.required]),
      zipCode: new FormControl<string | null>(null, [Validators.required, Validators.pattern(this.zipCodePattern)]),
      province: new FormControl<string | null>(null, [Validators.required]),
    }),
    referent: new FormGroup<CompanyReferentForm>({
      firstName: new FormControl<string | null>(null),
      lastName: new FormControl<string | null>(null),
      email: new FormControl<string | null>(null, [Validators.email]),
      phoneNumber: new FormControl<string | null>(null, [Validators.pattern(this.phonePattern)]),
    }),
    vatNumber: new FormControl<string | null>(null, [Validators.required, Validators.pattern(this.vatPattern)]),
    pec: new FormControl<string | null>(null, [Validators.required, Validators.email]),
    sdi: new FormControl<string | null>(null, [Validators.required, Validators.pattern(this.sdiPattern)]),
    fiscalCode: new FormControl<string | null>(null, [Validators.required, Validators.pattern(this.fiscalCodePattern)]),
    iban: new FormControl<string | null>(null, [Validators.pattern(this.ibanPattern)]),
    status: new FormControl<'ACTIVE' | 'INACTIVE' | null>('ACTIVE', [Validators.required]),
  });

  /** Whether the user reads the tenants of the company. */
  readonly canViewTenants = computed(() => this._permissions.can(Capability.ViewTenants));

  /** Whether the user reads the users of the company. */
  readonly canViewUsers = computed(() => this._permissions.can(Capability.ViewUsers));

  /**
   * Ordered form sections of the sidebar; contracts, tenants and users need an existing company, so they stay
   * disabled while creating.
   */
  readonly tabs = computed<StepTab[]>(() => [
    { id: 'anagrafica', label: 'Anagrafica', icon: 'lucideBuilding2' },
    { id: 'contatti', label: 'Contatti', icon: 'lucideContact' },
    { id: 'referente', label: 'Referente', icon: 'lucideUserRound' },
    { id: 'fatturazione', label: 'Fatturazione', icon: 'lucideReceiptText' },
    { id: 'contratti', label: 'Contratti', icon: 'lucideScrollText', disabled: !this.companyData(), hint: 'I contratti nascono dagli ordini consegnati all\'azienda.', noFields: true },
    ...(this.canViewTenants() ? [{ id: 'tenant', label: 'Tenant', icon: 'lucideServer', disabled: !this.companyData(), hint: 'I tenant nascono dagli ordini consegnati all\'azienda.', noFields: true }] : []),
    ...(this.canViewUsers() ? [{ id: 'utenti', label: 'Utenti', icon: 'lucideUsers', disabled: !this.companyData(), hint: 'Gli utenti si aggiungono ai tenant dell\'azienda.', noFields: true }] : []),
  ]);

  /** Navigation through the sections, one after the other while creating, each once its required fields are valid. */
  readonly steps = formSteps(this.tabs, this.creating, sectionsComplete(this.companyForm, {
    anagrafica: ['name', 'legalAddress', 'status'],
    contatti: ['email', 'phoneNumber'],
    referente: ['referent'],
    fatturazione: ['vatNumber', 'pec', 'sdi', 'fiscalCode', 'iban'],
  }));

  /** Whether the form holds changes to save: a value brought back to where it was is no change. */
  readonly changed = formChanges(this.companyForm);

  /** Italian provinces offered by the legal address. */
  readonly provinces = PROVINCES;

  /** Label of a province, for the combobox and the read-only value. */
  readonly provinceLabel = provinceLabel;

  /** Country of the legal address, fixed and shown read-only. */
  readonly country = LEGAL_ADDRESS_COUNTRY;

  /** Filter of the province combobox. */
  readonly comboboxContainsFilter = comboboxContainsFilter;

  /**
   * Constructor that initializes the component and sets up the
   * effect to populate the form if company data is provided.
   */
  constructor() {
    effect(() => {
      const companyData = this.companyData();
      if (companyData) {
        this.companyForm.setValue({
          name: companyData.name || null,
          email: companyData.email || null,
          phoneNumber: companyData.phoneNumber || null,
          legalAddress: {
            street: companyData.legalAddress?.street || null,
            city: companyData.legalAddress?.city || null,
            zipCode: companyData.legalAddress?.zipCode || null,
            province: companyData.legalAddress?.province || null,
          },
          referent: {
            firstName: companyData.referent?.firstName || null,
            lastName: companyData.referent?.lastName || null,
            email: companyData.referent?.email || null,
            phoneNumber: companyData.referent?.phoneNumber || null,
          },
          vatNumber: companyData.vatNumber || null,
          pec: companyData.pec || null,
          sdi: companyData.sdi || null,
          fiscalCode: companyData.fiscalCode || null,
          iban: companyData.iban || null,
          status: companyData.status || 'ACTIVE'
        });
        // Another company, as a twin link opens, starts with nothing to save.
        this.companyForm.markAsPristine();
      }
    });

    // Freeze the whole form for read-only users, after the data has been applied.
    effect(() => {
      this.companyData();
      if (this.readonly()) {
        untracked(() => this.companyForm.disable({ emitEvent: false }));
      }
    });
  }

  /**
   * Builds the legal address in the shape the API takes.
   * @returns the address, or null when every field is empty.
   */
  buildLegalAddress(): CoreLegalAddress | null {
    const address = this.companyForm.controls.legalAddress.getRawValue();
    if (!address.street || !address.city || !address.zipCode) {
      return null;
    }
    return {
      street: address.street,
      city: address.city,
      zipCode: address.zipCode,
      ...(address.province ? { province: address.province } : {}),
      country: LEGAL_ADDRESS_COUNTRY,
    };
  }

  /**
   * Builds the referent in the shape the API takes.
   * @returns the filled fields of the referent, or null when every field is empty.
   */
  buildReferent(): CoreCompanyReferent | null {
    const referent = this.companyForm.controls.referent.getRawValue();
    if (!Object.values(referent).some(Boolean)) {
      return null;
    }
    return {
      ...(referent.firstName ? { firstName: referent.firstName } : {}),
      ...(referent.lastName ? { lastName: referent.lastName } : {}),
      ...(referent.email ? { email: referent.email } : {}),
      ...(referent.phoneNumber ? { phoneNumber: referent.phoneNumber } : {}),
    };
  }

  /**
   * Joins first and last name of the referent.
   * @returns the full name, empty when neither is set.
   */
  referentName(): string {
    const referent = this.companyForm.controls.referent.getRawValue();

    return [referent.firstName, referent.lastName].filter(Boolean).join(' ');
  }

  /**
   * Takes the initials of the referent for the avatar.
   * @returns up to two initials, empty when there is no name.
   */
  referentInitials(): string {
    const referent = this.companyForm.controls.referent.getRawValue();

    return [referent.firstName, referent.lastName].map(part => part?.trim().charAt(0) ?? '').join('').toUpperCase();
  }
}

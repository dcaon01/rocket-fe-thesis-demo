import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { CodeItemComponent } from '../../../../components/code-item/code-item.component';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BrnComboboxImports, comboboxContainsFilter } from '@spartan-ng/brain/combobox';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { LEGAL_ADDRESS_COUNTRY, PROVINCES, provinceLabel } from '../../../../constants/legal-address';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideDownload,
  lucideFileText,
  lucideImage,
  lucideInfo,
  lucideLandmark,
  lucidePackage,
} from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmError } from '@spartan-ng/helm/form-field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { CoreLegalAddress, CoreResponseResellerContractDto, CoreResponseResellerDto } from '../../../../../../../libs/api/src';
import { ContractStatusDirective } from '../../../../directives/contract-status.directive';
import { ContractStatusPipe } from '../../../../pipes/contract-status/contract-status.pipe';
import { ResellerTierPipe } from '../../../../pipes/reseller-tier/reseller-tier.pipe';
import { S3UploadService } from '../../../../services/api-services/s3/s3-upload.service';
import { ResellerLogoComponent } from '../../../resellers/components/reseller-logo/reseller-logo.component';
import { ResellerLegalAddressForm } from '../../../resellers/interfaces/create-edit-reseller-form.interface';
import { ResellerCompanyDataForm } from '../../interfaces/reseller-company-data-form.interface';
import { ResellerProductsComponent } from '../reseller-products/reseller-products.component';
import { openInNewTab } from '../../../../utils/open-in-new-tab.util';
import { formSteps, StepTab } from '../../../../utils/form-steps.util';
import { formChanges } from '../../../../utils/form-changes.util';
import { StepListComponent } from '../../../../components/step-list/step-list.component';

/**
 * Reseller card of the workspace, split in sections like the edit pages: company data,
 * legal address and fiscal data, enabled products, contract in force and logo.
 * The page owns the save and reads the form through a template reference.
 * Usage: <rocket-reseller-card #card [reseller]="reseller" [contract]="contract" [editable]="canEdit" [showEconomics]="canViewEconomics" />
 */
@Component({
  selector: 'rocket-reseller-card',
  imports: [
    ...BrnComboboxImports,
    ...HlmComboboxImports,
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmCardImports,
    ...HlmEmptyImports,
    ...HlmInputImports,
    ...HlmLabelImports,
    ...HlmTabsImports,
    ...HlmTooltipImports,
    HlmError,
    ResellerLogoComponent,
    ResellerProductsComponent,
    ContractStatusDirective,
    ContractStatusPipe,
    ResellerTierPipe,
    ReactiveFormsModule,
    NgIcon,
    CurrencyPipe,
    DatePipe,
    StepListComponent,
    CodeItemComponent,
  ],
  providers: [
    provideIcons({
      lucideDownload,
      lucideFileText,
      lucideImage,
      lucideInfo,
      lucideLandmark,
      lucidePackage,
    })
  ],
  templateUrl: './reseller-card.component.html',
})
export class ResellerCardComponent {
  /** S3 upload service instance. */
  private readonly _s3UploadService = inject(S3UploadService);

  /** Reseller whose card is shown. */
  reseller = input.required<CoreResponseResellerDto>();

  /** Contract in force of the reseller; null when it has none. */
  contract = input<CoreResponseResellerContractDto | null>(null);

  /** Whether the user can change the company data. */
  editable = input<boolean>(false);

  /** Whether the user can read tier, fee and discounts. */
  showEconomics = input<boolean>(false);

  /** Regex pattern for Italian phone numbers (with or without +39 prefix). */
  private readonly _phonePattern = /^(\+39[\s]?)?[0-9]{2,4}[\s]?[0-9]{6,8}$/;

  /** Regex pattern for Italian VAT number (11 digits). */
  private readonly _vatPattern = /^[0-9]{11}$/;

  /** Regex pattern for SDI code (7 alphanumeric characters). */
  private readonly _sdiPattern = /^[A-Z0-9]{7}$/i;

  /** Regex pattern for an IBAN: two letters, two check digits, up to 30 alphanumerics. */
  private readonly _ibanPattern = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/i;

  /** Regex pattern for a fiscal code: 16 characters for a person, 11 digits for a company. */
  private readonly _fiscalCodePattern = /^([A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]|[0-9]{11})$/i;

  /** Regex pattern for an Italian postal code (5 digits). */
  private readonly _zipCodePattern = /^[0-9]{5}$/;


  /** Form group with the company data of the reseller. */
  companyDataForm = new FormGroup<ResellerCompanyDataForm>({
    email: new FormControl<string | null>(null, [Validators.required, Validators.email]),
    phoneNumber: new FormControl<string | null>(null, [Validators.pattern(this._phonePattern)]),
    pec: new FormControl<string | null>(null, [Validators.required, Validators.email]),
    legalAddress: new FormGroup<ResellerLegalAddressForm>({
      street: new FormControl<string | null>(null, [Validators.required]),
      city: new FormControl<string | null>(null, [Validators.required]),
      zipCode: new FormControl<string | null>(null, [Validators.required, Validators.pattern(this._zipCodePattern)]),
      province: new FormControl<string | null>(null, [Validators.required]),
    }),
    vatNumber: new FormControl<string | null>(null, [Validators.required, Validators.pattern(this._vatPattern)]),
    sdi: new FormControl<string | null>(null, [Validators.required, Validators.pattern(this._sdiPattern)]),
    fiscalCode: new FormControl<string | null>(null, [Validators.required, Validators.pattern(this._fiscalCodePattern)]),
    iban: new FormControl<string | null>(null, [Validators.pattern(this._ibanPattern)]),
  });

  /** Ordered sections of the sidebar; the contract only for who reads the economic terms. */
  readonly tabs = computed<StepTab[]>(() => [
    { id: 'info', label: 'Informazioni di base', icon: 'lucideInfo' },
    { id: 'fiscal', label: 'Sede e dati fiscali', icon: 'lucideLandmark' },
    { id: 'products', label: 'Prodotti abilitati', icon: 'lucidePackage', noFields: true },
    ...(this.showEconomics() ? [{ id: 'contract', label: 'Contratto con Keus', icon: 'lucideFileText', noFields: true }] : []),
    { id: 'logo', label: 'Logo', icon: 'lucideImage', noFields: true },
  ]);

  /** Navigation through the sections, one after the other while creating. */
  readonly steps = formSteps(this.tabs, computed(() => false));

  /** Whether the company data holds changes to save: a value brought back to where it was is no change. */
  readonly changed = formChanges(this.companyDataForm);

  /** Italian provinces offered by the legal address. */
  readonly provinces = PROVINCES;

  /** Label of a province, for the combobox and the read-only value. */
  readonly provinceLabel = provinceLabel;

  /** Country of the legal address, fixed and shown read-only. */
  readonly country = LEGAL_ADDRESS_COUNTRY;

  /** Filter of the province combobox. */
  readonly comboboxContainsFilter = comboboxContainsFilter;

  /** Renewal date of the contract in force. */
  readonly renewalDate = computed(() => {
    const contract = this.contract();
    if (!contract) return null;
    const date = new Date(contract.validityDate);
    date.setFullYear(date.getFullYear() + contract.validityYears);
    return date;
  });

  /**
   * Constructor of the component.
   */
  constructor() {
    // Fill the form with the reseller and lock it for read-only users.
    effect(() => {
      const reseller = this.reseller();
      const editable = this.editable();
      untracked(() => {
        this.companyDataForm.reset({
          email: reseller.email || null,
          phoneNumber: reseller.phoneNumber || null,
          pec: reseller.pec || null,
          legalAddress: {
            street: reseller.legalAddress?.street || null,
            city: reseller.legalAddress?.city || null,
            zipCode: reseller.legalAddress?.zipCode || null,
            province: reseller.legalAddress?.province || null,
          },
          vatNumber: reseller.vatNumber || null,
          sdi: reseller.sdi || null,
          fiscalCode: reseller.fiscalCode || null,
          iban: reseller.iban || null,
        });
        if (editable) {
          this.companyDataForm.enable({ emitEvent: false });
        } else {
          this.companyDataForm.disable({ emitEvent: false });
        }
      });
    });
  }

  /**
   * Builds the legal address in the shape the API takes.
   * @returns the address; null when every field is empty, undefined when street, city and postal code are not all there.
   */
  buildLegalAddress(): CoreLegalAddress | null | undefined {
    const address = this.companyDataForm.controls.legalAddress.getRawValue();
    if (Object.values(address).every(value => !value)) {
      return null;
    }
    if (!address.street || !address.city || !address.zipCode) {
      return undefined;
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
   * Downloads the signed framework agreement of the contract in force.
   */
  downloadAgreement(): void {
    const s3Key = this.contract()?.signedContractS3Key;
    if (!s3Key) return;
    this._s3UploadService.getDownloadUrl('RESELLER_CONTRACT_SIGNED', s3Key).subscribe(url => openInNewTab(url));
  }
}

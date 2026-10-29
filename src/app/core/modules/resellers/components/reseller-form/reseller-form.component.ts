import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LEGAL_ADDRESS_COUNTRY, PROVINCES, provinceLabel } from '../../../../constants/legal-address';
import { provideIcons } from '@ng-icons/core';
import { lucideHandCoins, lucideImage, lucideInfo, lucideLandmark } from '@ng-icons/lucide';
import { BrnComboboxImports, comboboxContainsFilter } from '@spartan-ng/brain/combobox';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmError } from '@spartan-ng/helm/form-field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { catchError, map, of } from 'rxjs';
import { CognitoCollaboratorResponseDto, CoreLegalAddress, CoreResponseResellerDto } from '../../../../../../../libs/api/src';
import { Capability } from '../../../../enums/capability.enum';
import { Profile } from '../../../../enums/profile.enum';
import { CollaboratorsApiService } from '../../../../services/api-services/collaborators/collaborators-api.service';
import { ProductsCacheService } from '../../../../services/cache/products-cache.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { CreateEditResellerForm, ResellerLegalAddressForm } from '../../interfaces/create-edit-reseller-form.interface';
import { ResellerTierPipe } from '../../../../pipes/reseller-tier/reseller-tier.pipe';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { ResellerLogoComponent } from '../reseller-logo/reseller-logo.component';
import { ToasterService } from '../../../../services/toaster/toaster.service';
import { COMBOBOX_PAGE_SIZE, remoteOptions } from '../../../../utils/remote-options.util';
import { formSteps, sectionsComplete, StepTab } from '../../../../utils/form-steps.util';
import { formChanges } from '../../../../utils/form-changes.util';
import { StepListComponent } from '../../../../components/step-list/step-list.component';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { ResellerStatusDirective } from '../../../../directives/reseller-status.directive';
import { AddressItemComponent } from '../../../../components/address-item/address-item.component';
import { ContactItemComponent } from '../../../../components/contact-item/contact-item.component';
import { CodeItemComponent } from '../../../../components/code-item/code-item.component';

/**
 * Component for the reseller form used in creating or editing resellers.
 */
@Component({
  selector: 'rocket-reseller-form',
  imports: [
    ...BrnComboboxImports,
    ...HlmComboboxImports,
    ...HlmLabelImports,
    ...HlmInputImports,
    ...HlmSelectImports,
    ...BrnSelectImports,
    ...HlmButtonImports,
    ...HlmTabsImports,
    ...HlmTooltipImports,
    ReactiveFormsModule,
    HlmError,
    ...HlmCardImports,
    ...HlmBadgeImports,
    ResellerTierPipe,
    ResellerLogoComponent,
    StepListComponent,
    AddressItemComponent,
    ContactItemComponent,
    CodeItemComponent,
    ResellerStatusDirective,
  ],
  providers: [
    provideIcons({
      lucideInfo,
      lucideLandmark,
      lucideHandCoins,
      lucideImage,
    }),
  ],
  templateUrl: './reseller-form.component.html',
  styleUrl: './reseller-form.component.css'
})
export class ResellerFormComponent {
  /** Collaborators api service. */
  private readonly _collaboratorsService = inject(CollaboratorsApiService);

  /** Toaster service instance. */
  private readonly _toasterService = inject(ToasterService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Products cache service instance. */
  private readonly _productsCacheService = inject(ProductsCacheService);

  /** Signal to hold reseller data for the edit reseller form. */
  resellerData = input<CoreResponseResellerDto | undefined>(undefined);

  /** Whether the form shows a new record, whose sections open one after the other. */
  creating = input<boolean>(false);

  /** Whether the form is shown read-only. */
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


  /** Form group for creating/editing a reseller. */
  resellerForm = new FormGroup<CreateEditResellerForm>({
    companyName: new FormControl<string | null>(null, [Validators.required]),
    email: new FormControl<string | null>(null, [Validators.required, Validators.email]),
    phoneNumber: new FormControl<string | null>(null, [Validators.pattern(this.phonePattern)]),
    vatNumber: new FormControl<string | null>(null, [Validators.required, Validators.pattern(this.vatPattern)]),
    pec: new FormControl<string | null>(null, [Validators.required, Validators.email]),
    sdi: new FormControl<string | null>(null, [Validators.required, Validators.pattern(this.sdiPattern)]),
    code: new FormControl<string | null>(null, [Validators.required]),
    status: new FormControl<'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ARCHIVED' | null>('ACTIVE', [Validators.required]),
    assignedSalesId: new FormControl<string | null>(null),
    legalAddress: new FormGroup<ResellerLegalAddressForm>({
      street: new FormControl<string | null>(null, [Validators.required]),
      city: new FormControl<string | null>(null, [Validators.required]),
      zipCode: new FormControl<string | null>(null, [Validators.required, Validators.pattern(this.zipCodePattern)]),
      province: new FormControl<string | null>(null, [Validators.required]),
    }),
    iban: new FormControl<string | null>(null, [Validators.pattern(this.ibanPattern)]),
    fiscalCode: new FormControl<string | null>(null, [Validators.required, Validators.pattern(this.fiscalCodePattern)]),
  });

  /** Ordered form sections of the sidebar; the logo needs the reseller id, so they stay disabled while creating. */
  readonly tabs = computed<StepTab[]>(() => [
    { id: 'info', label: 'Informazioni di base', icon: 'lucideInfo' },
    { id: 'fiscal', label: 'Sede e dati fiscali', icon: 'lucideLandmark' },
    { id: 'commercial', label: 'Commerciale', icon: 'lucideHandCoins' },
    { id: 'logo', label: 'Logo', icon: 'lucideImage', disabled: !this.resellerData(), hint: 'Il logo si carica dopo aver creato il rivenditore.', noFields: true },
  ]);

  /** Navigation through the sections, one after the other while creating, each once its required fields are valid. */
  readonly steps = formSteps(this.tabs, this.creating, sectionsComplete(this.resellerForm, {
    info: ['companyName', 'email', 'phoneNumber', 'code', 'status'],
    fiscal: ['vatNumber', 'pec', 'sdi', 'legalAddress', 'iban', 'fiscalCode'],
    commercial: ['assignedSalesId'],
  }));

  /** Whether the form holds changes to save: a value brought back to where it was is no change. */
  readonly changed = formChanges(this.resellerForm);

  /** Italian provinces offered by the legal address. */
  readonly provinces = PROVINCES;

  /** Label of a province, for the combobox and the read-only value. */
  readonly provinceLabel = provinceLabel;

  /** Country of the legal address, fixed and shown read-only. */
  readonly country = LEGAL_ADDRESS_COUNTRY;

  /** Filter of the assigned salesperson and province comboboxes. */
  readonly comboboxContainsFilter = comboboxContainsFilter;

  /** Converts a product id to its name, used by the combobox for filtering and display. */
  readonly productLabel = (id: string): string => this._productsCacheService.products().find(product => product.id === id)?.name ?? '';

  /** Converts a collaborator sub to its name, used by the combobox for filtering and display. */
  readonly assignedSalesLabel = (sub: string): string => this.assignedSalesNameOf(sub) ?? '';

  /** Keus salespeople that can be put in charge of a reseller, searched by name. */
  readonly salespeople = remoteOptions(search =>
    this._collaboratorsService.listCollaborators({ limit: COMBOBOX_PAGE_SIZE }, { group: Profile.KeusSales, name: search }).pipe(
      map(page => page.items.map(collaborator => ({ value: collaborator.sub, label: this._collaboratorName(collaborator) }))),
      catchError((error) => {
        console.error('Error loading the collaborators:', error);
        this._toasterService.showError('Non è stato possibile leggere i commerciali Keus.');
        return of([]);
      })
    ),
  );

  /** Whether the reseller data can be edited. */
  isEditable = computed(() => !this.readonly());

  /** Whether the code can be edited: only while creating, since the backend keeps it immutable afterwards. */
  isCodeEditable = computed(() => this.isEditable() && !this.resellerData());

  /** Whether the assigned salesperson can be edited: only an admin, outside read-only mode. */
  isAssignmentEditable = computed(() => this.isEditable() && this._permissions.can(Capability.ManageAllResellers));

  /** Labels of the reseller statuses, as the status select shows them. */
  readonly statusLabels: Record<string, string> = {
    ACTIVE: 'Attivo',
    INACTIVE: 'Non attivo',
    SUSPENDED: 'Sospeso',
    ARCHIVED: 'Archiviato',
  };

  /**
   * Constructor that initializes the component and sets up the
   * effect to populate the form if reseller data is provided.
   */
  constructor() {
    // Fill the form with the reseller being edited.
    effect(() => {
      const resellerData = this.resellerData();
      if (resellerData) {
        this.resellerForm.patchValue({
          companyName: resellerData.companyName || null,
          email: resellerData.email || null,
          phoneNumber: resellerData.phoneNumber || null,
          vatNumber: resellerData.vatNumber || null,
          pec: resellerData.pec || null,
          sdi: resellerData.sdi || null,
          code: resellerData.code || null,
          status: resellerData.status || 'ACTIVE',
          assignedSalesId: resellerData.assignedSalesId || null,
          legalAddress: {
            street: resellerData.legalAddress?.street || null,
            city: resellerData.legalAddress?.city || null,
            zipCode: resellerData.legalAddress?.zipCode || null,
            province: resellerData.legalAddress?.province || null,
          },
          iban: resellerData.iban || null,
          fiscalCode: resellerData.fiscalCode || null,
        });
        // The salesperson in charge may be outside the options read so far: its name is saved on the reseller.
        if (resellerData.assignedSalesId && resellerData.assignedSalesName) {
          this.salespeople.remember({ value: resellerData.assignedSalesId, label: resellerData.assignedSalesName });
        }
      }
    });

    // Lock the form for read-only users, the code once the reseller exists, and the assigned salesperson for everyone but an admin.
    effect(() => {
      const existing = !!this.resellerData();
      const readonly = this.readonly();
      const adminOnlyLocked = !this._permissions.can(Capability.ManageAllResellers);
      untracked(() => {
        if (readonly) {
          this.resellerForm.disable({ emitEvent: false });
          return;
        }
        this.resellerForm.enable({ emitEvent: false });
        if (existing) {
          this.resellerForm.controls.code.disable({ emitEvent: false });
        }
        if (adminOnlyLocked) {
          this.resellerForm.controls.assignedSalesId.disable({ emitEvent: false });
        }
      });
    });

    // A Keus salesperson is assigned to the resellers it creates.
    effect(() => {
      const sub = this._permissions.sub();
      if (this.resellerData() || !sub || this._permissions.can(Capability.ManageAllResellers)) return;
      untracked(() => {
        this.resellerForm.controls.assignedSalesId.setValue(sub);
        this._collaboratorsService.getCollaboratorById(sub)
          .subscribe(collaborator => this.salespeople.remember({ value: sub, label: this._collaboratorName(collaborator) }));
      });
    });
  }

  /**
   * Builds the legal address in the shape the API takes.
   * @returns the address; null when every field is empty, undefined when street, city and postal code are not all there.
   */
  buildLegalAddress(): CoreLegalAddress | null | undefined {
    const address = this.resellerForm.controls.legalAddress.getRawValue();
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
   * Resolves the display name of the collaborator in charge, denormalized on the reseller.
   * @param sub the Cognito sub of the collaborator.
   * @returns the full name, or undefined when the collaborator is unknown.
   */
  assignedSalesNameOf(sub: string | null | undefined): string | undefined {
    return sub ? this.salespeople.labelOf(sub) : undefined;
  }

  /**
   * Returns the display name of a collaborator, listed (`surname`) or read from Cognito (`familyName`): first and last
   * name, or the email without them.
   * @param collaborator the collaborator.
   * @returns the display name.
   */
  private _collaboratorName(collaborator: Pick<CognitoCollaboratorResponseDto, 'name' | 'surname' | 'email'> & { familyName?: string }): string {
    return [collaborator.name, collaborator.surname ?? collaborator.familyName].filter(Boolean).join(' ') || collaborator.email;
  }
}

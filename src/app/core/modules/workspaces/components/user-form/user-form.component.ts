
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { MultiSelectComponent } from '../../../../components/multi-select/multi-select.component';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { lucideGripVertical, lucideInfo, lucideKeyRound, lucideListTree, lucidePlus, lucideTrash2, lucideHistory } from '@ng-icons/lucide';
import { BrnComboboxImports, comboboxContainsFilter } from '@spartan-ng/brain/combobox';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSwitchImports } from '@spartan-ng/helm/switch';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { map } from 'rxjs';
import { CoreResponseUserDto, CoreResponseProductDto, CoreResponsePendingOperationDto } from '../../../../../../../libs/api/src';
import { CustomAttributesFormService } from '../../services/custom-attributes-form/custom-attributes-form.service';
import { StructureDynamicFormService } from '../../services/structure-dynamic-form/structure-dynamic-form.service';
import { StructureFieldsComponent } from '../structure-fields/structure-fields.component';
import { OperationHistoryComponent } from '../operation-history/operation-history.component';
import { CognitoUserStatusPipe } from '../../../../pipes/cognito-user-status/cognito-user-status.pipe';
import { UserStatus } from '../../../../enums/user-status.enum';
import { UserStatusPipe } from '../../../../pipes/user-status/user-status.pipe';
import { CreateEditUserForm } from '../../interfaces/create-edit-users-form';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { ON_PRODUCT_STATUSES } from '../../../../constants/provisioning-statuses';
import { TenantStatus } from '../../../../enums/tenant-status.enum';
import { TenantsApiService } from '../../../../services/api-services/tenants/tenants-api.service';
import { COMBOBOX_PAGE_SIZE, remoteOptions } from '../../../../utils/remote-options.util';
import { formSteps, sectionsComplete, StepTab } from '../../../../utils/form-steps.util';
import { formChanges } from '../../../../utils/form-changes.util';
import { StepListComponent } from '../../../../components/step-list/step-list.component';

@Component({
  selector: 'rocket-user-form',
  imports: [
    ...HlmButtonImports,
    ...HlmLabelImports,
    ...HlmInputImports,
    ...HlmSwitchImports,
    ...HlmSelectImports,
    ...BrnSelectImports,
    ...HlmTabsImports,
    ...HlmComboboxImports,
    ...BrnComboboxImports,
    ...HlmBadgeImports,
    ...HlmCardImports,
    ReactiveFormsModule,
    StructureFieldsComponent,
    OperationHistoryComponent,
    ...HlmTooltipImports,
    UserStatusPipe,
    StepListComponent,
    MultiSelectComponent,
  ],
  providers: [
    StructureDynamicFormService,
    provideIcons({
      lucideHistory,
      lucidePlus,
      lucideTrash2,
      lucideGripVertical,
      lucideInfo,
      lucideListTree,
      lucideKeyRound
    }),
    CognitoUserStatusPipe,
  ],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.css'
})
export class UserFormComponent {
  /** Activated route instance. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Tenants API service instance. */
  private readonly _tenantsApiService = inject(TenantsApiService);

  /** Structure dynamic form service instance. */
  private readonly _structureDynamicFormService = inject(StructureDynamicFormService);

  /** Custom attributes form service instance. */
  private readonly _customAttributesFormService = inject(CustomAttributesFormService);

  /** Cognito user status pipe instance. */
  private readonly _cognitoUserStatusPipe = inject(CognitoUserStatusPipe);

  /** Input user data for editing. */
  userData = input<CoreResponseUserDto | undefined>(undefined);

  /** Whether the form shows a new record, whose sections open one after the other. */
  creating = input<boolean>(false);

  /** Operations sent to the product for the record, shown in its history. */
  operations = input<CoreResponsePendingOperationDto[]>([]);

  /** Input product data. */
  productData = input<CoreResponseProductDto | undefined>(undefined);

  /** Whether the user can only read the record. */
  readonly = input<boolean>(false);

  /** Tenant chosen by the page, such as the one a company's user is added to: the combobox gives way to its name. */
  fixedTenant = input<{ id: string; name: string } | null>(null);

  /** Signal indicating if the form is ready. */
  isFormReady = signal<boolean>(false);

  /** User structure signal. */
  userStructure = computed(() => {
    return this.productData()?.userStructure;
  });

  /** Cognito custom attributes signal. */
  cognitoCustomAttributes = computed(() => {
    return this.productData()?.customAttributes || [];
  });

  /** Signal for Cognito roles. */
  cognitoRoles = computed(() => {
    return this.productData()?.roles || [];
  });

  /** Filter function used by the roles combobox to match items against the current search. */
  readonly comboboxContainsFilter = comboboxContainsFilter;

  /** Active tenants of the product a new user can belong to, searched by name. */
  readonly tenants = remoteOptions(search =>
    this._tenantsApiService.listTenants({ limit: COMBOBOX_PAGE_SIZE }, {
      productId: this._activatedRoute.snapshot.params['productId'],
      status: [TenantStatus.Active],
      search,
    }).pipe(map(page => page.items.map(tenant => ({ value: tenant.id, label: tenant.name })))),
  );

  /** Converts a tenant identifier to its label, used by the combobox for filtering and display. */
  readonly tenantOptionLabel = (value: string): string => this.tenants.labelOf(value) ?? '';

  /** Statuses the operator can set: the others follow the product's answers. */
  readonly userStatuses = [UserStatus.Active, UserStatus.Inactive];

  /** Whether the product has created the record: only then can the operator change it. */
  readonly isOnProduct = computed(() => ON_PRODUCT_STATUSES.includes(this.userData()?.status ?? ''));

  /** Whether the form can be edited (creation, or a user on the product); otherwise its values show as text. */
  readonly isEditable = computed(() => !this.readonly() && (!this.userData() || this.isOnProduct()));

  /** Signal indicating if the product has Cognito custom attributes. */
  hasCognitoFields = computed(() => {
    return this.productData()?.customAttributes && this.productData()!.customAttributes.length > 0;
  });

  /** Ordered definition of the form sections shown in the sidebar navigation. */
  tabs = computed<StepTab[]>(() => {
    const list: StepTab[] = [
      { id: 'info', label: 'Informazioni di base', icon: 'lucideInfo' },
    ];
    if (this.isFormReady()) list.push({ id: 'structure', label: 'Struttura utente', icon: 'lucideListTree' });
    if (this.hasCognitoFields()) list.push({ id: 'cognito', label: 'Campi custom Cognito', icon: 'lucideKeyRound' });
    list.push({ id: 'history', label: 'Storico', icon: 'lucideHistory', disabled: !this.userData(), hint: 'Lo storico si vede dopo aver creato l\'utente.', noFields: true });
    return list;
  });

  /** Form group for the user form. */
  userForm = new FormGroup<CreateEditUserForm>({
    tenantId: new FormControl<string | null>(''),
    tenantName: new FormControl<string | null>(''),
    email: new FormControl<string | null>(null, [Validators.email, Validators.required]),
    name: new FormControl<string | null>(null, [Validators.required]),
    surname: new FormControl<string | null>(null, [Validators.required]),
    accountType: new FormControl<'CLIENT' | 'PROFESSIONAL' | null>('CLIENT'),
    status: new FormControl<string | null>(null),
    customAttributes: new FormGroup({}),
    data: new FormGroup({}),
    roles: new FormControl<string[] | null>([]),
    referent: new FormControl<boolean>(false, { nonNullable: true }),
  });

  /** Navigation through the sections, one after the other while creating, each once its required fields are valid. */
  readonly steps = formSteps(this.tabs, this.creating, sectionsComplete(this.userForm, {
    info: ['tenantId', 'tenantName', 'email', 'name', 'surname', 'accountType', 'status', 'roles', 'referent'],
    structure: ['data'],
    cognito: ['customAttributes'],
  }));

  /** Whether the form holds changes to save: a value brought back to where it was is no change. */
  readonly changed = formChanges(this.userForm);

  /**
   * Constructor for UserFormComponent.
   */
  constructor() {
    // Put the tenant chosen by the page in the form.
    effect(() => {
      const tenant = this.fixedTenant();
      if (!tenant) return;

      this.tenants.remember({ value: tenant.id, label: tenant.name });
      this.userForm.patchValue({ tenantId: tenant.id, tenantName: tenant.name });
    });

    effect(() => {
      const structureFields = this.userStructure();
      const customAttributes = this.cognitoCustomAttributes();
      const user = this.userData();

      if (structureFields && structureFields.length > 0) {
        this.isFormReady.set(false);

        // Generate dynamic form group for additional data.
        const dynamicFormGroup = this._structureDynamicFormService.generateFormControls(structureFields);
        this.userForm.setControl('data', dynamicFormGroup);

        // Generate form array for custom attributes.
        const customAttributesFormGroup = this._customAttributesFormService.generateCustomAttributesFormControls(customAttributes);
        this.userForm.setControl('customAttributes', customAttributesFormGroup);

        // Mark the form as ready in the next microtask to ensure UI updates correctly.
        queueMicrotask(() => {
          this.isFormReady.set(true);
        });

        if (!user) {
          // Create mode: tenantId è obbligatorio
          this.userForm.get('tenantId')?.setValidators([Validators.required]);
          this.userForm.get('tenantId')?.updateValueAndValidity();

          // Clear validators for generated fields (they are hidden in create mode).
          structureFields.forEach(field => {
            if (field.generated) {
              dynamicFormGroup.get(field.name)?.clearValidators();
              dynamicFormGroup.get(field.name)?.updateValueAndValidity();
            }
          });
          return;
        }

        // Edit mode: tenantId NON è obbligatorio
        this.userForm.get('tenantId')?.clearValidators(); // ← Usa clearValidators!
        this.userForm.get('tenantId')?.updateValueAndValidity();

        const formattedData = StructureDynamicFormService.formatDataForForm(user.data || {}, structureFields);
        this.userForm.patchValue({
          tenantName: user.tenantName,
          email: user.email,
          name: user.name,
          surname: user.surname,
          status: user.status,
          data: formattedData,
          roles: user.roles || [],
          referent: !!user.referent,
        });

        // Patch customAttributes separately.
        if (user.customAttributes && user.customAttributes.length > 0) {
          const customAttrsObj: { [key: string]: string } = {};
          user.customAttributes.forEach(attr => {
            customAttrsObj[attr.name] = attr.value;
          });
          this.userForm.get('customAttributes')?.patchValue(customAttrsObj);
        }

        this.userForm.get('tenantName')?.disable();
        // The email is the login on the product: it does not change after the creation.
        this.userForm.get('email')?.disable();

        // Disable notModifiable fields in edit mode (skip OBJECT types, they use readonly in the template).
        structureFields.forEach(field => {
          if (field.notModifiable && field.type !== 'OBJECT') {
            dynamicFormGroup.get(field.name)?.disable();
          }
        });

        // A user the product has not created yet, or a viewer who only reads, can only look at it.
        if (!this.isOnProduct() || this.readonly()) {
          this.userForm.disable({ emitEvent: false });
        }
      }
    })
  }
}

import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBuilding2,
  lucideChevronDown,
  lucideActivity,
  lucideChartLine,
  lucideCreditCard,
  lucideHandshake,
  lucideKeyRound,
  lucideMessageCircle,
  lucidePencil,
  lucideGripVertical,
  lucideImage,
  lucideInfo,
  lucideLoader,
  lucidePlug,
  lucidePlus,
  lucideTrash2,
  lucideUsers,
  lucideImagePlus,
} from '@ng-icons/lucide';
import { BrnComboboxImports, comboboxContainsFilter } from '@spartan-ng/brain/combobox';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { BrnTooltipImports } from '@spartan-ng/brain/tooltip';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmDialogContent, HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSwitchImports } from '@spartan-ng/helm/switch';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import Sortable from 'sortablejs';
import { CoreMixpanelLeverRule, CoreResponseProductDto, CoreResponseSentryProjectDto } from '../../../../../../../libs/api/src';
import { INTEGRATIONS_ENABLED } from '../../../../constants/features';
import { MixpanelInactivityScope } from '../../../../enums/mixpanel-inactivity-scope.enum';
import { MixpanelLever } from '../../../../enums/mixpanel-lever.enum';
import { IMPLIED_RULE_DIRECTION, MixpanelRuleDirection } from '../../../../enums/mixpanel-rule-direction.enum';
import { MixpanelRuleShape } from '../../../../enums/mixpanel-rule-shape.enum';
import { MixpanelRuleUnit } from '../../../../enums/mixpanel-rule-unit.enum';
import { MixpanelInactivityScopePipe } from '../../../../pipes/mixpanel-inactivity-scope/mixpanel-inactivity-scope.pipe';
import { MixpanelLeverPipe } from '../../../../pipes/mixpanel-lever/mixpanel-lever.pipe';
import { MixpanelRuleDirectionPipe } from '../../../../pipes/mixpanel-rule-direction/mixpanel-rule-direction.pipe';
import { MixpanelRuleShapePipe } from '../../../../pipes/mixpanel-rule-shape/mixpanel-rule-shape.pipe';
import { MixpanelRuleUnitPipe } from '../../../../pipes/mixpanel-rule-unit/mixpanel-rule-unit.pipe';
import { TypeEnum } from '../../../../enums/type.enum';
import { TypePipe } from '../../../../pipes/type/type.pipe';
import { MetricsApiService } from '../../../../services/api-services/metrics/metrics-api.service';
import { S3UploadService } from '../../../../services/api-services/s3/s3-upload.service';
import { domainNameValidator } from '../../../../validators/domain.validator';
import { TagsInputComponent } from '../../../workspaces/components/tags-input/tags-input.component';
import { CreateEditProductForm } from '../../interfaces/create-edit-product-form.interface';
import { MixpanelLeverRuleForm } from '../../interfaces/mixpanel-lever-rule-form.interface';
import { StructureFieldForm } from '../../interfaces/structure-field-form.interface';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmItemImports } from '@spartan-ng/helm/item';
import { HlmCollapsibleImports } from '@spartan-ng/helm/collapsible';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { IntegrationStatusDirective } from '../../../../directives/integration-status.directive';
import { FileDropZoneDirective } from '../../../../directives/file-drop-zone.directive';
import { formSteps, sectionsComplete, StepTab } from '../../../../utils/form-steps.util';
import { formChanges } from '../../../../utils/form-changes.util';
import { StepListComponent } from '../../../../components/step-list/step-list.component';

/** Fields each shape of a lever rule reads, besides unit, thresholds and observation. */
const RULE_FIELDS: Record<MixpanelRuleShape, (keyof MixpanelLeverRuleForm)[]> = {
  [MixpanelRuleShape.Milestone]: ['eventNames', 'anchorEventNames'],
  [MixpanelRuleShape.Cadence]: ['eventNames', 'windowValue', 'perActiveUser', 'direction'],
  [MixpanelRuleShape.Coverage]: ['eventNames', 'anchorEventNames', 'property', 'windowValue', 'minSample'],
  [MixpanelRuleShape.PropertyAverage]: ['eventNames', 'property', 'windowValue', 'direction', 'minSample'],
  [MixpanelRuleShape.Inactivity]: ['eventNames', 'inactivityScope'],
};

/** Fields an inactivity reads on top of the ones of its shape, by what it looks at. */
const SCOPE_FIELDS: Record<MixpanelInactivityScope, (keyof MixpanelLeverRuleForm)[]> = {
  [MixpanelInactivityScope.Tenant]: [],
  [MixpanelInactivityScope.User]: ['userRoles'],
  [MixpanelInactivityScope.Object]: ['property', 'closingEventNames'],
};

/** Services the product connects to, one card each in the integrations tab. */
type Integration = 'hubspot' | 'intercom' | 'sentry' | 'stripe' | 'mixpanel';

/** Stripe secrets, shown masked until replaced. */
type StripeSecret = 'stripeApiKey' | 'stripeWebhookSecret';

/** Piece of the sentence that reads a lever rule: event and property names are set as code. */
interface RuleSentencePart {
  /** Text of the piece. */
  text: string;
  /** Whether the piece is a Mixpanel name. */
  code?: boolean;
}

@Component({
  selector: 'rocket-product-form',
  imports: [
    ...HlmLabelImports,
    ...HlmInputImports,
    ...HlmCheckboxImports,
    ...HlmSelectImports,
    ...BrnSelectImports,
    ...BrnComboboxImports,
    ...HlmComboboxImports,
    ...HlmButtonImports,
    ...HlmTextareaImports,
    ...HlmSwitchImports,
    ...HlmInputGroupImports,
    ...HlmTableImports,
    ...HlmTabsImports,
    ...HlmDialogImports,
    ...BrnDialogImports,
    ...HlmTooltipImports,
    ...BrnTooltipImports,
    ReactiveFormsModule,
    NgIcon,
    TypePipe,
    MixpanelInactivityScopePipe,
    MixpanelLeverPipe,
    MixpanelRuleShapePipe,
    MixpanelRuleUnitPipe,
    MixpanelRuleDirectionPipe,
    TagsInputComponent,
    ...HlmCardImports,
    ...HlmAvatarImports,
    ...HlmItemImports,
    ...HlmCollapsibleImports,
    ...HlmBadgeImports,
    FileDropZoneDirective,
    IntegrationStatusDirective,
    StepListComponent,
  ],
  providers: [
    provideIcons({
      lucideChevronDown,
      lucidePlus,
      lucideTrash2,
      lucideGripVertical,
      lucideImage,
      lucideImagePlus,
      lucideLoader,
      lucideInfo,
      lucidePlug,
      lucideBuilding2,
      lucideUsers,
      lucideActivity,
      lucideChartLine,
      lucideCreditCard,
      lucideHandshake,
      lucideKeyRound,
      lucideMessageCircle,
      lucidePencil,
    }),
  ],
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.css',
})
export class ProductFormComponent implements AfterViewInit {
  /** S3 upload service instance. */
  private readonly _s3UploadService = inject(S3UploadService);

  /** Metrics API service instance, for the Intercom brands. */
  private readonly _metricsApiService = inject(MetricsApiService);

  /** Input property for the product data to be edited or created. */
  productData = input<CoreResponseProductDto | undefined>(undefined);

  /** Whether the form shows a new record, whose sections open one after the other. */
  creating = input<boolean>(false);

  /** List of available field types */
  fieldTypes: TypeEnum[] = Object.values(TypeEnum);

  /** Levers, with as many rules each as needed. */
  readonly levers = Object.values(MixpanelLever);

  /** Shapes of the lever rules. */
  readonly ruleShapes = Object.values(MixpanelRuleShape);

  /** Time units of the lever rules. */
  readonly ruleUnits = Object.values(MixpanelRuleUnit);

  /** Directions of the lever rules. */
  readonly ruleDirections = Object.values(MixpanelRuleDirection);

  /** What an inactivity rule can look at. */
  readonly inactivityScopes = Object.values(MixpanelInactivityScope);

  /** Shapes of the lever rules, for the comparisons in the template. */
  readonly RuleShape = MixpanelRuleShape;

  /** Labels of the units, for the sentences of the rules. */
  private readonly _unitPipe = new MixpanelRuleUnitPipe();

  /** Stripe secrets being replaced: their input shows in place of the masked value. */
  replacingSecrets = signal<ReadonlySet<StripeSecret>>(new Set());

  /** Lever rules open for editing; the others read as a sentence. */
  openRules = signal<ReadonlySet<FormGroup<MixpanelLeverRuleForm>>>(new Set());

  /** Names of the brands of the Intercom workspace. */
  intercomBrands = signal<string[]>([]);

  /** Filter of the Intercom brand combobox. */
  readonly comboboxContainsFilter = comboboxContainsFilter;

  /** Shows a brand name as it is, used by the combobox for filtering and display. */
  readonly brandLabel = (brand: string): string => brand;

  /** Projects of the Sentry organization. */
  sentryProjects = signal<CoreResponseSentryProjectDto[]>([]);

  /** Shows a Sentry project by name and slug from its identifier, used by the combobox for filtering and display. */
  readonly sentryProjectLabel = (projectId: string): string => {
    const project = this.sentryProjects().find(candidate => candidate.id === projectId);
    return project ? `${project.name} (${project.slug})` : projectId;
  };

  /** Ordered form sections of the sidebar; the logo needs the product id, so it stays disabled while creating. */
  readonly tabs = computed<StepTab[]>(() => [
    { id: 'info', label: 'Informazioni di base', icon: 'lucideInfo' },
    // Demo mode (INTEGRATIONS_ENABLED=false), not part of the original Rocket.
    ...(INTEGRATIONS_ENABLED ? [{ id: 'integrations', label: 'Integrazioni', icon: 'lucidePlug' }] : []),
    { id: 'tenant-structure', label: 'Struttura tenants', icon: 'lucideBuilding2' },
    { id: 'user-structure', label: 'Struttura users', icon: 'lucideUsers' },
    { id: 'logo', label: 'Logo', icon: 'lucideImage', disabled: !this.productData(), hint: 'Il logo si carica dopo aver creato il prodotto.', noFields: true },
  ]);

  /** Reference to tenant structure tbody */
  tenantTableBody = viewChild<ElementRef>('tenantTableBody');

  /** Reference to user structure tbody */
  userTableBody = viewChild<ElementRef>('userTableBody');

  /** Reference to the delete field dialog */
  dialog = viewChild<BrnDialog>('dialog');

  /** Reference to the delete field dialog content */
  dialogContent = viewChild<HlmDialogContent>('dialogContent');

  /** Currently selected field for deletion */
  selectedField: {type: 'tenant' | 'user' | 'mixpanel', index: number} | null = null;

  /** Signal to track logo upload state. */
  isUploadingLogo = signal<boolean>(false);

  /** Signal to track file validation error. */
  logoError = signal<string | null>(null);

  /** Local preview of the logo just chosen. */
  logoPreviewUrl = signal<string | null>(null);

  /** Signed URL of the stored logo. */
  private readonly _storedLogoUrl = signal<string | null>(null);

  /** URL of the logo shown: the local preview after an upload, the stored one otherwise. */
  readonly logoUrl = computed(() => this.logoPreviewUrl() ?? this._storedLogoUrl());

  /** Output event when logo file is selected and ready for upload. */
  logoSelected = output<File>();

  /** Allowed image MIME types for logo. */
  private readonly _allowedImageTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml',
  ];

  /** Form group for the visualized product. */
  productForm = new FormGroup<CreateEditProductForm>({
    name: new FormControl<string | null>('', [Validators.required]),
    description: new FormControl<string | null>(''),
    prefix: new FormControl<string | null>('', [Validators.required]),
    tenantStructure: new FormArray<FormGroup<StructureFieldForm>>([]),
    userStructure: new FormArray<FormGroup<StructureFieldForm>>([]),
    customAttributes: new FormControl<string[] | null>(null),
    status: new FormControl<string | null>(null),
    roles: new FormControl<string[] | null>(null),
    hubspotSolution: new FormControl<string | null>(null),
    intercomBrand: new FormControl<string | null>(null),
    sentryProjectId: new FormControl<string | null>(null),
    healthCheckUrl: new FormControl<string | null>(null, [Validators.pattern(/^https:\/\/\S+$/)]),
    domain: new FormControl<string | null>(null, [domainNameValidator()]),
    stripeApiKey: new FormControl<string | null>(null),
    stripeWebhookSecret: new FormControl<string | null>(null),
    stripeTaxRateId: new FormControl<string | null>(null),
    mixpanelProjectId: new FormControl<string | null>(null),
    defaultTrialDuration: new FormControl<number | null>(null),
    hasTrialsUsersLimit: new FormControl<boolean | null>(false),
    trialsUsersLimit: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    mixpanelRules: new FormArray<FormGroup<MixpanelLeverRuleForm>>([]),
    resellerPlansEnabled: new FormControl<boolean | null>(false),
    // Kept in the form but hidden from the template: the reseller network is single-level.
    professionalPlansEnabled: new FormControl<boolean | null>(false),
  });

  /** Navigation through the sections, one after the other while creating, each once its required fields are valid. */
  readonly steps = formSteps(this.tabs, this.creating, sectionsComplete(this.productForm, {
    info: ['name', 'description', 'prefix', 'customAttributes', 'status', 'roles', 'domain', 'defaultTrialDuration', 'hasTrialsUsersLimit', 'trialsUsersLimit', 'resellerPlansEnabled'],
    integrations: ['hubspotSolution', 'intercomBrand', 'sentryProjectId', 'healthCheckUrl', 'stripeApiKey', 'stripeWebhookSecret', 'stripeTaxRateId', 'mixpanelProjectId', 'mixpanelRules'],
    'tenant-structure': ['tenantStructure'],
    'user-structure': ['userStructure'],
  }));

  /** Whether the form holds changes to save: a value brought back to where it was is no change. */
  readonly changed = formChanges(this.productForm);

  /** Getter for tenant structure controls as an array of FormGroups. */
  get tenantStructureControls(): FormGroup<StructureFieldForm>[] {
    return (this.productForm.get('tenantStructure') as FormArray)
      .controls as FormGroup<StructureFieldForm>[];
  }

  /** Getter for user structure controls as an array of FormGroups. */
  get userStructureControls(): FormGroup<StructureFieldForm>[] {
    return (this.productForm.get('userStructure') as FormArray)
      .controls as FormGroup<StructureFieldForm>[];
  }

  /** Getter for the lever rule controls as an array of FormGroups. */
  get mixpanelRulesControls(): FormGroup<MixpanelLeverRuleForm>[] {
    return this.productForm.controls.mixpanelRules.controls;
  }

  /**
   * Constructor to initialize the component and set up form control behavior.
   */
  constructor() {
    // Load the brands of the Intercom workspace for the brand of the product.
    this._metricsApiService.getIntercomBrands().subscribe({
      next: brands => this.intercomBrands.set(brands.map(brand => brand.name)),
      error: error => console.error('Error loading the Intercom brands:', error),
    });

    // Load the projects of the Sentry organization for the project of the product.
    this._metricsApiService.getSentryProjects().subscribe({
      next: projects => this.sentryProjects.set(projects),
      error: error => console.error('Error loading the Sentry projects:', error),
    });

    // Toggle trialsUsersLimit enable/disable based on hasTrialsUsersLimit
    // Note: in the form, hasTrialsUsersLimit=true means "unlimited" (inverted for the API)
    this.productForm
      .get('hasTrialsUsersLimit')!
      .valueChanges.subscribe((isUnlimited) => {
        const trialsUsersLimitControl =
          this.productForm.get('trialsUsersLimit')!;
        if (isUnlimited) {
          trialsUsersLimitControl.disable();
          trialsUsersLimitControl.setValue(null);
          trialsUsersLimitControl.clearValidators();
        } else {
          trialsUsersLimitControl.enable();
          trialsUsersLimitControl.setValidators([
            Validators.required,
            Validators.min(0),
          ]);
        }
        trialsUsersLimitControl.updateValueAndValidity();
      });

    // Show the stored logo through a signed URL.
    effect(() => {
      const logoS3Key = this.productData()?.logoS3Key;
      if (!logoS3Key) return;
      this._s3UploadService.getDownloadUrl('PRODUCT_LOGO', logoS3Key).subscribe(url => this._storedLogoUrl.set(url));
    });

    // If productData is provided, populate the form with its values
    effect(() => {
      const productData = this.productData();

      if (!productData) return;

      // Create the tenantStructure array of FormGroups.
      const tenantStructureArray = new FormArray<FormGroup<StructureFieldForm>>(
        productData.tenantStructure.map(
          (field) =>
            new FormGroup<StructureFieldForm>({
              name: new FormControl<string | null>(field.name, [
                Validators.required,
              ]),
              type: new FormControl<string | null>(field.type, [
                Validators.required,
              ]),
              required: new FormControl<boolean | null>(field.required, [
                Validators.required,
              ]),
              array: new FormControl<boolean | null>(field.array, [
                Validators.required,
              ]),
              generated: new FormControl<boolean | null>(
                field.generated ?? false,
                [Validators.required],
              ),
              notModifiable: new FormControl<boolean | null>(
                field.notModifiable ?? false,
                [Validators.required],
              ),
            }),
        ),
      );

      // Create the userStructure array of FormGroups.
      const userStructureArray = new FormArray<FormGroup<StructureFieldForm>>(
        productData.userStructure.map(
          (field) =>
            new FormGroup<StructureFieldForm>({
              name: new FormControl<string | null>(field.name, [
                Validators.required,
              ]),
              type: new FormControl<string | null>(field.type, [
                Validators.required,
              ]),
              required: new FormControl<boolean | null>(field.required, [
                Validators.required,
              ]),
              array: new FormControl<boolean | null>(field.array, [
                Validators.required,
              ]),
              generated: new FormControl<boolean | null>(
                field.generated ?? false,
                [Validators.required],
              ),
              notModifiable: new FormControl<boolean | null>(
                field.notModifiable ?? false,
                [Validators.required],
              ),
            }),
        ),
      );

      // Set the FormArrays on the form
      this.productForm.setControl('tenantStructure', tenantStructureArray);
      this.productForm.setControl('userStructure', userStructureArray);

      // Set the lever rules of the product.
      this.productForm.setControl('mixpanelRules', new FormArray<FormGroup<MixpanelLeverRuleForm>>(
        (productData.mixpanelRules ?? []).map(rule => this._buildRuleGroup(rule.lever, rule)),
      ));
      this.openRules.set(new Set(this.mixpanelRulesControls.filter(rule => rule.invalid)));
      this.replacingSecrets.set(new Set());

      // Then use patchValue for the other fields
      this.productForm.patchValue({
        resellerPlansEnabled: productData.resellerPlansEnabled ?? false,
        professionalPlansEnabled: productData.professionalPlansEnabled ?? false,
        name: productData.name ?? null,
        prefix: productData.prefix ?? null,
        description: productData.description ?? null,
        status: productData.status ?? null,
        roles: productData.roles ?? null,
        hubspotSolution: productData.hubspotSolution ?? null,
        intercomBrand: productData.intercomBrand ?? null,
        sentryProjectId: productData.sentryProjectId ?? null,
        healthCheckUrl: productData.healthCheckUrl ?? null,
        customAttributes: productData.customAttributes ?? null,
        domain: productData.domain ?? null,
        stripeApiKey: productData.stripeApiKey ?? null,
        stripeWebhookSecret: productData.stripeWebhookSecret ?? null,
        stripeTaxRateId: productData.stripeTaxRateId ?? null,
        mixpanelProjectId: productData.mixpanelProjectId ?? null,
        defaultTrialDuration: productData.defaultTrialDuration ?? null,
        hasTrialsUsersLimit:
          productData.hasTrialsUsersLimit != null
            ? !productData.hasTrialsUsersLimit
            : false,
        trialsUsersLimit: productData.trialsUsersLimit ?? null,
      });
    });

    effect(() => {
      const state = this.dialogContent()?.state();
      if (state === 'closed') {
        this.closeDeleteFieldDialog();
      }
    });
  }

  /**
   * Initializes SortableJS on the table bodies after view initialization.
   */
  ngAfterViewInit(): void {
    // Initialize drag & drop for tenant structure
    if (this.tenantTableBody()) {
      Sortable.create(this.tenantTableBody()!.nativeElement, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        onEnd: (event) => {
          if (event.oldIndex !== undefined && event.newIndex !== undefined) {
            this._reorderFormArray(
              'tenantStructure',
              event.oldIndex,
              event.newIndex,
            );
          }
        },
      });
    }

    // Initialize drag & drop for user structure
    if (this.userTableBody()) {
      Sortable.create(this.userTableBody()!.nativeElement, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        onEnd: (event) => {
          if (event.oldIndex !== undefined && event.newIndex !== undefined) {
            this._reorderFormArray(
              'userStructure',
              event.oldIndex,
              event.newIndex,
            );
          }
        },
      });
    }
  }

  /**
   * Reorders items in a FormArray after drag and drop.
   * @param arrayName the name of the FormArray ('tenantStructure' or 'userStructure').
   * @param oldIndex the previous index of the item.
   * @param newIndex the new index of the item.
   */
  private _reorderFormArray(
    arrayName: string,
    oldIndex: number,
    newIndex: number,
  ): void {
    if (oldIndex === newIndex) return;

    const formArray = this.productForm.get(arrayName) as FormArray;
    const control = formArray.at(oldIndex);
    formArray.removeAt(oldIndex);
    formArray.insert(newIndex, control);
    // A new order is a change to save: removeAt and insert don't mark the form dirty
    formArray.markAsDirty();
  }

  /**
   * Adds a new structure field to the structured FormArray.
   * @param type The type of structure field to add ('tenant' or 'user').
   * @param event the event to prevent default behavior.
   */
  addStructureField(type: 'tenant' | 'user', event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const structure = type === 'tenant' ? 'tenantStructure' : 'userStructure';
    (
      this.productForm.get(structure) as FormArray<
        FormGroup<StructureFieldForm>
      >
    ).push(
      new FormGroup<StructureFieldForm>({
        name: new FormControl<string | null>(null, [Validators.required]),
        type: new FormControl<string | null>(null, [Validators.required]),
        required: new FormControl<boolean | null>(false, [Validators.required]),
        array: new FormControl<boolean | null>(false, [Validators.required]),
        generated: new FormControl<boolean | null>(false, [
          Validators.required,
        ]),
        notModifiable: new FormControl<boolean | null>(false, [
          Validators.required,
        ]),
      }),
    );
  }

  /**
   * Finds the rules of a lever among the rules of the form.
   * @param lever the lever.
   * @returns the rules of the lever with their index in the form, in the order they were added.
   */
  rulesOf(lever: string): { rule: FormGroup<MixpanelLeverRuleForm>; index: number }[] {
    return this.mixpanelRulesControls
      .map((rule, index) => ({ rule, index }))
      .filter(entry => entry.rule.controls.lever.value === lever);
  }

  /**
   * Tells whether a field of a rule counts for its shape, so that the form shows it.
   * @param rule the rule.
   * @param field the field.
   * @returns true when the shape of the rule reads the field.
   */
  showsRuleField(rule: FormGroup<MixpanelLeverRuleForm>, field: keyof MixpanelLeverRuleForm): boolean {
    const shape = rule.controls.shape.value as MixpanelRuleShape | null;
    if (!shape) {
      return false;
    }

    const scope = (rule.controls.inactivityScope.value ?? MixpanelInactivityScope.Tenant) as MixpanelInactivityScope;
    return RULE_FIELDS[shape].includes(field) || (shape === MixpanelRuleShape.Inactivity && SCOPE_FIELDS[scope].includes(field));
  }

  /**
   * Adds an empty rule for a lever, in observation until its thresholds are set on the data.
   * @param event the event to prevent default behavior.
   * @param lever the lever.
   */
  addMixpanelRule(event: Event, lever: string): void {
    event.preventDefault();
    event.stopPropagation();

    const rule = this._buildRuleGroup(lever);
    this.productForm.controls.mixpanelRules.push(rule);
    this.productForm.controls.mixpanelRules.markAsDirty();
    this.openRules.update(open => new Set(open).add(rule));
  }

  /**
   * Tells whether an integration has what it needs to work.
   * @param integration the integration.
   * @returns true when its required values are set.
   */
  isConfigured(integration: Integration): boolean {
    const value = this.productForm.getRawValue();

    switch (integration) {
      case 'hubspot':
        return !!value.hubspotSolution;
      case 'intercom':
        return !!value.intercomBrand;
      case 'sentry':
        return !!value.sentryProjectId;
      case 'stripe':
        return !!value.stripeApiKey && !!value.stripeWebhookSecret && !!value.stripeTaxRateId;
      case 'mixpanel':
        return !!value.mixpanelProjectId;
    }
  }

  /**
   * Sums up the values of an integration for the header of its card.
   * @param integration the integration.
   * @returns the line under the name of the integration.
   */
  integrationSummary(integration: Integration): string {
    const value = this.productForm.getRawValue();

    switch (integration) {
      case 'hubspot':
        return value.hubspotSolution ? `Soluzione d'interesse: ${value.hubspotSolution}` : 'Nessuna soluzione d\'interesse';
      case 'intercom':
        return value.intercomBrand ? `Brand: ${value.intercomBrand}` : 'Nessun brand scelto';
      case 'sentry': {
        const parts = [value.sentryProjectId ? this.sentryProjectLabel(value.sentryProjectId) : null, value.healthCheckUrl];
        return parts.filter(Boolean).join(' · ') || 'Nessun progetto';
      }
      case 'stripe':
        return value.stripeApiKey ? `Chiave che termina con ${value.stripeApiKey.slice(-4)}` : 'Nessuna chiave';
      case 'mixpanel': {
        const rules = this.mixpanelRulesControls.length;
        return value.mixpanelProjectId ? `Progetto ${value.mixpanelProjectId} · ${rules} ${rules === 1 ? 'regola' : 'regole'}` : 'Nessun progetto';
      }
    }
  }

  /**
   * Masks a secret, keeping its prefix and its last four characters.
   * @param secret the secret.
   * @returns the masked secret.
   */
  maskSecret(secret: string): string {
    const prefix = secret.match(/^[a-z]+_(?:live_|test_)?/)?.[0] ?? '';

    return `${prefix}••••••••${secret.slice(-4)}`;
  }

  /**
   * Tells whether a Stripe secret shows masked: stored and not being replaced.
   * @param secret the secret.
   * @returns true when the masked value shows in place of the input.
   */
  isSecretMasked(secret: StripeSecret): boolean {
    return !!this.productData()?.[secret] && !this.replacingSecrets().has(secret);
  }

  /**
   * Opens the input of a Stripe secret, empty, to replace the stored one; left pristine, so that saving without
   * typing keeps the stored secret.
   * @param secret the secret.
   */
  replaceSecret(secret: StripeSecret): void {
    this.productForm.controls[secret].setValue(null);

    this.replacingSecrets.update(replacing => new Set(replacing).add(secret));
  }

  /**
   * Gives up replacing a Stripe secret and keeps the stored one.
   * @param secret the secret.
   */
  keepSecret(secret: StripeSecret): void {
    this.productForm.controls[secret].setValue(this.productData()?.[secret] ?? null);
    this.productForm.controls[secret].markAsPristine();

    this.replacingSecrets.update(replacing => {
      const next = new Set(replacing);
      next.delete(secret);
      return next;
    });
  }

  /**
   * Opens a lever rule for editing, or closes it back to its sentence.
   * @param rule the rule.
   */
  toggleRule(rule: FormGroup<MixpanelLeverRuleForm>): void {
    this.openRules.update(open => {
      const next = new Set(open);
      if (!next.delete(rule)) {
        next.add(rule);
      }
      return next;
    });
  }

  /**
   * Reads a lever rule as a sentence: what it measures, on which events and over which period.
   * @param rule the rule.
   * @returns the pieces of the sentence, Mixpanel names apart.
   */
  ruleSentence(rule: FormGroup<MixpanelLeverRuleForm>): RuleSentencePart[] {
    const value = rule.getRawValue();
    const unit = value.unit ? this._unitPipe.transform(value.unit).toLowerCase() : '';
    const period = value.windowValue ? `, ultimi ${value.windowValue} ${unit}` : '';
    const sample = value.minSample ? `, almeno ${value.minSample} campioni` : '';
    const code = (names: string | null): RuleSentencePart => ({ text: names ?? '', code: true });

    switch (value.shape) {
      case MixpanelRuleShape.Milestone:
        return [
          value.anchorEventNames ? { text: 'Da ' } : { text: 'Dalla consegna delle credenziali' },
          ...(value.anchorEventNames ? [code(value.anchorEventNames)] : []),
          { text: ' a ' },
          code(value.eventNames),
          { text: `, in ${unit}` },
        ];
      case MixpanelRuleShape.Cadence:
        return [
          code(value.eventNames),
          { text: `${value.perActiveUser ? ' per utente attivo' : ''}, ogni ${value.windowValue ?? '-'} ${unit}` },
        ];
      case MixpanelRuleShape.Coverage:
        return [
          { text: 'Copertura di ' },
          code(value.property),
          { text: ' su ' },
          code(value.eventNames),
          ...(value.anchorEventNames ? [{ text: ' rispetto a ' }, code(value.anchorEventNames)] : []),
          { text: `, in percentuale${period}${sample}` },
        ];
      case MixpanelRuleShape.PropertyAverage:
        return [{ text: 'Media di ' }, code(value.property), { text: ' su ' }, code(value.eventNames), { text: `${period}${sample}` }];
      case MixpanelRuleShape.Inactivity:
        return this._inactivitySentence(value.inactivityScope, value.eventNames, value.property, value.closingEventNames, value.userRoles, unit);
      default:
        return [{ text: 'Nuova regola' }];
    }
  }

  /**
   * Labels the three bands of the thresholds of a lever rule, on the side its direction says is good.
   * @param rule the rule.
   * @returns the green, yellow and red labels, or null until both thresholds are set.
   */
  ruleBands(rule: FormGroup<MixpanelLeverRuleForm>): { green: string; yellow: string; red: string } | null {
    const value = rule.getRawValue();
    if (value.greenThreshold == null || value.yellowThreshold == null) {
      return null;
    }

    const direction = value.direction ?? IMPLIED_RULE_DIRECTION[value.shape as MixpanelRuleShape];
    return direction === MixpanelRuleDirection.AtLeast
      ? { green: `≥ ${value.greenThreshold}`, yellow: `≥ ${value.yellowThreshold}`, red: `< ${value.yellowThreshold}` }
      : { green: `≤ ${value.greenThreshold}`, yellow: `≤ ${value.yellowThreshold}`, red: `> ${value.yellowThreshold}` };
  }

  /**
   * Builds the lever rules to send from the form, leaving out the fields their shape does not read.
   * @returns the rules of every lever.
   */
  buildMixpanelRules(): CoreMixpanelLeverRule[] {
    return this.mixpanelRulesControls.map(rule => {
      const value = rule.getRawValue();
      const read = <T>(field: keyof MixpanelLeverRuleForm, fieldValue: T | null): T | null =>
        this.showsRuleField(rule, field) && fieldValue !== null && fieldValue !== '' ? fieldValue : null;

      const list = (field: 'eventNames' | 'anchorEventNames' | 'closingEventNames' | 'userRoles'): string[] | null => {
        const items = (read(field, value[field]) ?? '').split(',').map(item => item.trim()).filter(item => item);
        return items.length > 0 ? items : null;
      };

      return {
        ...(value.id && { id: value.id }),
        lever: value.lever as CoreMixpanelLeverRule['lever'],
        shape: value.shape as CoreMixpanelLeverRule['shape'],
        eventNames: list('eventNames'),
        anchorEventNames: list('anchorEventNames'),
        property: read('property', value.property),
        windowValue: read('windowValue', value.windowValue),
        unit: value.unit as CoreMixpanelLeverRule['unit'],
        perActiveUser: read('perActiveUser', value.perActiveUser),
        inactivityScope: read('inactivityScope', value.inactivityScope) as CoreMixpanelLeverRule['inactivityScope'],
        closingEventNames: list('closingEventNames'),
        userRoles: list('userRoles'),
        direction: read('direction', value.direction) as CoreMixpanelLeverRule['direction'],
        greenThreshold: value.greenThreshold!,
        yellowThreshold: value.yellowThreshold!,
        minSample: read('minSample', value.minSample),
        observationOnly: value.observationOnly ?? true,
      };
    });
  }

  /**
   * Reads an inactivity rule as a sentence, by what it looks at.
   * @param scope what the inactivity is measured on.
   * @param events the events that count as activity.
   * @param property the property that names the object.
   * @param closing the events that close the object.
   * @param roles the roles of the users looked at.
   * @param unit the unit of the thresholds, already in words.
   * @returns the pieces of the sentence.
   */
  private _inactivitySentence(scope: string | null, events: string | null, property: string | null, closing: string | null, roles: string | null, unit: string): RuleSentencePart[] {
    const on = events ? [{ text: ' su ' }, { text: events, code: true }] : [];
    const tail = { text: `, in ${unit}` };

    switch (scope) {
      case MixpanelInactivityScope.User:
        return [{ text: `Inattività degli utenti${roles ? ` (${roles})` : ''}` }, ...on, tail];
      case MixpanelInactivityScope.Object:
        return [
          { text: 'Inattività di ogni ' },
          { text: property ?? '', code: true },
          ...(closing ? [{ text: ' finché non arriva ' }, { text: closing, code: true }] : []),
          ...on,
          tail,
        ];
      default:
        return [{ text: 'Inattività dell\'azienda' }, ...on, tail];
    }
  }

  /**
   * Builds the group of a lever rule, filled from a stored rule, and keeps its validators in line with its shape.
   * @param lever the lever.
   * @param rule the stored rule, absent for a new one.
   * @returns the group.
   */
  private _buildRuleGroup(lever: string, rule?: CoreMixpanelLeverRule): FormGroup<MixpanelLeverRuleForm> {
    const group = new FormGroup<MixpanelLeverRuleForm>({
      id: new FormControl<string | null>(rule?.id ?? null),
      lever: new FormControl<string | null>(lever),
      shape: new FormControl<string | null>(rule?.shape ?? null, [Validators.required]),
      eventNames: new FormControl<string | null>(rule?.eventNames?.join(', ') || null),
      anchorEventNames: new FormControl<string | null>(rule?.anchorEventNames?.join(', ') || null),
      property: new FormControl<string | null>(rule?.property ?? null),
      windowValue: new FormControl<number | null>(rule?.windowValue ?? null),
      unit: new FormControl<string | null>(rule?.unit ?? MixpanelRuleUnit.Days, [Validators.required]),
      perActiveUser: new FormControl<boolean | null>(rule?.perActiveUser ?? false),
      inactivityScope: new FormControl<string | null>(rule?.inactivityScope ?? MixpanelInactivityScope.Tenant),
      closingEventNames: new FormControl<string | null>(rule?.closingEventNames?.join(', ') || null),
      userRoles: new FormControl<string | null>(rule?.userRoles?.join(', ') ?? null),
      direction: new FormControl<string | null>(rule?.direction ?? null),
      greenThreshold: new FormControl<number | null>(rule?.greenThreshold ?? null, [Validators.required, Validators.min(0)]),
      yellowThreshold: new FormControl<number | null>(rule?.yellowThreshold ?? null, [Validators.required, Validators.min(0)]),
      minSample: new FormControl<number | null>(rule?.minSample ?? null, [Validators.min(1)]),
      observationOnly: new FormControl<boolean | null>(rule?.observationOnly ?? true),
    });

    this._applyRuleValidators(group);
    group.controls.shape.valueChanges.subscribe(() => this._applyRuleValidators(group));
    group.controls.inactivityScope.valueChanges.subscribe(() => this._applyRuleValidators(group));
    return group;
  }

  /**
   * Requires the fields the shape of a rule reads: the event on every shape but the inactivity, which falls back on
   * the common core, the property, the window and the direction where the shape has them. An inactivity per object
   * needs its property.
   * @param group the group of the rule.
   */
  private _applyRuleValidators(group: FormGroup<MixpanelLeverRuleForm>): void {
    const shape = group.controls.shape.value as MixpanelRuleShape | null;
    const shows = (field: keyof MixpanelLeverRuleForm): boolean => this.showsRuleField(group, field);
    const require = (field: 'eventNames' | 'property' | 'windowValue' | 'direction', needed: boolean): void => {
      const control = group.controls[field];
      control.clearValidators();
      if (needed) {
        control.setValidators(field === 'windowValue' ? [Validators.required, Validators.min(1)] : [Validators.required]);
      }
      control.updateValueAndValidity({ emitEvent: false });
    };

    require('eventNames', shows('eventNames') && shape !== MixpanelRuleShape.Inactivity);
    require('property', shows('property'));
    require('windowValue', shows('windowValue'));
    require('direction', shows('direction'));
  }

  /**
   * Deletes a structure field from the corresponding FormArray
   * based on the selected field.
   */
  deleteStructuredField(): void {
    if (!this.selectedField) return;

    const arrayName = this.selectedField.type === 'tenant' ? 'tenantStructure'
      : this.selectedField.type === 'user' ? 'userStructure' : 'mixpanelRules';
    const formArray = this.productForm.get(arrayName) as FormArray;
    formArray.removeAt(this.selectedField.index);
    formArray.markAsDirty();

    this.closeDeleteFieldDialog();
  }

  /**
   * Opens the delete field dialog and sets the selected field.
   * @param type selector of the structure, tenant or user.
   * @param index index of the selected field.
   */
  openDeleteFieldDialog(type: 'tenant' | 'user' | 'mixpanel', index: number): void {
    this.selectedField = { type, index };
    this.dialog()?.open();
  }

  /**
   * Closes the delete field dialog and resets the selected field.
   */
  closeDeleteFieldDialog(): void {
    this.selectedField = null;
    this.dialog()?.close();
  }

  /**
   * Handles logo file selection from input.
   * @param event the input change event.
   */
  onLogoChosen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.onLogoSelected(file);
  }

  /**
   * Validates and uploads the logo chosen or dropped.
   * @param file the logo.
   */
  onLogoSelected(file: File): void {
    this.logoError.set(null);

    if (!this._allowedImageTypes.includes(file.type)) {
      this.logoError.set(
        "Il file deve essere un'immagine (JPEG, PNG, WebP o SVG).",
      );
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      this.logoError.set('Il file non deve superare i 5MB.');
      return;
    }

    this.logoPreviewUrl.set(URL.createObjectURL(file));
    this.logoSelected.emit(file);
  }

  /**
   * Sets the upload state for logo.
   * @param uploading whether uploading is in progress.
   */
  setLogoUploadingState(uploading: boolean): void {
    this.isUploadingLogo.set(uploading);
  }

  /**
   * Drops the local preview after a failed upload, back to the stored logo.
   */
  logoUploadFailed(): void {
    this.logoPreviewUrl.set(null);
    this.logoError.set('Caricamento del logo non riuscito.');
  }
}

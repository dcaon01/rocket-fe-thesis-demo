import { TitleCasePipe } from '@angular/common';
import { Component, computed, effect, inject, input } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBadgeEuro, lucideBookOpen, lucideChevronDown, lucideDownload, lucideExternalLink, lucideEye, lucideFileUp, lucideLink, lucidePresentation } from '@ng-icons/lucide';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { map } from 'rxjs';
import { CoreResponseMaterialDto } from '../../../../../../../libs/api/src';
import { MaterialType } from '../../../../enums/material-type.enum';
import { ResellerTier } from '../../../../enums/reseller-tier.enum';
import { MaterialTypePipe } from '../../../../pipes/material-type/material-type.pipe';
import { ProductsCacheService } from '../../../../services/cache/products-cache.service';
import { CreateEditMaterialForm } from '../../interfaces/create-edit-material-form.interface';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { formSteps, sectionsComplete, StepTab } from '../../../../utils/form-steps.util';
import { formChanges } from '../../../../utils/form-changes.util';
import { StepListComponent } from '../../../../components/step-list/step-list.component';
import { CopyButtonComponent } from '../../../../components/copy-button/copy-button.component';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';

/**
 * Form of a sales material: what it is and who sees it.
 * The file is not part of the form: it is attached from the material page once the material exists.
 */
@Component({
  selector: 'rocket-material-form',
  imports: [
    ...BrnSelectImports,
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmDropdownMenuImports,
    ...HlmInputImports,
    ...HlmLabelImports,
    ...HlmSelectImports,
    ...HlmTextareaImports,
    NgIcon,
    ReactiveFormsModule,
    TitleCasePipe,
    MaterialTypePipe,
    ...HlmTabsImports,
    ...HlmTooltipImports,
    ...HlmCardImports,
    StepListComponent,
    CopyButtonComponent,
  ],
  providers: [provideIcons({
      lucideBadgeEuro,
      lucideBookOpen,
      lucideChevronDown,
      lucideDownload,
      lucideExternalLink,
      lucideEye,
      lucideFileUp,
      lucideLink,
      lucidePresentation
    })],
  templateUrl: './material-form.component.html',
})
export class MaterialFormComponent {
  /** Products cache service instance. */
  private readonly _productsCacheService = inject(ProductsCacheService);

  /** Material to edit; absent when creating. */
  material = input<CoreResponseMaterialDto | null>(null);

  /** Whether the form shows a new record, whose sections open one after the other. */
  creating = input<boolean>(false);

  /** Whether the form is shown read-only. */
  readonly = input<boolean>(false);

  /** Material types. */
  materialTypes = Object.values(MaterialType);

  /** Reseller tiers. */
  resellerTiers = Object.values(ResellerTier);

  /** Form group of the material. */
  materialForm = new FormGroup<CreateEditMaterialForm>({
    title: new FormControl<string | null>(null, [Validators.required]),
    description: new FormControl<string | null>(null, [Validators.required]),
    type: new FormControl<MaterialType | null>(null, [Validators.required]),
    externalUrl: new FormControl<string | null>(null),
    productIds: new FormControl<string[] | null>([]),
    resellerTiers: new FormControl<ResellerTier[] | null>([]),
  });

  /** Ordered definition of the form sections shown in the sidebar navigation. */
  readonly tabs = computed<StepTab[]>(() => [
    { id: 'contenuto', label: 'Contenuto', icon: 'lucideBookOpen' },
    { id: 'visibilita', label: 'Visibilità', icon: 'lucideEye' },
    // The file is attached to an existing material: shown, but disabled, while creating.
    ...(this.isLink() ? [] : [{ id: 'file', label: 'File', icon: 'lucideFileUp', disabled: !this.material(), hint: 'Il file si carica dopo aver creato il materiale.', noFields: true }]),
  ]);

  /** Navigation through the sections, one after the other while creating, each once its required fields are valid. */
  readonly steps = formSteps(this.tabs, this.creating, sectionsComplete(this.materialForm, {
    contenuto: ['title', 'description', 'type', 'externalUrl'],
    visibilita: ['productIds', 'resellerTiers'],
  }));

  /** Whether the form holds changes to save: a value brought back to where it was is no change. */
  readonly changed = formChanges(this.materialForm);

  /** Every value of the form, disabled fields included, for the live preview. */
  formValue = toSignal(
    this.materialForm.valueChanges.pipe(map(() => this.materialForm.getRawValue())),
    { initialValue: this.materialForm.getRawValue() }
  );

  /** Whether the material is an external link rather than a file. */
  isLink = computed(() => this.formValue().type === MaterialType.ExternalLink);

  /** Whether the fields can be modified; otherwise their values show as text. */
  isEditable = computed(() => !this.readonly());

  /** Whether the type can be modified: only while creating, since it is fixed once the material exists. */
  isTypeEditable = computed(() => this.isEditable() && !this.material());

  /** Products the material can be assigned to. */
  products = this._productsCacheService.products;

  /**
   * Constructor of the form component.
   */
  constructor() {
    // Populate the form from the material to edit; the type is fixed once the material exists.
    effect(() => {
      const material = this.material();
      if (!material) return;
      this.materialForm.reset({
        title: material.title,
        description: material.description ?? null,
        type: material.type as MaterialType,
        externalUrl: material.externalUrl ?? null,
        productIds: material.productIds ?? [],
        resellerTiers: (material.resellerTiers ?? []) as ResellerTier[],
      });
      this.materialForm.controls.type.disable();
    });

    // Disable the whole form in read-only mode.
    effect(() => {
      if (this.readonly()) {
        this.materialForm.disable();
      }
    });

    // Require the link for the external-link materials.
    this.materialForm.controls.type.valueChanges.pipe(takeUntilDestroyed())
      .subscribe(type => this._applyLinkValidators(type));
  }

  /**
   * Whether a product is selected.
   * @param productId the identifier of the product.
   * @returns true when selected.
   */
  isProductSelected(productId: string): boolean {
    return this.materialForm.value.productIds?.includes(productId) ?? false;
  }

  /**
   * Toggles a product in the assignment.
   * @param productId the identifier of the product.
   */
  toggleProduct(productId: string): void {
    this._toggle(this.materialForm.controls.productIds, productId);
  }

  /**
   * Whether a tier is selected.
   * @param tier the tier.
   * @returns true when selected.
   */
  isTierSelected(tier: ResellerTier): boolean {
    return this.materialForm.value.resellerTiers?.includes(tier) ?? false;
  }

  /**
   * Toggles a tier in the assignment.
   * @param tier the tier.
   */
  toggleTier(tier: ResellerTier): void {
    this._toggle(this.materialForm.controls.resellerTiers, tier);
  }

  /**
   * Finds the chosen products, shown as badges while reading.
   * @returns the products, empty when none is chosen.
   */
  selectedProducts(): { id: string; name: string }[] {
    const selected = this.materialForm.value.productIds ?? [];

    return this.products().filter(product => selected.includes(product.id));
  }

  /**
   * Joins the names of the chosen products for the trigger of their menu.
   * @returns the names, or every product when none is chosen.
   */
  productsLabel(): string {
    const selected = this.materialForm.value.productIds ?? [];
    if (!selected.length) return 'Tutti i prodotti';
    return this.products().filter(product => selected.includes(product.id)).map(product => product.name).join(', ');
  }

  /**
   * Adds a value to a multi-choice control, or removes it when already there.
   * @param control the control.
   * @param value the value to toggle.
   */
  private _toggle<T>(control: FormControl<T[] | null>, value: T): void {
    const current = control.value ?? [];
    control.setValue(current.includes(value) ? current.filter(item => item !== value) : [...current, value]);
    control.markAsDirty();
  }

  /**
   * Makes the link required for the external-link type and clears it for the others.
   * @param type the selected type.
   */
  private _applyLinkValidators(type: MaterialType | null): void {
    const { externalUrl } = this.materialForm.controls;
    externalUrl.clearValidators();
    if (type === MaterialType.ExternalLink) {
      externalUrl.setValidators([Validators.required, Validators.pattern(/^https?:\/\/\S+$/)]);
    }
    externalUrl.updateValueAndValidity();
  }
}

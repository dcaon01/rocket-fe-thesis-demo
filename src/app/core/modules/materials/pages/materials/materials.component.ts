import { TitleCasePipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { lucideDownload, lucideExternalLink, lucideEye, lucidePencil, lucidePlus, lucideInbox, lucideTrash2, lucideSearch } from '@ng-icons/lucide';
import { BrnDialog, BrnDialogImports } from '@spartan-ng/brain/dialog';
import { BrnComboboxImports, comboboxContainsFilter } from '@spartan-ng/brain/combobox';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { finalize, map } from 'rxjs';
import { CoreResponseMaterialDto } from '../../../../../../../libs/api/src';
import { MultiSelectFilterComponent } from '../../../../components/multi-select-filter/multi-select-filter.component';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { TablePaginationComponent } from '../../../../components/table-pagination/table-pagination.component';
import { MaterialStatusDirective } from '../../../../directives/material-status.directive';
import { Capability } from '../../../../enums/capability.enum';
import { MaterialStatus } from '../../../../enums/material-status.enum';
import { MaterialType } from '../../../../enums/material-type.enum';
import { ResellerTier } from '../../../../enums/reseller-tier.enum';
import { MaterialStatusPipe } from '../../../../pipes/material-status/material-status.pipe';
import { MaterialTypePipe } from '../../../../pipes/material-type/material-type.pipe';
import { ComboboxOption } from '../../../../interfaces/combobox-option.interface';
import { MaterialsApiService, MaterialsFilters } from '../../../../services/api-services/materials/materials-api.service';
import { S3UploadService } from '../../../../services/api-services/s3/s3-upload.service';
import { ProductsCacheService } from '../../../../services/cache/products-cache.service';
import { CursorPaginationService } from '../../../../services/pagination/cursor-pagination.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { hasEmptySelection, orUndefined, sameFilters } from '../../../../utils/filters.util';
import { openInNewTab } from '../../../../utils/open-in-new-tab.util';
import { FilterMaterialsForm } from '../../interfaces/filter-materials-form.interface';
import { ResellerTierPipe } from '../../../../pipes/reseller-tier/reseller-tier.pipe';

/** Values of the material filters. */
type MaterialFilterValues = ReturnType<FormGroup<FilterMaterialsForm>['getRawValue']>;

/** Filters the catalogue opens with, and that the reset brings back: withdrawn materials only when asked for. */
const DEFAULT_MATERIAL_FILTERS: MaterialFilterValues = { search: null, type: null, status: [MaterialStatus.Draft, MaterialStatus.Published], productId: null, tier: null };

/**
 * Sales materials offered to the resale network, in every state.
 * Resellers see only the published ones, on the shelf of their workspace.
 */
@Component({
  selector: 'rocket-materials',
  imports: [
    ...HlmInputGroupImports,
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...BrnComboboxImports,
    ...BrnDialogImports,
    ...HlmComboboxImports,
    ...HlmDialogImports,
    ...HlmInputImports,
    ...HlmLabelImports,
    ...HlmTableImports,
    ...HlmTooltipImports,
    PageHeaderComponent,
    MultiSelectFilterComponent,
    TablePaginationComponent,
    MaterialStatusDirective,
    NgIcon,
    TitleCasePipe,
    MaterialStatusPipe,
    MaterialTypePipe,
    ReactiveFormsModule,
    ...HlmEmptyImports
  ],
  providers: [
    CursorPaginationService,
    provideIcons({ lucideSearch, lucideInbox,
      lucideDownload,
      lucideExternalLink,
      lucideEye,
      lucidePencil,
      lucidePlus,
      lucideTrash2,
    })
  ],
  templateUrl: './materials.component.html',
})
export class MaterialsComponent {
  /** Router instance. */
  private readonly _router = inject(Router);

  /** Activated route instance. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Materials API service instance. */
  private readonly _materialsApiService = inject(MaterialsApiService);

  /** Products cache service instance. */
  private readonly _productsCacheService = inject(ProductsCacheService);

  /** S3 upload service instance. */
  private readonly _s3UploadService = inject(S3UploadService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Pages of the materials. */
  readonly pager = inject<CursorPaginationService<CoreResponseMaterialDto>>(CursorPaginationService);

  /** Whether the user can create, edit and publish materials. */
  readonly canManage = computed(() => this._permissions.can(Capability.ManageMaterials));

  /** Delete dialog reference. */
  deleteDialog = viewChild<BrnDialog>('deleteDialog');

  /** Material selected for deletion. */
  selectedMaterial = signal<CoreResponseMaterialDto | null>(null);

  /** Loading state signal. */
  isLoading = signal<boolean>(false);

  /** Material types offered by the type filter. */
  typeOptions: ComboboxOption[] = Object.values(MaterialType).map(type => ({ value: type, label: new MaterialTypePipe().transform(type) }));

  /** Material statuses offered by the status filter. */
  statusOptions: ComboboxOption[] = Object.values(MaterialStatus).map(status => ({ value: status, label: new MaterialStatusPipe().transform(status) }));

  /** Reseller tiers offered by the tier filter. */
  tierOptions: ComboboxOption[] = Object.values(ResellerTier).map(tier => ({ value: tier, label: new ResellerTierPipe().transform(tier) }));

  /** Filter of the product combobox. */
  readonly comboboxContainsFilter = comboboxContainsFilter;

  /** Converts a product identifier to its name, for the product combobox. */
  readonly productLabel = (productId: string): string => this._productNames().get(productId) ?? '';

  /** Products a material can be assigned to. */
  readonly products = this._productsCacheService.products;

  /** Form group for filtering the materials. */
  materialsFilterForm = new FormGroup<FilterMaterialsForm>({
    search: new FormControl<string | null>(DEFAULT_MATERIAL_FILTERS.search),
    type: new FormControl<string[] | null>(DEFAULT_MATERIAL_FILTERS.type),
    status: new FormControl<string[] | null>(DEFAULT_MATERIAL_FILTERS.status),
    productId: new FormControl<string | null>(DEFAULT_MATERIAL_FILTERS.productId),
    tier: new FormControl<string[] | null>(DEFAULT_MATERIAL_FILTERS.tier),
  });

  /** Filters applied to the list. */
  appliedFilters = signal<MaterialFilterValues>(DEFAULT_MATERIAL_FILTERS);

  /** Values of the filter form, as a signal. */
  private readonly _formValue = toSignal(
    this.materialsFilterForm.valueChanges.pipe(map(() => this.materialsFilterForm.getRawValue())),
    { initialValue: this.materialsFilterForm.getRawValue() },
  );

  /** Whether the form holds filters other than the applied ones. */
  readonly canApply = computed(() => !sameFilters(this._formValue(), this.appliedFilters()));

  /** Whether the applied filters differ from the defaults. */
  readonly isFiltered = computed(() => !sameFilters(this.appliedFilters(), DEFAULT_MATERIAL_FILTERS));

  /** Product names by identifier. */
  private readonly _productNames = computed(() => new Map(this._productsCacheService.products().map(product => [product.id, product.name])));

  /**
   * Constructor of the page component.
   */
  constructor() {
    // Read the first page whenever the applied filters change.
    effect(() => {
      const filters = this.appliedFilters();

      // A multiple filter on «Nessuno» matches nothing: the list empties without a request.
      if (hasEmptySelection(this.appliedFilters())) {
        untracked(() => this.pager.clear());
        return;
      }

      untracked(() => this.pager.load(page => this._materialsApiService.listMaterials(page, this._toQuery(filters))));
    });
  }

  /**
   * Reads the current page again.
   */
  loadMaterials(): void {
    this.pager.reload();
  }

  /**
   * Tells whether a material can be deleted: by whoever manages materials, unless it is published.
   * @param material the material.
   * @returns true when the delete icon is shown.
   */
  canDelete(material: CoreResponseMaterialDto): boolean {
    return this.canManage() && material.status !== MaterialStatus.Published;
  }

  /**
   * Opens the delete confirmation dialog.
   * @param material the material to delete.
   */
  openDeleteDialog(material: CoreResponseMaterialDto): void {
    this.selectedMaterial.set(material);
    this.deleteDialog()?.open();
  }

  /**
   * Closes the delete confirmation dialog.
   */
  closeDeleteDialog(): void {
    this.selectedMaterial.set(null);
    this.deleteDialog()?.close();
  }

  /**
   * Deletes the selected material together with its file, then reloads the list.
   */
  deleteMaterial(): void {
    const material = this.selectedMaterial();
    if (!material) return;

    this.isLoading.set(true);
    this._materialsApiService.deleteMaterial(material.id).pipe(
      finalize(() => {
        this.isLoading.set(false);
        this.closeDeleteDialog();
        this.loadMaterials();
      })
    ).subscribe();
  }

  /**
   * Applies the filters of the form and reads the first page.
   */
  applyFilters(): void {
    this.appliedFilters.set(this.materialsFilterForm.getRawValue());
  }

  /**
   * Brings the filters back to their defaults and reads the first page.
   */
  resetFilters(): void {
    this.materialsFilterForm.reset(DEFAULT_MATERIAL_FILTERS);
    this.appliedFilters.set(DEFAULT_MATERIAL_FILTERS);
  }

  /**
   * Returns the names of the products a material is assigned to.
   * @param material the material.
   * @returns the product names, or «Tutti» when it is for every product.
   */
  productsOf(material: CoreResponseMaterialDto): string {
    if (!material.productIds?.length) return 'Tutti';
    return material.productIds.map(id => this._productNames().get(id) ?? id).join(', ');
  }

  /**
   * Whether a material is an external link rather than a file.
   * @param material the material.
   * @returns true for a link.
   */
  isLink(material: CoreResponseMaterialDto): boolean {
    return material.type === MaterialType.ExternalLink;
  }

  /**
   * Opens a material: the link, or the file through a signed download URL.
   * @param material the material to open.
   */
  openMaterial(material: CoreResponseMaterialDto): void {
    if (this.isLink(material)) {
      if (material.externalUrl) openInNewTab(material.externalUrl);
      return;
    }
    if (!material.fileS3Key) return;
    this._s3UploadService.getDownloadUrl('MATERIAL_FILE', material.fileS3Key).subscribe(url => openInNewTab(url));
  }

  /**
   * Navigates to the material creation page.
   */
  goToCreateMaterial(): void {
    this._router.navigate(['create'], { relativeTo: this._activatedRoute });
  }

  /**
   * Navigates to the material page.
   * @param materialId the identifier of the material.
   */
  goToMaterial(materialId: string): void {
    this._router.navigate(['edit', materialId], { relativeTo: this._activatedRoute });
  }

  /**
   * Turns the filter values into the query of the catalogue.
   * @param filters the filter values.
   * @returns the query.
   */
  private _toQuery(filters: MaterialFilterValues): MaterialsFilters {
    return {
      search: orUndefined(filters.search),
      type: orUndefined(filters.type) as MaterialsFilters['type'],
      status: orUndefined(filters.status) as MaterialsFilters['status'],
      productId: filters.productId ?? undefined,
      tier: orUndefined(filters.tier) as MaterialsFilters['tier'],
    };
  }
}

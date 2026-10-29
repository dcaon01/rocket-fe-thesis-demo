import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { lucideDownload, lucideExternalLink, lucideInbox, lucideSearch } from '@ng-icons/lucide';
import { BrnComboboxImports, comboboxContainsFilter } from '@spartan-ng/brain/combobox';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { map, Observable } from 'rxjs';
import { CoreResponseMaterialDto, CoreResponseMaterialsPageDto } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { TablePaginationComponent } from '../../../../components/table-pagination/table-pagination.component';
import { MaterialType } from '../../../../enums/material-type.enum';
import { MaterialTypePipe } from '../../../../pipes/material-type/material-type.pipe';
import { PageRequest } from '../../../../interfaces/page.interface';
import { AvailableMaterialsFilters, MaterialsApiService } from '../../../../services/api-services/materials/materials-api.service';
import { S3UploadService } from '../../../../services/api-services/s3/s3-upload.service';
import { AppContextService } from '../../../../services/app-context/app-context.service';
import { ProductsCacheService } from '../../../../services/cache/products-cache.service';
import { CursorPaginationService } from '../../../../services/pagination/cursor-pagination.service';
import { UserContextService } from '../../../../services/user-context/user-context.service';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { hasEmptySelection, orUndefined, sameFilters } from '../../../../utils/filters.util';
import { FilterMaterialsForm } from '../../../materials/interfaces/filter-materials-form.interface';
import { openInNewTab } from '../../../../utils/open-in-new-tab.util';
import { MultiSelectFilterComponent } from '../../../../components/multi-select-filter/multi-select-filter.component';
import { ComboboxOption } from '../../../../interfaces/combobox-option.interface';

/** Values of the shelf filters. */
type ShelfFilterValues = ReturnType<FormGroup<FilterMaterialsForm>['getRawValue']>;

/** Filters the shelf opens with, and that the reset brings back; status and tier are fixed by the shelf itself. */
const DEFAULT_SHELF_FILTERS: ShelfFilterValues = { search: null, type: null, status: null, productId: null, tier: null };

/**
 * Shelf of the sales materials published for a reseller, read-only, in the same table as the catalogue.
 * A reseller gets the materials of its tier and products; a Keus collaborator browsing the
 * workspace gets exactly what the reseller it is looking at would get.
 */
@Component({
  selector: 'rocket-reseller-materials',
  imports: [
    ...HlmInputGroupImports,
    ...HlmButtonImports,
    ...BrnComboboxImports,
    ...HlmComboboxImports,
    ...HlmInputImports,
    ...HlmLabelImports,
    ...HlmTableImports,
    ...HlmTooltipImports,
    PageHeaderComponent,
    MultiSelectFilterComponent,
    TablePaginationComponent,
    ReactiveFormsModule,
    NgIcon,
    MaterialTypePipe,
    ...HlmEmptyImports
  ],
  providers: [
    CursorPaginationService,
    provideIcons({ lucideSearch, lucideDownload,
      lucideExternalLink,
      lucideInbox,
    })
  ],
  templateUrl: './reseller-materials.component.html',
})
export class ResellerMaterialsComponent {
  /** Materials API service instance. */
  private readonly _materialsApiService = inject(MaterialsApiService);

  /** S3 upload service instance. */
  private readonly _s3UploadService = inject(S3UploadService);

  /** App context service instance. */
  private readonly _appContextService = inject(AppContextService);

  /** User context service instance. */
  private readonly _userContextService = inject(UserContextService);

  /** Products cache service instance. */
  private readonly _productsCacheService = inject(ProductsCacheService);

  /** Pages of the shelf. */
  readonly pager = inject<CursorPaginationService<CoreResponseMaterialDto>>(CursorPaginationService);

  /** Material types offered by the type filter. */
  typeOptions: ComboboxOption[] = Object.values(MaterialType).map(type => ({ value: type, label: new MaterialTypePipe().transform(type) }));

  /** Filter of the product combobox. */
  readonly comboboxContainsFilter = comboboxContainsFilter;

  /** Products a material can be assigned to. */
  readonly products = this._productsCacheService.products;

  /** Converts a product identifier to its name, for the product combobox. */
  readonly productLabel = (productId: string): string => this._productNames().get(productId) ?? '';

  /** Form group for filtering the shelf; status and tier are fixed by the shelf itself. */
  materialsFilterForm = new FormGroup<FilterMaterialsForm>({
    search: new FormControl<string | null>(DEFAULT_SHELF_FILTERS.search),
    type: new FormControl<string[] | null>(DEFAULT_SHELF_FILTERS.type),
    status: new FormControl<string[] | null>(DEFAULT_SHELF_FILTERS.status),
    productId: new FormControl<string | null>(DEFAULT_SHELF_FILTERS.productId),
    tier: new FormControl<string[] | null>(DEFAULT_SHELF_FILTERS.tier),
  });

  /** Filters applied to the list. */
  appliedFilters = signal<ShelfFilterValues>(DEFAULT_SHELF_FILTERS);

  /** Values of the filter form, as a signal. */
  private readonly _formValue = toSignal(
    this.materialsFilterForm.valueChanges.pipe(map(() => this.materialsFilterForm.getRawValue())),
    { initialValue: this.materialsFilterForm.getRawValue() },
  );

  /** Whether the form holds filters other than the applied ones. */
  readonly canApply = computed(() => !sameFilters(this._formValue(), this.appliedFilters()));

  /** Whether the applied filters differ from the defaults. */
  readonly isFiltered = computed(() => !sameFilters(this.appliedFilters(), DEFAULT_SHELF_FILTERS));

  /** Whether the viewer is a Keus collaborator previewing the shelf. */
  readonly isPreview = computed(() => !this._userContextService.isReseller());

  /** Product names by identifier. */
  private readonly _productNames = computed(() => new Map(this.products().map(product => [product.id, product.name])));

  /**
   * Constructor of the page component.
   */
  constructor() {
    // Read the first page of the shelf when the reseller of the workspace or the applied filters change.
    effect(() => {
      const resellerId = this._appContextService.resellerId();
      const filters = this.appliedFilters();
      if (!resellerId) return;

      // A multiple filter on «Nessuno» matches nothing: the list empties without a request.
      if (hasEmptySelection(filters)) {
        untracked(() => this.pager.clear());
        return;
      }

      untracked(() => this.pager.load(page => this._loadMaterials(resellerId, page, filters)));
    });
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
    this.materialsFilterForm.reset(DEFAULT_SHELF_FILTERS);
    this.appliedFilters.set(DEFAULT_SHELF_FILTERS);
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
   * Reads one page of the available materials; a collaborator previews them as the reseller of the workspace.
   * @param resellerId the identifier of the reseller of the workspace.
   * @param page the page to read.
   * @param filters the applied filters.
   * @returns the page of available materials.
   */
  private _loadMaterials(resellerId: string, page: PageRequest, filters: ShelfFilterValues): Observable<CoreResponseMaterialsPageDto> {
    const query: AvailableMaterialsFilters = {
      search: orUndefined(filters.search),
      type: orUndefined(filters.type) as AvailableMaterialsFilters['type'],
      productId: filters.productId ?? undefined,
      ...(this.isPreview() ? { resellerId } : {}),
    };
    return this._materialsApiService.listAvailableMaterials(page, query);
  }
}

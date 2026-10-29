import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideDownload, lucideEllipsisVertical, lucideEyeOff, lucideFileUp, lucideSend } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { finalize, Observable, switchMap } from 'rxjs';
import { CoreResponseMaterialDto, CoreUpdateMaterialDto } from '../../../../../../../libs/api/src';
import { PageHeaderComponent } from '../../../../components/page-header/page-header.component';
import { MaterialStatusDirective } from '../../../../directives/material-status.directive';
import { Capability } from '../../../../enums/capability.enum';
import { MaterialStatus } from '../../../../enums/material-status.enum';
import { MaterialType } from '../../../../enums/material-type.enum';
import { MaterialStatusPipe } from '../../../../pipes/material-status/material-status.pipe';
import { MaterialTypePipe } from '../../../../pipes/material-type/material-type.pipe';
import { MaterialsApiService } from '../../../../services/api-services/materials/materials-api.service';
import { S3UploadService } from '../../../../services/api-services/s3/s3-upload.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';
import { MaterialFormComponent } from '../../components/material-form/material-form.component';
import { HlmItemImports } from '@spartan-ng/helm/item';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { FileDropZoneDirective } from '../../../../directives/file-drop-zone.directive';
import { openInNewTab } from '../../../../utils/open-in-new-tab.util';
import { acceptsFile } from '../../../../utils/file-accept.util';
import { ToasterService } from '../../../../services/toaster/toaster.service';

/** Files a material can attach: the list of the file input, checked also on the dropped files. */
const MATERIAL_ACCEPT = '.pdf,.docx,.pptx,.xlsx,.zip,image/*';

/**
 * Page of a single sales material: its data, its file and its publication.
 * A material stays editable in every state; it is deleted from the list.
 */
@Component({
  selector: 'rocket-materials-edit',
  imports: [
    ...HlmBadgeImports,
    ...HlmButtonImports,
    ...HlmDropdownMenuImports,
    ...HlmLabelImports,
    PageHeaderComponent,
    MaterialFormComponent,
    MaterialStatusDirective,
    NgIcon,
    DecimalPipe,
    MaterialStatusPipe,
    MaterialTypePipe,
    ...HlmItemImports,
    ...HlmTooltipImports,
    FileDropZoneDirective
  ],
  providers: [
    provideIcons({
      lucideDownload,
      lucideEllipsisVertical,
      lucideEyeOff,
      lucideFileUp,
      lucideSend,
    })
  ],
  templateUrl: './materials-edit.component.html',
})
export class MaterialsEditComponent {
  /** Activated route instance. */
  private readonly _activatedRoute = inject(ActivatedRoute);

  /** Materials API service instance. */
  private readonly _materialsApiService = inject(MaterialsApiService);

  /** S3 upload service instance. */
  private readonly _s3UploadService = inject(S3UploadService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Toaster service instance. */
  private readonly _toasterService = inject(ToasterService);

  /** Files a material can attach, for the file input. */
  readonly materialAccept = MATERIAL_ACCEPT;

  /** View child reference to the material form component. */
  form = viewChild<MaterialFormComponent>('form');


  /** Material shown in the page. */
  material = signal<CoreResponseMaterialDto | null>(null);

  /** Loading state signal. */
  isLoading = signal<boolean>(false);

  /** Whether the user can edit and publish materials. */
  readonly canManage = computed(() => this._permissions.can(Capability.ManageMaterials));

  /** Whether the material is a link rather than a file. */
  readonly isLink = computed(() => this.material()?.type === MaterialType.ExternalLink);

  /** Whether the material has what its type needs to be published. */
  readonly hasContent = computed(() => {
    const material = this.material();
    return this.isLink() ? Boolean(material?.externalUrl) : Boolean(material?.fileS3Key);
  });

  /** Whether the material can be published: from draft, or again after a withdrawal. */
  readonly canPublish = computed(() => this.canManage() && this.material()?.status !== MaterialStatus.Published);

  /** Whether the material is on the shelf and can be withdrawn. */
  readonly canWithdraw = computed(() => this.canManage() && this.material()?.status === MaterialStatus.Published);

  /** Name of the attached file, as the resellers download it. */
  readonly fileName = computed(() => this.material()?.fileS3Key?.split('/').pop() ?? null);

  /**
   * Constructor of the page component.
   */
  constructor() {
    // Load the material.
    this._materialsApiService.getMaterial(this._activatedRoute.snapshot.params['id'])
      .subscribe(material => this.material.set(material));
  }

  /**
   * Whether the options menu has an entry, so the button is rendered only then.
   * @returns true when the menu is not empty.
   */
  hasMenuActions(): boolean {
    return (this.canPublish() && (!this.hasContent() || Boolean(this.form()?.materialForm?.dirty)))
      || this.canWithdraw();
  }

  /**
   * Saves the changed fields.
   */
  saveMaterial(): void {
    const material = this.material();
    const materialForm = this.form()?.materialForm;
    if (!material || !materialForm?.dirty) return;

    const { title, description, externalUrl, productIds, resellerTiers } = materialForm.controls;
    const materialDto: CoreUpdateMaterialDto = {
      ...(title.dirty ? { title: title.value ?? '' } : {}),
      ...(description.dirty ? { description: description.value ?? '' } : {}),
      ...(externalUrl.dirty ? { externalUrl: externalUrl.value ?? '' } : {}),
      ...(productIds.dirty ? { productIds: productIds.value ?? [] } : {}),
      ...(resellerTiers.dirty ? { resellerTiers: resellerTiers.value ?? [] } : {}),
    };
    this._runUpdate(this._materialsApiService.updateMaterial(material.id, materialDto));
  }

  /**
   * Takes the file chosen with the button.
   * @param event the change event of the file input.
   */
  onFileChosen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.onFileSelected(file);
  }

  /**
   * Uploads the file chosen or dropped, replacing the previous one.
   * @param file the file.
   */
  onFileSelected(file: File): void {
    const material = this.material();
    if (!material) return;
    if (!acceptsFile(file, MATERIAL_ACCEPT)) {
      this._toasterService.showError('Il file deve essere un PDF, un Word, un PowerPoint, un Excel, uno ZIP o un\'immagine.');
      return;
    }

    this._runUpdate(this._s3UploadService.uploadMaterialFile(material.id, file).pipe(
      switchMap(fileS3Key => this._materialsApiService.updateMaterial(material.id, { fileS3Key }))
    ));
  }

  /**
   * Opens the attached file in a new tab.
   */
  downloadFile(): void {
    const fileS3Key = this.material()?.fileS3Key;
    if (!fileS3Key) return;
    this._s3UploadService.getDownloadUrl('MATERIAL_FILE', fileS3Key).subscribe(url => openInNewTab(url));
  }

  /**
   * Publishes the material on the shelf of the resellers it is assigned to.
   */
  publishMaterial(): void {
    const material = this.material();
    if (!material) return;
    this._runUpdate(this._materialsApiService.publishMaterial(material.id));
  }

  /**
   * Takes the material off the shelf.
   */
  withdrawMaterial(): void {
    const material = this.material();
    if (!material) return;
    this._runUpdate(this._materialsApiService.withdrawMaterial(material.id));
  }

  /**
   * Runs an update of the material and shows the result.
   * @param update$ the update request.
   */
  private _runUpdate(update$: Observable<CoreResponseMaterialDto>): void {
    this.isLoading.set(true);
    update$.pipe(finalize(() => this.isLoading.set(false))).subscribe(material => this.material.set(material));
  }
}

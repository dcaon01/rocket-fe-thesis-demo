import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideImage, lucideImagePlus, lucideLoader } from '@ng-icons/lucide';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmItemImports } from '@spartan-ng/helm/item';
import { FileDropZoneDirective } from '../../../../directives/file-drop-zone.directive';
import { finalize } from 'rxjs';
import { CoreResponseResellerDto } from '../../../../../../../libs/api/src';
import { Capability } from '../../../../enums/capability.enum';
import { S3UploadService } from '../../../../services/api-services/s3/s3-upload.service';
import { PermissionsService } from '../../../../services/permissions/permissions.service';

/** Content types Word embeds without conversion, the only ones the backend accepts for a reseller logo. */
const LOGO_CONTENT_TYPES = ['image/png', 'image/jpeg'];

/** Maximum size of a logo, in bytes (5MB). */
const LOGO_MAX_SIZE = 5 * 1024 * 1024;

/**
 * Logo a reseller puts on its indirect-channel offers.
 * The file is uploaded as soon as it is chosen; the backend saves the key on the reseller from the
 * upload event, so the avatar shows the local preview meanwhile.
 * Usage: <rocket-reseller-logo [reseller]="reseller" />
 */
@Component({
  selector: 'rocket-reseller-logo',
  imports: [
    ...HlmAvatarImports,
    ...HlmButtonImports,
    ...HlmItemImports,
    FileDropZoneDirective,
    NgIcon,
  ],
  providers: [
    provideIcons({
      lucideImage,
      lucideImagePlus,
      lucideLoader,
    })
  ],
  templateUrl: './reseller-logo.component.html',
})
export class ResellerLogoComponent {
  /** S3 upload service instance. */
  private readonly _s3UploadService = inject(S3UploadService);

  /** Permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Reseller the logo belongs to. */
  reseller = input.required<CoreResponseResellerDto>();

  /** S3 key of the current logo, if any. */
  private readonly _logoS3Key = computed(() => this.reseller().logoS3Key);

  /** Whether the user can replace the logo. */
  readonly canUpload = computed(() =>
    this._permissions.can(Capability.ManageResellerLogo) && this._permissions.canManageReseller(this.reseller())
  );

  /** URL of the logo shown: the local preview after an upload, the stored one otherwise. */
  logoUrl = signal<string | null>(null);

  /** Upload state signal. */
  isUploading = signal<boolean>(false);

  /** Validation or upload error. */
  logoError = signal<string | null>(null);

  /**
   * Constructor of the component.
   */
  constructor() {
    // Show the stored logo through a signed URL.
    effect(() => {
      const logoS3Key = this._logoS3Key();
      if (!logoS3Key) return;
      this._s3UploadService.getDownloadUrl('RESELLER_LOGO', logoS3Key).subscribe(url => this.logoUrl.set(url));
    });
  }

  /**
   * Handles the file chosen with the file input.
   * @param event the change event of the file input.
   */
  onLogoChosen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.onLogoSelected(file);
  }

  /**
   * Validates and uploads a logo, then shows its local preview.
   * @param file the logo, chosen or dropped.
   */
  onLogoSelected(file: File): void {
    this.logoError.set(null);
    if (!LOGO_CONTENT_TYPES.includes(file.type)) {
      this.logoError.set('Il logo deve essere un PNG o un JPEG: sono i formati che Word inserisce nelle offerte.');
      return;
    }
    if (file.size > LOGO_MAX_SIZE) {
      this.logoError.set('Il logo non deve superare i 5MB.');
      return;
    }

    this.isUploading.set(true);
    this._s3UploadService.uploadResellerLogo(this.reseller().id, file).pipe(
      finalize(() => this.isUploading.set(false))
    ).subscribe({
      next: () => this.logoUrl.set(URL.createObjectURL(file)),
      error: () => this.logoError.set('Caricamento del logo non riuscito.'),
    });
  }
}

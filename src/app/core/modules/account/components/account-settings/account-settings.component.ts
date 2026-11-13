import { Component, computed, effect, inject, input, model, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideCircle, lucideCircleCheck, lucideEye, lucideEyeOff, lucideImagePlus, lucideLoader, lucideShieldCheck, lucideUserRound, lucideX } from '@ng-icons/lucide';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { finalize, map, switchMap } from 'rxjs';
import { AuthService, CognitoUtilsService } from '../../../../../auth';
import { passwordRequirementsOf, passwordStrengthValidator } from '../../../../utils/password-rules.util';
import { AccountApiService } from '../../../../services/api-services/account/account-api.service';
import { S3UploadService } from '../../../../services/api-services/s3/s3-upload.service';
import { ChangePasswordForm, PersonalDataForm } from '../../interfaces/account-form.interface';
import { ACCOUNT_TABS, AccountTab } from '../../interfaces/account-tab.interface';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmItemImports } from '@spartan-ng/helm/item';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { FileDropZoneDirective } from '../../../../directives/file-drop-zone.directive';

/**
 * Personal data, password and preferences of the logged user, shown inside the account dialog.
 */
@Component({
  selector: 'rocket-account-settings',
  imports: [
    ...HlmAvatarImports,
    ...HlmButtonImports,
    ...HlmInputImports,
    ...HlmLabelImports,
    ...HlmTabsImports,
    NgIcon,
    ReactiveFormsModule,
    ...HlmInputGroupImports,
    ...HlmItemImports,
    ...HlmTooltipImports,
    FileDropZoneDirective
  ],
  providers: [
    provideIcons({
      lucideCheck,
      lucideCircle,
      lucideCircleCheck,
      lucideEye,
      lucideEyeOff,
      lucideImagePlus,
      lucideLoader,
      lucideShieldCheck,
      lucideUserRound,
      lucideX
    })
  ],
  templateUrl: './account-settings.component.html',
  styleUrl: './account-settings.component.css'
})
export class AccountSettingsComponent {
  /** Auth service instance. */
  private readonly _authService = inject(AuthService);

  /** Account API service instance. */
  private readonly _accountApiService = inject(AccountApiService);

  /** S3 upload service instance. */
  private readonly _s3UploadService = inject(S3UploadService);

  /** Cognito utils service instance. */
  private readonly _cognitoUtilsService = inject(CognitoUtilsService);

  /** Presigned URL of the current profile photo, loaded by the user menu. */
  readonly avatarUrl = input<string | null>(null);

  /** Section shown, kept in sync with the `profilo` query param. */
  readonly activeTab = model<AccountTab>('dati');

  /** Signal to hold the current user data. */
  readonly currentUser = toSignal(this._accountApiService.currentUser$);

  /** Signal to track if personal data is being saved. */
  readonly isSavingPersonalData = signal(false);

  /** Signal to track if password is being changed. */
  readonly isChangingPassword = signal(false);

  /** Signal for password error messages. */
  readonly passwordErrorMessage = signal<string | undefined>(undefined);

  /** Signal to hold the uploaded photo file. */
  readonly uploadedPhoto = signal<File | null>(null);

  /** Signal to track photo validation error. */
  readonly photoError = signal<string | null>(null);

  /** Signal to hold photo preview URL. */
  readonly photoPreviewUrl = signal<string | null>(null);

  /** Signal to toggle current password visibility. */
  readonly showCurrentPassword = signal(false);

  /** Signal to toggle new password visibility. */
  readonly showNewPassword = signal(false);

  /** Signal to toggle confirm password visibility. */
  readonly showConfirmPassword = signal(false);

  /** Sections of the dialog. */
  readonly tabs = ACCOUNT_TABS;

  /** Section currently shown, with its label and description. */
  readonly currentTab = computed(() => this.tabs.find(tab => tab.id === this.activeTab()) ?? this.tabs[0]);

  /** Full name of the user, falling back to the email. */
  readonly fullName = computed(() => {
    const user = this.currentUser();
    return [user?.name, user?.familyName].filter(Boolean).join(' ') || user?.email || '';
  });

  /** Initials of the user, shown when there is no photo. */
  readonly initials = computed(() => {
    const user = this.currentUser();
    return `${user?.name?.charAt(0) ?? ''}${user?.familyName?.charAt(0) ?? ''}`.toUpperCase() || '?';
  });

  /** Allowed image MIME types for profile photo. */
  private readonly _allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];

  /** Form group for personal data. */
  personalDataForm = new FormGroup<PersonalDataForm>({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    surname: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });

  /** Form group for change password. */
  changePasswordForm = new FormGroup<ChangePasswordForm>({
    currentPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    newPassword: new FormControl('', { nonNullable: true, validators: [Validators.required, passwordStrengthValidator()] }),
    confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });

  /** The new password as typed. */
  private readonly _newPasswordValue = toSignal(this.changePasswordForm.controls.newPassword.valueChanges, { initialValue: '' });

  /** The rules the new password meets, all off while it is empty. */
  readonly passwordRequirements = computed(() => passwordRequirementsOf(this._newPasswordValue()));

  /** Whether the confirmation is filled in and equal to the new password. */
  readonly passwordsMatch = toSignal(
    this.changePasswordForm.valueChanges.pipe(map(({ newPassword, confirmPassword }) => !!confirmPassword && newPassword === confirmPassword)),
    { initialValue: false }
  );

  constructor() {
    effect(() => {
      const user = this.currentUser();
      if (user) {
        this.personalDataForm.patchValue({
          name: user.name ?? '',
          surname: user.familyName ?? ''
        });
      }
    });
  }

  /**
   * Saves the personal data changes and/or uploads the profile photo.
   * Handles three cases:
   * 1. Only form modified -> calls only Core
   * 2. Only photo selected -> calls only S3
   * 3. Both -> calls Core first, then S3
   */
  savePersonalData(): void {
    if (this.personalDataForm.invalid) {
      return;
    }

    const isFormDirty = this.personalDataForm.dirty;
    const hasPhoto = !!this.uploadedPhoto();

    // Nothing to save
    if (!isFormDirty && !hasPhoto) {
      return;
    }

    this.isSavingPersonalData.set(true);

    // Case 1: Only photo selected
    if (!isFormDirty && hasPhoto) {
      this._uploadPhoto();
      return;
    }

    // Case 2: Only form modified (no photo)
    if (isFormDirty && !hasPhoto) {
      this._accountApiService.updateCurrentUser({
        name: this.personalDataForm.value.name,
        surname: this.personalDataForm.value.surname
      }).pipe(
        finalize(() => {
          this.isSavingPersonalData.set(false);
          this.personalDataForm.markAsPristine();
        })
      ).subscribe();
      return;
    }

    // Case 3: Both form modified and photo selected -> Core first, then S3
    this._accountApiService.updateCurrentUser({
      name: this.personalDataForm.value.name,
      surname: this.personalDataForm.value.surname
    }).pipe(
      switchMap(() => {
        return this._cognitoUtilsService.getUserIdentifiers().pipe(
          switchMap(identifiers => this._s3UploadService.uploadUserProfilePhoto(identifiers.sub, this.uploadedPhoto()!))
        );
      }),
      finalize(() => {
        this.isSavingPersonalData.set(false);
        this.personalDataForm.markAsPristine();
      })
    ).subscribe({
      next: () => {
        this.uploadedPhoto.set(null);
        this.photoPreviewUrl.set(null);
        this._accountApiService.refreshCurrentUser();
      },
      error: () => {
        this.photoError.set('Errore durante il caricamento della foto.');
      }
    });
  }

  /**
   * Uploads only the profile photo (when form is not dirty).
   */
  private _uploadPhoto(): void {
    const file = this.uploadedPhoto();
    if (!file) return;

    this._cognitoUtilsService.getUserIdentifiers().pipe(
      switchMap(identifiers => this._s3UploadService.uploadUserProfilePhoto(identifiers.sub, file)),
      finalize(() => {
        this.isSavingPersonalData.set(false);
      })
    ).subscribe({
      next: () => {
        this.uploadedPhoto.set(null);
        this.photoPreviewUrl.set(null);
        this._accountApiService.refreshCurrentUser();
      },
      error: () => {
        this.photoError.set('Errore durante il caricamento della foto.');
      }
    });
  }

  /**
   * Changes the user password.
   */
  changePassword(): void {
    this.passwordErrorMessage.set(undefined);

    if (this.changePasswordForm.invalid || !this.passwordsMatch()) {
      return;
    }

    const { currentPassword, newPassword } = this.changePasswordForm.value;

    this.isChangingPassword.set(true);

    this._authService.changePassword(currentPassword!, newPassword!).pipe(
      finalize(() => this.isChangingPassword.set(false))
    ).subscribe({
      next: () => {
        this.logout();
      },
      error: (error) => {
        if (error?.message?.includes('Incorrect')) {
          this.passwordErrorMessage.set('La password attuale non è corretta');
        } else {
          this.passwordErrorMessage.set('Errore durante la modifica della password');
        }
      }
    });
  }

  /**
   * Logs out the current user.
   */
  logout(): void {
    this._authService.logout().pipe(finalize(() => {
      window.location.reload();
    })).subscribe();
  }

  /**
   * Handles photo file selection from input.
   * @param event the input change event.
   */
  onPhotoChosen(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.onPhotoSelected(input.files[0]);
    }
  }

  /**
   * Validates and handles the photo chosen or dropped.
   * @param file the photo.
   */
  onPhotoSelected(file: File): void {
    this.photoError.set(null);

    if (!this._allowedImageTypes.includes(file.type)) {
      this.photoError.set('Il file deve essere un\'immagine (JPEG, PNG o WebP).');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      this.photoError.set('Il file non deve superare i 5MB.');
      return;
    }

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      this.photoPreviewUrl.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    this.uploadedPhoto.set(file);
  }

  /**
   * Removes the selected photo.
   */
  removePhoto(): void {
    this.uploadedPhoto.set(null);
    this.photoPreviewUrl.set(null);
    this.photoError.set(null);
  }

  /**
   * Handler for the tabs component emitting the activated tab.
   * @param tabId the id of the newly activated tab.
   */
  onTabActivated(tabId: string): void {
    this.activeTab.set(tabId as AccountTab);
  }
}

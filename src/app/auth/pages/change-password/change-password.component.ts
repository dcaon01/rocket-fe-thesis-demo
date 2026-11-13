import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ChangePasswordForm } from '../../interfaces/change-password-form.interface';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircle, lucideCircleCheck, lucideEye, lucideEyeOff, lucideLoaderCircle } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { passwordRequirementsOf, passwordStrengthValidator } from '../../../core/utils/password-rules.util';
import { PendingAuthService } from '../../services/pending-user.service';
import { AuthBrandPanelComponent } from '../../components/auth-brand-panel/auth-brand-panel.component';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

@Component({
  selector: 'rocket-change-password',
  imports: [
    ...HlmLabelImports,
    ...HlmInputImports,
    ...HlmButtonImports,
    ...HlmTooltipImports,
    ReactiveFormsModule,
    NgIcon,
    AuthBrandPanelComponent,
    ...HlmInputGroupImports
  ],
  providers: [
    provideIcons({
      lucideCircle,
      lucideCircleCheck,
      lucideLoaderCircle,
      lucideEye,
      lucideEyeOff
    })
  ],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.css'
})
export class ChangePasswordComponent {
  /** The auth service instance. */
  private readonly _authService = inject(AuthService);

  /** The pending auth service instance. */
  private readonly _pendingAuth = inject(PendingAuthService);

  /** The router instance. */
  private readonly _router = inject(Router);

  /** Signal to manage loading state. */
  isLoading = signal<boolean>(false);

  /** Signal for error messages. */
  errorMessage = signal<string | undefined>(undefined);

  /** Signal to toggle password visibility. */
  showPassword = signal<boolean>(false);

  /** Signal to toggle confirm password visibility. */
  showConfirmPassword = signal<boolean>(false);

  /** Form group for the change password form. */
  changePasswordForm = new FormGroup({
    // Rimuovi oldPassword per il primo cambio
    password: new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        passwordStrengthValidator()
      ]
    }),
    confirmPassword: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required]
    })
  }, { validators: this.passwordMatchValidator() });

  /** Convert password valueChanges to signal. */
  private readonly _passwordValue = toSignal(
    this.changePasswordForm.get('password')!.valueChanges,
    { initialValue: '' }
  );

  /** The rules the new password meets, all off while it is empty. */
  readonly passwordRequirements = computed(() => passwordRequirementsOf(this._passwordValue()));

  /** Whether the confirmation is filled in and equal to the new password. */
  readonly passwordsMatch = toSignal(
    this.changePasswordForm.valueChanges.pipe(map(({ password, confirmPassword }) => !!confirmPassword && password === confirmPassword)),
    { initialValue: false }
  );

  ngOnInit() {
    // Verifica che ci sia un pending user, altrimenti redirect al login
    if (!this._pendingAuth.getPendingUser()) {
      this._router.navigate(['/login']);
    }
  }

  /**
   * Validator to check if password and confirmPassword match.
   * @returns A ValidatorFn that checks for password match.
   */
  passwordMatchValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.get('password');
      const confirmPassword = control.get('confirmPassword');

      if (!password || !confirmPassword) {
        return null;
      }

      const pwd = password.value;
      const confirmPwd = confirmPassword.value;

      // Don't validate if either field is empty.
      if (!pwd || !confirmPwd) {
        return null;
      }

      return pwd === confirmPwd ? null : { passwordMismatch: true };
    };
  }

  /**
   * Handles the change password action.
   */
  changePassword() {
    this.changePasswordForm.markAllAsTouched();

    if (this.changePasswordForm.invalid) {
      this.errorMessage.set('Verifica che i campi siano compilati correttamente');
      return;
    }

    // NON serve oldPassword per il primo cambio!
    const { password } = this.changePasswordForm.value;

    if (!password) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(undefined);

    // Usa changePasswordWithoutOld invece di changePassword
    this._authService.changePasswordWithoutOld(password).subscribe({
      next: () => {
        this.isLoading.set(false);
        void this._router.navigate(['/']);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.message || 'Errore durante il cambio password');
      }
    });
  }
}
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEye, lucideEyeOff, lucideLoaderCircle, lucideRocket } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { SignInEnum } from '../../enums/auth-enums';
import { AuthForm } from '../../interfaces/auth-form.interface';
import { CognitoSignInResult } from '../../interfaces/auth-interfaces';
import { AuthService } from '../../services/auth.service';
import { AuthBrandPanelComponent } from '../../components/auth-brand-panel/auth-brand-panel.component';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

/**
 * Authentication page for user login.
 */
@Component({
  selector: 'rocket-login',
  imports: [
    ...HlmCardImports,
    ...HlmLabelImports,
    ...HlmInputImports,
    ...HlmButtonImports,
    ...HlmTooltipImports,
    NgIcon,
    ReactiveFormsModule,
    AuthBrandPanelComponent,
    ...HlmInputGroupImports
  ],
  providers: [
    provideIcons({
      lucideRocket,
      lucideLoaderCircle,
      lucideEye,
      lucideEyeOff
    })
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  /** The auth service instance */
  private readonly _authService = inject(AuthService);

  /** The router instance */
  private readonly _router = inject(Router);

  /** Signal to manage loading state */
  isLoading = signal<boolean>(false);

  /** Signal for error messages */
  errorMessage = signal<string | undefined>(undefined);

  /** Signal to toggle password visibility */
  showPassword = signal<boolean>(false);

  /** Form group for the authentication form */
  authForm = new FormGroup<AuthForm>({
    email: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    }),
    password: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)]
    })
  });

  /**
   * Handles user login action.
   */
  protected login() {
    this.isLoading.set(true);
    this.errorMessage.set(undefined);
    this.authForm.setErrors(null);
    const { email, password } = this.authForm.value;
    if (email && password) {
      this._authService.signIn(email, password).subscribe({
        next: (result: CognitoSignInResult) => {
          switch (result.type) {
            case SignInEnum.NEW_PASSWORD_REQUIRED:
              // The state tells the guard this navigation is a legitimate one.
              this._router.navigate(["/change-password"], {
                state: { passwordChangeRequired: true }
              });
              break;
            case SignInEnum.SUCCESS:
              void this._router.navigate(["/"]);
              break;
          }
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set("Email o password non corretti.");
          this.isLoading.set(false);
        },
      });
    }
  }
}

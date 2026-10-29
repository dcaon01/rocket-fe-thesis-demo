import { Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { show } from '@intercom/messenger-js-sdk';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronsUpDown, lucideIdCard, lucideLogOut, lucideMessageCircleQuestion, lucideUserRoundCog } from '@ng-icons/lucide';
import { BrnDialogImports, BrnDialogState } from '@spartan-ng/brain/dialog';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { catchError, distinctUntilChanged, filter, finalize, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../../auth';
import { INTEGRATIONS_ENABLED } from '../../constants/features';
import { PROFILE_LABELS } from '../../constants/profiles';
import { Profile } from '../../enums/profile.enum';
import { AccountSettingsComponent } from '../../modules/account/components/account-settings/account-settings.component';
import { ACCOUNT_TABS, AccountTab } from '../../modules/account/interfaces/account-tab.interface';
import { S3UploadService } from '../../services/api-services/s3/s3-upload.service';
import { UserContextService } from '../../services/user-context/user-context.service';
import { ResellersApiService } from '../../services/api-services/resellers/resellers-api.service';
import { PermissionsService } from '../../services/permissions/permissions.service';
import { Capability } from '../../enums/capability.enum';

/**
 * Card of the logged user at the bottom of the sidebar.
 * Opens a menu with profile, support and logout; the profile dialog
 * follows the `profilo` query param, so it can be linked.
 */
@Component({
  selector: 'rocket-user-menu',
  imports: [
    ...HlmAvatarImports,
    ...HlmButtonImports,
    ...HlmDialogImports,
    ...BrnDialogImports,
    ...HlmDropdownMenuImports,
    ...HlmSidebarImports,
    NgIcon,
    AccountSettingsComponent
  ],
  providers: [
    provideIcons({
      lucideChevronsUpDown,
      lucideIdCard,
      lucideMessageCircleQuestion,
      lucideLogOut,
      lucideUserRoundCog
    })
  ],
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.css'
})
export class UserMenuComponent {
  /** The router instance. */
  private readonly _router = inject(Router);

  /** The auth service instance. */
  private readonly _authService = inject(AuthService);

  /** The S3 upload service instance. */
  private readonly _s3UploadService = inject(S3UploadService);

  /** The user context service instance. */
  private readonly _userContext = inject(UserContextService);

  /** The resellers API service instance. */
  private readonly _resellersApiService = inject(ResellersApiService);

  /** The permissions service instance. */
  private readonly _permissions = inject(PermissionsService);

  /** Whether the user has Intercom replies not read yet. */
  readonly hasUnreadMessages = input<boolean>(false);

  /** The logged user. */
  readonly currentUser = this._userContext.currentUser;

  // Demo mode (INTEGRATIONS_ENABLED=false), not part of the original Rocket.
  /** Whether the support chat is offered. */
  readonly integrationsEnabled = INTEGRATIONS_ENABLED;

  /** Whether the user opens the card of its own reseller from here. */
  readonly canViewResellerCard = computed(() => this._permissions.can(Capability.ViewOwnResellerCard));

  /** Presigned URL of the profile photo, null when there is none or it cannot be read. */
  readonly avatarUrl = toSignal(
    toObservable(computed(() => this.currentUser()?.profilePicS3Key)).pipe(
      distinctUntilChanged(),
      switchMap(key => key
        ? this._s3UploadService.getDownloadUrlCognito(key).pipe(catchError(() => of(null)))
        : of(null))
    ),
    { initialValue: null }
  );

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

  /** Label of the user's first profile, e.g. "Amministrazione"; account-type groups are skipped. */
  readonly profileLabel = computed(() => {
    const profile = this.currentUser()?.groups?.find(group => group in PROFILE_LABELS) as Profile | undefined;
    return profile ? PROFILE_LABELS[profile] : '';
  });

  /** Query params of the current URL. */
  private readonly _queryParams = toSignal(
    this._router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this._router.parseUrl(this._router.url).queryParamMap)
    ),
    { initialValue: this._router.parseUrl(this._router.url).queryParamMap }
  );

  /** Section of the profile dialog asked by the URL, null when the dialog is closed. */
  readonly profileTab = computed<AccountTab | null>(() => {
    const value = this._queryParams().get('profilo');
    return ACCOUNT_TABS.some(tab => tab.id === value) ? value as AccountTab : null;
  });

  /** State of the profile dialog, driven by the URL. */
  readonly profileDialogState = computed<BrnDialogState>(() => this.profileTab() ? 'open' : 'closed');

  /** State of the logout confirmation dialog. */
  readonly logoutDialogState = signal<BrnDialogState>('closed');

  /**
   * Opens the profile dialog on a section, writing it in the URL.
   * @param tab the section to show.
   * @param replace whether to replace the history entry (switching section).
   */
  openProfile(tab: AccountTab, replace = false): void {
    void this._router.navigate([], { queryParams: { profilo: tab }, queryParamsHandling: 'merge', replaceUrl: replace });
  }

  /**
   * Opens the card of the user's own reseller, in its workspace.
   */
  openResellerCard(): void {
    const code = this._userContext.resellerCode();
    if (!code) return;

    this._resellersApiService.getResellerByCode(code).subscribe(reseller => {
      void this._router.navigate(['/resellers', 'workspaces', reseller.id, 'profile']);
    });
  }

  /**
   * Removes the profile dialog from the URL once it has been closed.
   */
  closeProfile(): void {
    if (this.profileTab()) {
      void this._router.navigate([], { queryParams: { profilo: null }, queryParamsHandling: 'merge', replaceUrl: true });
    }
  }

  /**
   * Opens the Intercom messenger chat.
   */
  openSupport(): void {
    show();
  }

  /**
   * Logs out the current user.
   */
  logout(): void {
    this._authService.logout().pipe(finalize(() => {
      window.location.reload();
    })).subscribe();
  }
}

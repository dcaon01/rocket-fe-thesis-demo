import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { CoreResponseContractDto, CoreResponseResellerDto } from '../../../../../libs/api/src';
import { CognitoUtilsService } from '../../../auth/services/cognito-utils.service';
import { AccountApiService } from '../api-services/account/account-api.service';
import { CAPABILITY_PROFILES, PROFILE_ACCOUNT_TYPE } from '../../constants/profiles';
import { AccountType } from '../../enums/account-type.enum';
import { Capability } from '../../enums/capability.enum';
import { Profile } from '../../enums/profile.enum';

/**
 * Single place answering "what can the logged-in user do".
 * Pages ask for a capability and never test a profile by hand, so the
 * permission matrix lives in one map instead of being repeated across
 * components.
 *
 * This service only drives the interface. The server decides: a hidden button
 * is a convenience, not a protection.
 */
@Injectable({
  providedIn: 'root'
})
export class PermissionsService {
  /** The Cognito utilities service instance. */
  private readonly _cognitoUtils = inject(CognitoUtilsService);

  /** The account API service instance. */
  private readonly _accountApiService = inject(AccountApiService);

  /** Signal holding the identifiers of the logged-in user from the token. */
  private readonly _identifiers = toSignal(
    this._cognitoUtils.getUserIdentifiers().pipe(catchError(() => of(null))),
    { initialValue: null }
  );

  /** Signal holding the Cognito groups of the logged-in user. */
  private readonly _groups = computed<string[]>(() => this._identifiers()?.groups ?? []);

  /** Cognito sub of the logged-in user. */
  readonly sub = computed<string | undefined>(() => this._identifiers()?.sub);

  /** Code of the reseller the logged-in user works at; undefined for Keus collaborators. */
  private readonly _resellerCode = toSignal(
    this._accountApiService.currentUser$.pipe(
      map(user => user.resellerCode),
      catchError(() => of(undefined))
    ),
    { initialValue: undefined }
  );

  /** Profiles held by the logged-in user, unknown groups excluded. */
  readonly profiles = computed<Profile[]>(() => {
    const known = Object.values(Profile) as string[];
    const groups = this._groups();
    const profiles = groups.filter(group => known.includes(group)) as Profile[];

    // A token carrying only unknown groups would silently empty every menu:
    // say it out loud instead, it means frontend and Cognito have drifted.
    if (profiles.length === 0 && groups.length > 0) {
      console.error('No known profile in the token groups:', groups);
    }
    return profiles;
  });

  /** Account type of the logged-in user, derived from its profiles. */
  readonly accountType = computed<AccountType | undefined>(() => {
    const first = this.profiles()[0];
    return first ? PROFILE_ACCOUNT_TYPE[first] : undefined;
  });

  /** Whether the logged-in user works at a reseller. */
  readonly isReseller = computed(() => this.accountType() === AccountType.Reseller);

  /**
   * Tells whether the user holds at least one of the given profiles.
   * @param profiles the profiles to check against.
   * @returns true when the user holds one of them.
   */
  hasAnyProfile(profiles: Profile[]): boolean {
    return this.profiles().some(profile => profiles.includes(profile));
  }

  /**
   * Tells whether the user can perform the given action.
   * @param capability the action to check.
   * @returns true when one of the user's profiles allows it.
   */
  can(capability: Capability): boolean {
    return this.hasAnyProfile(CAPABILITY_PROFILES[capability]);
  }

  /**
   * Tells whether the user can edit a given reseller: an admin any, a Keus
   * salesperson the ones assigned to it, a reseller owner its own.
   * @param reseller the reseller to edit.
   * @returns true when the user can edit it.
   */
  canManageReseller(reseller: CoreResponseResellerDto | null | undefined): boolean {
    if (!reseller) return false;
    if (this.can(Capability.ManageAllResellers)) return true;
    if (this.can(Capability.EditOwnResellerData)) return reseller.code === this._resellerCode();
    return this.can(Capability.ManageResellers) && reseller.assignedSalesId === this.sub();
  }

  /**
   * Tells whether the user can cancel a contract, or withdraw its cancellation: a salesperson only on the contracts of
   * the orders it opened, a Keus one only on direct ones; the others as the action allows.
   * @param capability the action, CancelContracts or ManageContracts.
   * @param contract the contract to change.
   * @returns true when the user can change it.
   */
  canChangeContract(capability: Capability, contract: CoreResponseContractDto | null | undefined): boolean {
    if (!contract || !this.can(capability)) return false;
    if (this.isKeusSalespersonOnly()) return !contract.resellerPath && contract.assignedSalesId === this.sub();
    if (this.isResellerSalespersonOnly()) return contract.assignedSalesId === this.sub();
    return true;
  }

  /**
   * Tells whether the user is a Keus salesperson and nothing more, as the backend scopes it.
   * @returns true without the admin, back office or accounting profile.
   */
  isKeusSalespersonOnly(): boolean {
    return this.hasAnyProfile([Profile.KeusSales]) && !this.hasAnyProfile([Profile.KeusAdmin, Profile.KeusBackoffice, Profile.KeusAccounting]);
  }

  /**
   * Tells whether the user is a reseller salesperson and nothing more, as the backend scopes it.
   * @returns true without the owner or back office profile.
   */
  isResellerSalespersonOnly(): boolean {
    return this.hasAnyProfile([Profile.ResellerSales]) && !this.hasAnyProfile([Profile.ResellerOwner, Profile.ResellerBackoffice]);
  }
}

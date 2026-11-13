import { Profile } from '../enums/profile.enum';

import { AccountType } from '../enums/account-type.enum';

export interface NavigationItem {
  /** The (complete) URL path for the navigation item. */
  url?: string;
  /** The display label for the navigation item. */
  label: string;
  /** The icon name for the navigation item. */
  icon?: string;
  /** The profiles allowed to access the navigation item. */
  rolesAllowed?: Profile[];
  /** The account types allowed to see the navigation item (absent = all). */
  accountTypesAllowed?: AccountType[];
  /** Product feature flag required for the item to be shown (workspace items only). */
  requiredProductFlag?: 'resellerPlansEnabled' | 'professionalPlansEnabled';
  /** Child navigation items, if any. */
  children?: NavigationItem[];
  /** Indicates if the navigation item is expandable, so it is an accordion (true) or a group (false). */
  expandable?: boolean;
}
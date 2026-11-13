import { Profile } from '../../enums/profile.enum';
import { NavigationItem } from '../../interfaces/navigation-item.interface';

/**
 * Sidebar of the reseller workspace.
 * The urls are relative to the workspace: the layout prefixes them with the
 * current reseller through the context service.
 *
 * It does not mirror the Keus one. A reseller needs to know how it is doing and
 * what to act on, so the sections follow its own work: its orders, its
 * companies, what Keus invoices it, the material it can use.
 */
export const RESELLER_WORKSPACE_NAVIGATION: NavigationItem[] = [
  {
    url: '/dashboard',
    label: 'Dashboard',
    icon: 'lucideLayoutDashboard',
    rolesAllowed: [
      Profile.KeusAdmin, Profile.KeusSales, Profile.KeusBackoffice, Profile.KeusAccounting,
      Profile.ResellerOwner, Profile.ResellerBackoffice, Profile.ResellerSales,
    ],
  },
  {
    url: '/orders',
    label: 'Ordini',
    icon: 'lucideClipboardList',
    rolesAllowed: [
      Profile.KeusAdmin, Profile.KeusSales, Profile.KeusBackoffice,
      Profile.ResellerOwner, Profile.ResellerBackoffice, Profile.ResellerSales,
    ],
  },
  {
    url: '/products',
    label: 'Prodotti abilitati',
    icon: 'lucideSquareCode',
    rolesAllowed: [
      Profile.KeusAdmin, Profile.KeusSales, Profile.KeusBackoffice,
      Profile.ResellerOwner, Profile.ResellerBackoffice, Profile.ResellerSales,
    ],
  },
  {
    label: 'Anagrafiche',
    icon: 'lucideContact',
    rolesAllowed: [
      Profile.KeusAdmin, Profile.KeusBackoffice,
      Profile.ResellerOwner, Profile.ResellerBackoffice, Profile.ResellerSales,
    ],
    children: [
      {
        url: '/companies',
        label: 'Aziende',
        icon: 'lucideBuilding2',
      },
      {
        url: '/collaborators',
        label: 'Collaboratori',
        icon: 'lucideUserCog',
        rolesAllowed: [Profile.KeusAdmin, Profile.ResellerOwner],
      },
    ],
    expandable: true,
  },
  {
    label: 'Fatturazione',
    icon: 'lucideReceipt',
    rolesAllowed: [
      Profile.KeusAdmin, Profile.KeusAccounting,
      Profile.ResellerOwner, Profile.ResellerBackoffice,
    ],
    children: [
      {
        url: '/billing/invoices',
        label: 'Fatture',
        icon: 'lucideReceiptEuro',
      },
      {
        url: '/billing/schedule',
        label: 'Scadenziario',
        icon: 'lucideCalendarClock',
      },
    ],
    expandable: true,
  },
  {
    url: '/materials',
    label: 'Materiali',
    icon: 'lucideLibrary',
    rolesAllowed: [
      Profile.KeusAdmin, Profile.KeusSales, Profile.KeusBackoffice,
      Profile.ResellerOwner, Profile.ResellerBackoffice, Profile.ResellerSales,
    ],
  },
  // A reseller opens its own card from the profile menu: here it is the card of the reseller Keus is looking at.
  {
    url: '/profile',
    label: 'Scheda rivenditore',
    icon: 'lucideIdCard',
    rolesAllowed: [Profile.KeusAdmin, Profile.KeusSales, Profile.KeusBackoffice, Profile.KeusAccounting],
  },
];

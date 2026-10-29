import { AccountType } from '../../enums/account-type.enum';
import { Profile } from '../../enums/profile.enum';
import { SHOW_WEBSITE_AND_MARKETING_METRICS } from '../features';
import { NavigationItem } from '../../interfaces/navigation-item.interface';

/**
 * Sidebar of the global area, common to every product and every channel.
 * Kept as configuration rather than code inside the layout, so adding a section
 * is editing a list and the three areas stay comparable side by side.
 */
export const GLOBAL_NAVIGATION: NavigationItem[] = [
    {
      url: '/dashboard',
      label: 'Dashboard',
      icon: 'lucideLayoutDashboard',
      rolesAllowed: [Profile.KeusAdmin, Profile.KeusSales, Profile.KeusBackoffice, Profile.KeusAccounting]
    },
    {
      url: '/orders',
      label: 'Ordini',
      icon: 'lucideClipboardList',
      rolesAllowed: [Profile.KeusAdmin, Profile.KeusSales, Profile.KeusBackoffice, Profile.KeusAccounting],
      accountTypesAllowed: [AccountType.Collaborator]
    },
    {
      label: 'Anagrafiche',
      icon: 'lucideContact',
      rolesAllowed: [Profile.KeusAdmin, Profile.KeusSales, Profile.KeusBackoffice, Profile.KeusAccounting],
      children: [
        {
          url: '/companies',
          label: 'Aziende',
          icon: 'lucideBuilding2',
        },
        {
          url: '/resellers',
          label: 'Rivenditori',
          icon: 'lucideNetwork',
          rolesAllowed: [Profile.KeusAdmin, Profile.KeusSales, Profile.KeusBackoffice, Profile.KeusAccounting],
          accountTypesAllowed: [AccountType.Collaborator],
        },
        {
          url: '/collaborators',
          label: 'Collaboratori',
          icon: 'lucideUserCog',
          rolesAllowed: [Profile.KeusAdmin],
        },
      ],
      expandable: true,
    },
    {
      label: 'Fatturazione',
      icon: 'lucideReceiptEuro',
      rolesAllowed: [Profile.KeusAdmin, Profile.KeusSales, Profile.KeusBackoffice, Profile.KeusAccounting],
      accountTypesAllowed: [AccountType.Collaborator],
      children: [
        {
          url: '/billing/reseller-contracts',
          label: 'Contratti rivenditori',
          icon: 'lucideScrollText',
          rolesAllowed: [Profile.KeusAdmin, Profile.KeusSales, Profile.KeusAccounting],
        },
        {
          url: '/billing/invoices',
          label: 'Fatture',
          icon: 'lucideReceiptEuro',
          rolesAllowed: [Profile.KeusAdmin, Profile.KeusAccounting],
        },
        {
          url: '/billing/schedule',
          label: 'Scadenziario',
          icon: 'lucideCalendarClock',
          rolesAllowed: [Profile.KeusAdmin, Profile.KeusAccounting],
        },
      ],
      expandable: true,
    },
    {
      label: 'Configurazione',
      icon: 'lucideSettings',
      rolesAllowed: [Profile.KeusAdmin, Profile.KeusSales, Profile.KeusBackoffice],
      accountTypesAllowed: [AccountType.Collaborator],
      children: [
        {
          url: '/products',
          label: 'Prodotti',
          icon: 'lucideSquareCode',
        },
        {
          url: '/templates',
          label: 'Template',
          icon: 'lucideFileText',
        },
        {
          url: '/materials',
          label: 'Materiali',
          icon: 'lucideLibrary',
        },
      ],
      expandable: true,
    },
    {
      label: 'Metriche globali',
      icon: 'lucideChartColumnIncreasing',
      rolesAllowed: [Profile.KeusAdmin, Profile.KeusBackoffice, Profile.KeusAccounting, Profile.KeusSales],
      accountTypesAllowed: [AccountType.Collaborator],
      children: [
        {
          url: '/global-product-metrics',
          label: 'Prodotto',
          icon: 'lucidePackageSearch',
          rolesAllowed: [Profile.KeusAdmin, Profile.KeusAccounting, Profile.KeusBackoffice],
        },
        {
          url: '/global-sales-metrics',
          label: 'Vendita',
          icon: 'lucideHandCoins',
          rolesAllowed: [Profile.KeusAdmin, Profile.KeusAccounting, Profile.KeusSales],
        },
        {
          url: '/global-customer-success-metrics',
          label: 'Customer success',
          icon: 'lucideUserCheck',
          rolesAllowed: [Profile.KeusAdmin, Profile.KeusBackoffice, Profile.KeusAccounting],
        },
        {
          url: '/global-technical-metrics',
          label: 'Tecniche',
          icon: 'lucideServer',
          rolesAllowed: [Profile.KeusAdmin],
        },
        ...(SHOW_WEBSITE_AND_MARKETING_METRICS ? [
          {
            url: '/global-website-metrics',
            label: 'Sito web',
            icon: 'lucideEarth',
            rolesAllowed: [Profile.KeusAdmin, Profile.KeusBackoffice, Profile.KeusAccounting],
          },
          {
            url: '/global-marketing-metrics',
            label: 'Marketing',
            icon: 'lucideMegaphone',
            rolesAllowed: [Profile.KeusAdmin, Profile.KeusBackoffice, Profile.KeusAccounting],
          },
        ] : []),
      ],
      expandable: true
    }
  ];

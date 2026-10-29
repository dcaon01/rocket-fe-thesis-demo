import { AccountType } from '../../enums/account-type.enum';
import { Profile } from '../../enums/profile.enum';
import { SHOW_WEBSITE_AND_MARKETING_METRICS } from '../features';
import { NavigationItem } from '../../interfaces/navigation-item.interface';

/**
 * Sidebar of the product workspace.
 * The urls are relative to the workspace: the layout prefixes them with the
 * current product through the context service.
 */
export const PRODUCT_WORKSPACE_NAVIGATION: NavigationItem[] = [
    {
      url: '/dashboard',
      label: 'Dashboard',
      icon: 'lucideLayoutDashboard',
      rolesAllowed: [Profile.KeusAdmin, Profile.KeusSales, Profile.KeusBackoffice, Profile.KeusAccounting]
    },
    {
      label: 'Fatturazione',
      icon: 'lucideReceiptEuro',
      rolesAllowed: [
        Profile.KeusAdmin,
        Profile.KeusSales,
        Profile.KeusBackoffice,
        Profile.KeusAccounting,
        Profile.ResellerOwner,
        Profile.ResellerBackoffice,
        Profile.ResellerSales,
      ],
      children: [
        {
          url: '/contracts',
          label: 'Contratti',
          icon: 'lucideScrollText',
        },
        // The trials stay with Keus: a reseller has the contracts and the plans.
        {
          url: '/trials',
          label: 'Trial',
          icon: 'lucideHourglass',
          rolesAllowed: [Profile.KeusAdmin, Profile.KeusBackoffice, Profile.KeusAccounting],
        },
        {
          url: '/plans',
          label: 'Piani',
          icon: 'lucideLayers',
        },
      ],
      expandable: true,
    },
    {
      label: 'Utenze',
      icon: 'lucideContact',
      rolesAllowed: [Profile.KeusAdmin, Profile.KeusSales, Profile.KeusBackoffice, Profile.ResellerOwner, Profile.ResellerBackoffice, Profile.ResellerSales],
      children: [
        {
          url: '/tenants',
          label: 'Tenant',
          icon: 'lucideBuilding2',
        },
        {
          url: '/users',
          label: 'Utenti',
          icon: 'lucideUsers',
        }
      ],
      expandable: true,
    },
    {
      label: 'Metriche',
      icon: 'lucideChartColumnIncreasing',
      rolesAllowed: [Profile.KeusAdmin, Profile.KeusBackoffice, Profile.KeusAccounting, Profile.KeusSales],
      accountTypesAllowed: [AccountType.Collaborator],
      children: [
        {
          url: '/product-metrics',
          label: 'Prodotto',
          icon: 'lucidePackageSearch',
          rolesAllowed: [Profile.KeusAdmin, Profile.KeusAccounting, Profile.KeusBackoffice],
        },
        {
          url: '/sales-metrics',
          label: 'Vendita',
          icon: 'lucideHandCoins',
          rolesAllowed: [Profile.KeusAdmin, Profile.KeusAccounting, Profile.KeusSales],
        },
        {
          url: '/customer-success-metrics',
          label: 'Customer success',
          icon: 'lucideUserCheck',
          rolesAllowed: [Profile.KeusAdmin, Profile.KeusBackoffice, Profile.KeusAccounting],
        },
        {
          url: '/technical-metrics',
          label: 'Tecniche',
          icon: 'lucideServer',
          rolesAllowed: [Profile.KeusAdmin],
        },
        ...(SHOW_WEBSITE_AND_MARKETING_METRICS ? [
          {
            url: '/website-metrics',
            label: 'Sito web',
            icon: 'lucideEarth',
            rolesAllowed: [Profile.KeusAdmin, Profile.KeusBackoffice, Profile.KeusAccounting],
          },
          {
            url: '/marketing-metrics',
            label: 'Marketing',
            icon: 'lucideMegaphone',
            rolesAllowed: [Profile.KeusAdmin, Profile.KeusBackoffice, Profile.KeusAccounting],
          },
        ] : []),
      ],
      expandable: true,
    }
  ];

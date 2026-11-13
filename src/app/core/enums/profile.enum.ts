/**
 * Application profile of a Rocket user, one per Cognito group.
 * Profiles answer "what can this user do", while AccountType answers "whose
 * data can this user see": the two are orthogonal and always combine.
 *
 * The prefix must stay coherent with the account type: keus_* profiles only on
 * collaborator accounts, reseller_* profiles only on reseller ones. The backend
 * RolesGuard rejects any mismatch, so the frontend never has to guess.
 *
 * Values mirror the Cognito group names and must match the backend UserRole.
 */
export enum Profile {
  /** Keus administrator: the only profile that configures the platform. */
  KeusAdmin = 'keus_admin',
  /** Keus sales: order requests, offers, companies, own resellers. */
  KeusSales = 'keus_sales',
  /** Keus back office: order confirmation, delivery, users, product data. */
  KeusBackoffice = 'keus_backoffice',
  /** Keus accounting: invoices, payment schedule, dunning, suspensions. */
  KeusAccounting = 'keus_accounting',
  /** Reseller owner: the whole perimeter of its own reseller. */
  ResellerOwner = 'reseller_owner',
  /** Reseller back office: every order and company of its own reseller. */
  ResellerBackoffice = 'reseller_backoffice',
  /** Reseller sales: only the orders and companies it owns. */
  ResellerSales = 'reseller_sales',
}

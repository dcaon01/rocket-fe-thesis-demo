/**
 * Actions the interface asks about before showing a control.
 * Pages never test a profile directly: they ask whether the user can do
 * something, so the profile-to-action mapping lives in one place and a change
 * in the permission matrix does not scatter across components.
 */
export enum Capability {
  /** Create, edit and delete products. */
  ManageProducts = 'MANAGE_PRODUCTS',
  /** Enter the workspace of a product: a reseller with its own perimeter. */
  OpenProductWorkspaces = 'OPEN_PRODUCT_WORKSPACES',
  /** Create, edit and delete plans. */
  ManagePlans = 'MANAGE_PLANS',
  /** Create, edit and delete resellers. */
  ManageResellers = 'MANAGE_RESELLERS',
  /** Create, edit and delete Rocket collaborators. */
  ManageCollaborators = 'MANAGE_COLLABORATORS',
  /** Create and edit companies and their fiscal data. */
  ManageCompanies = 'MANAGE_COMPANIES',
  /** Delete companies. */
  DeleteCompanies = 'DELETE_COMPANIES',
  /** Read the contracts of a product: a reseller those of its perimeter. */
  ViewProductContracts = 'VIEW_PRODUCT_CONTRACTS',
  /** Withdraw the cancellation of contracts. */
  ManageContracts = 'MANAGE_CONTRACTS',
  /** Record the cancellation of contracts: a reseller for its own customers. */
  CancelContracts = 'CANCEL_CONTRACTS',
  /** Generate the checkout that collects the SEPA mandate of a company. */
  CollectMandates = 'COLLECT_MANDATES',
  /** Open order requests, generate their offers and record acceptance, refusal and cancellation. */
  CreateOrders = 'CREATE_ORDERS',
  /** Edit a draft order. */
  EditOrders = 'EDIT_ORDERS',
  /** Delete a draft order. */
  DeleteOrders = 'DELETE_ORDERS',
  /** Price or refuse the customization requests. */
  PriceCustomizations = 'PRICE_CUSTOMIZATIONS',
  /** Ask the Keus back office to approve the offer of a reseller. */
  RequestOfferApproval = 'REQUEST_OFFER_APPROVAL',
  /** Approve or refuse the offer of a reseller before it goes out. */
  ApproveOffers = 'APPROVE_OFFERS',
  /** Mark a direct order as financed. */
  ManageFinancing = 'MANAGE_FINANCING',
  /** Confirm an accepted order with its delivery date. */
  ConfirmOrders = 'CONFIRM_ORDERS',
  /** Deliver an order: create tenants, users and credentials. */
  DeliverOrders = 'DELIVER_ORDERS',
  /** Issue invoices and work on the payment schedule. */
  ManageInvoices = 'MANAGE_INVOICES',
  /** Add, edit and delete what a reseller bills its customers, and mark its due dates collected. */
  ManageCustomerCharges = 'MANAGE_CUSTOMER_CHARGES',
  /** Create and edit trials. */
  ManageTrials = 'MANAGE_TRIALS',
  /** Delete trials. */
  DeleteTrials = 'DELETE_TRIALS',
  /** Create tenants by hand, from a trial or an order line. */
  CreateTenants = 'CREATE_TENANTS',
  /** Read the tenants of the companies in the user's perimeter. */
  ViewTenants = 'VIEW_TENANTS',
  /** Edit tenants, and send again or discard their requests. */
  ManageTenants = 'MANAGE_TENANTS',
  /** Delete tenants. */
  DeleteTenants = 'DELETE_TENANTS',
  /** Read the users of the companies in the user's perimeter. */
  ViewUsers = 'VIEW_USERS',
  /** Create and edit users. */
  ManageUsers = 'MANAGE_USERS',
  /** Send again or discard the request of a user. */
  RetryUserRequests = 'RETRY_USER_REQUESTS',
  /** Delete users. */
  DeleteUsers = 'DELETE_USERS',
  /** Terminate contracts at once. */
  TerminateContracts = 'TERMINATE_CONTRACTS',
  /** Suspend and restore the access of a contract for an unpaid invoice, or postpone its suspension. */
  ManageAccess = 'MANAGE_ACCESS',
  /** Regenerate the Stripe checkout session of a contract. */
  RefreshCheckout = 'REFRESH_CHECKOUT',
  /** See which reseller manages each record. */
  ViewResellerOwnership = 'VIEW_RESELLER_OWNERSHIP',
  /** Read the usage figures (activated and active users) of the whole platform, of a product or of a reseller. */
  ViewUsage = 'VIEW_USAGE',
  /** Read the revenue figures of the whole platform. */
  ViewRevenue = 'VIEW_REVENUE',
  /** Read the revenue figures of a product: of the whole of Keus, or what a Keus salesperson sold. */
  ViewProductRevenue = 'VIEW_PRODUCT_REVENUE',
  /** Read the sales metrics from the CRM: the whole pipeline of Keus. */
  ViewSalesPipeline = 'VIEW_SALES_PIPELINE',
  /** Read the sales metrics from Rocket (orders, trials, licenses, provisioning): a Keus salesperson only what it sold. */
  ViewSalesOrders = 'VIEW_SALES_ORDERS',
  /** Read the active companies and the active resellers of a product. */
  ViewCustomerBase = 'VIEW_CUSTOMER_BASE',
  /** Read the active companies and the active resellers of the whole platform. */
  ViewGlobalCustomerBase = 'VIEW_GLOBAL_CUSTOMER_BASE',
  /** Read the map of the reseller network, with the licenses each reseller activated. */
  ViewNetworkMap = 'VIEW_NETWORK_MAP',
  /** Read the technical metrics of the products: errors and alerts from Sentry, availability and latency. */
  ViewTechnicalMetrics = 'VIEW_TECHNICAL_METRICS',
  /** Read what a reseller bills its customers: a reseller salesperson only what it sold. */
  ViewResellerRevenue = 'VIEW_RESELLER_REVENUE',
  /** Read what a reseller margins, and narrow its revenue to one of its salespeople. */
  ViewResellerMargin = 'VIEW_RESELLER_MARGIN',
  /** Read the usage figures of a reseller on its dashboard. */
  ViewResellerUsage = 'VIEW_RESELLER_USAGE',
  /** Read the licenses, customers and worklist of a reseller: a reseller salesperson only what comes from its orders. */
  ViewResellerOverview = 'VIEW_RESELLER_OVERVIEW',
  /** Read the economic position of a reseller towards Keus: invoices issued and still to pay. */
  ViewResellerBilling = 'VIEW_RESELLER_BILLING',
  /** Create, edit, publish and withdraw document templates. */
  ManageTemplates = 'MANAGE_TEMPLATES',
  /** Create, edit, publish and withdraw sales materials. */
  ManageMaterials = 'MANAGE_MATERIALS',
  /** Replace the logo a reseller puts on its offers. */
  ManageResellerLogo = 'MANAGE_RESELLER_LOGO',
  /** Open a contract with a reseller, edit its draft and sign it. */
  OpenResellerContracts = 'OPEN_RESELLER_CONTRACTS',
  /** End a reseller contract at its renewal or at once, and take it back. */
  EndResellerContracts = 'END_RESELLER_CONTRACTS',
  /** Edit any reseller, not only the ones assigned to the user. */
  ManageAllResellers = 'MANAGE_ALL_RESELLERS',
  /** Open the card of the user's own reseller from the profile menu. */
  ViewOwnResellerCard = 'VIEW_OWN_RESELLER_CARD',
  /** Edit the contacts, legal address and fiscal data of the user's own reseller. */
  EditOwnResellerData = 'EDIT_OWN_RESELLER_DATA',
  /** Read the tier, fee and discounts of a reseller. */
  ViewResellerEconomics = 'VIEW_RESELLER_ECONOMICS',
  /** Delete resellers. */
  DeleteResellers = 'DELETE_RESELLERS',
  /** Configure the fee and the margins of the commercial tiers. */
  ManageResellerTiers = 'MANAGE_RESELLER_TIERS',
}

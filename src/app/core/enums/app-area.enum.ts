/**
 * The three areas the application is organised into.
 * The area is declared on the route tree, not guessed from the address: it
 * decides which sidebar is shown and which perimeter the pages work in.
 */
export enum AppArea {
  /** Common to every product and every channel: orders, companies, invoicing, configuration. */
  Global = 'GLOBAL',
  /** What belongs to a single product: plans, trials, companies, users, metrics. */
  ProductWorkspace = 'PRODUCT_WORKSPACE',
  /** The perimeter of a single reseller: its orders, its companies, its invoices. */
  ResellerWorkspace = 'RESELLER_WORKSPACE',
}

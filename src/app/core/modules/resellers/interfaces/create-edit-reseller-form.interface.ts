import { FormControl, FormGroup } from "@angular/forms";

/** Interface representing the structured legal address of a reseller. */
export interface ResellerLegalAddressForm {
  /** Street and number. */
  street: FormControl<string | null>;
  /** City. */
  city: FormControl<string | null>;
  /** Postal code. */
  zipCode: FormControl<string | null>;
  /** Province code. */
  province: FormControl<string | null>;
}

/**
 * Interface representing the structure of the create/edit reseller form.
 */
export interface CreateEditResellerForm {
  /** The reseller's company name. */
  companyName: FormControl<string | null>;
  /** The reseller's email address. */
  email: FormControl<string | null>;
  /** The reseller's phone number. */
  phoneNumber: FormControl<string | null>;
  /** The reseller's VAT number. */
  vatNumber: FormControl<string | null>;
  /** The reseller's PEC (certified electronic address). */
  pec: FormControl<string | null>;
  /** The reseller's SDI (recipient code for electronic invoicing). */
  sdi: FormControl<string | null>;
  /** The reseller's unique human-readable code. */
  code: FormControl<string | null>;
  /** Lifecycle status of the reseller. */
  status: FormControl<'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ARCHIVED' | null>;
  /** Cognito sub of the Keus salesperson responsible for the reseller. */
  assignedSalesId: FormControl<string | null>;
  /** Structured legal address, used on the fiscal documents and on the network map. */
  legalAddress: FormGroup<ResellerLegalAddressForm>;
  /** IBAN used for the SEPA direct debit. */
  iban: FormControl<string | null>;
  /** Fiscal code, when different from the VAT number. */
  fiscalCode: FormControl<string | null>;
}

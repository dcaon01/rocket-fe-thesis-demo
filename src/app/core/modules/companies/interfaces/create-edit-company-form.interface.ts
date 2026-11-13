import { FormControl, FormGroup } from "@angular/forms";

/** Interface representing the structured legal address of a company. */
export interface CompanyLegalAddressForm {
  /** Street and number. */
  street: FormControl<string | null>;
  /** City. */
  city: FormControl<string | null>;
  /** Postal code. */
  zipCode: FormControl<string | null>;
  /** Province code. */
  province: FormControl<string | null>;
}

/** Interface representing the referent of a company, kept as part of its records. */
export interface CompanyReferentForm {
  /** First name. */
  firstName: FormControl<string | null>;
  /** Last name. */
  lastName: FormControl<string | null>;
  /** Email. */
  email: FormControl<string | null>;
  /** Phone number. */
  phoneNumber: FormControl<string | null>;
}

/**
 * Interface representing the structure of the create/edit company form.
 */
export interface CreateEditCompanyForm {
  /** The company's name. */
  name: FormControl<string | null>;
  /** The company's email address. */
  email: FormControl<string | null>;
  /** The company's phone number. */
  phoneNumber: FormControl<string | null>;
  /** Structured legal address, needed on the fiscal documents and to confirm an order. */
  legalAddress: FormGroup<CompanyLegalAddressForm>;
  /** Person to talk to at the company. */
  referent: FormGroup<CompanyReferentForm>;
  /** The company's VAT number. */
  vatNumber: FormControl<string | null>;
  /** The company's PEC (certified electronic address). */
  pec: FormControl<string | null>;
  /** The company's SDI (recipient code for electronic invoicing). */
  sdi: FormControl<string | null>;
  /** Fiscal code, when the company has no VAT number or they differ. */
  fiscalCode: FormControl<string | null>;
  /** IBAN used for the SEPA direct debit, required to confirm a direct order. */
  iban: FormControl<string | null>;
  /** Whether the company is active or not. */
  status: FormControl<'ACTIVE' | 'INACTIVE' | null>;
}

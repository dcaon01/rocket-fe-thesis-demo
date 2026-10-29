import { FormControl, FormGroup } from '@angular/forms';
import { ResellerLegalAddressForm } from '../../resellers/interfaces/create-edit-reseller-form.interface';

/** Interface representing the company data form of the reseller card. */
export interface ResellerCompanyDataForm {
  /** The reseller's email address. */
  email: FormControl<string | null>;
  /** The reseller's phone number. */
  phoneNumber: FormControl<string | null>;
  /** The reseller's PEC (certified electronic address). */
  pec: FormControl<string | null>;
  /** Structured legal address, used on the fiscal documents. */
  legalAddress: FormGroup<ResellerLegalAddressForm>;
  /** The reseller's VAT number. */
  vatNumber: FormControl<string | null>;
  /** The reseller's SDI (recipient code for electronic invoicing). */
  sdi: FormControl<string | null>;
  /** Fiscal code, when different from the VAT number. */
  fiscalCode: FormControl<string | null>;
  /** IBAN used for the SEPA direct debit. */
  iban: FormControl<string | null>;
}

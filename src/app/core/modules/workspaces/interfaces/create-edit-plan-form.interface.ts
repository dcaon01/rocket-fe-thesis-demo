import { FormArray, FormControl, FormGroup } from "@angular/forms";
import { PaymentType } from "../../../enums/payment-type.enum";
import { PlanAudience } from "../../../enums/plan-audience.enum";
import { PlanStatus } from "../../../enums/plan-status.enum";
import { PlanType } from "../../../enums/plan-type.enum";
import { TierType } from "../../../enums/tier-type.enum";

/**
 * Interface representing a single tier in the plan form.
 */
export interface PlanTierForm {
  /** Minimum value for this tier. */
  minValue: FormControl<number | null>;
  /** Maximum value for this tier. */
  maxValue: FormControl<number | null>;
  /** Price for this tier. */
  price: FormControl<number | null>;
}

/**
 * Interface representing the separately-priced assistance component of a plan.
 */
export interface PlanAssistanceForm {
  /** Assistance amount, in euros: the API takes it in cents. */
  amount: FormControl<number | null>;
  /** Label rendered on the offer and on the contract. */
  label: FormControl<string | null>;
}

/**
 * Interface representing the structure of the create/edit plan form.
 */
export interface CreateEditPlanForm {
  /** Human-readable name of the plan. */
  name: FormControl<string | null>;
  /** Optional description of the plan. */
  description: FormControl<string | null>;
  /** Discriminator controlling which pricing fields are relevant. */
  type: FormControl<PlanType | null>;
  /** Who the plan is sold to (client, professional or reseller). */
  audience: FormControl<PlanAudience | null>;
  /** Whether the plan prices are informational only, not synced with Stripe. */
  offStripe: FormControl<boolean | null>;
  /** ISO currency code used by the plan. */
  currency: FormControl<string | null>;
  /** Lifecycle state of the plan (only relevant on edit). */
  status: FormControl<PlanStatus | null>;
  /** Billing cadence. Required for recurring plans, omitted for one-time plans. */
  billingInterval: FormControl<PaymentType | null>;
  /** Flat price for ONE_TIME and RECURRING_FLAT plans, optional flat fee on top of TIERED_VOLUME tiers. */
  baseCost: FormControl<number | null>;
  /** Default fixed term in months, only for ONE_TIME (una-tantum) plans. */
  termMonths: FormControl<number | null>;
  /** Days before the renewal within which a cancellation takes effect only at the following one, for recurring plans. */
  noticeDays: FormControl<number | null>;
  /** Constraint dimension for tiered volume plans. */
  tiersType: FormControl<TierType | null>;
  /** Tiers for tiered volume plans. */
  tiers: FormArray<FormGroup<PlanTierForm>>;
  /** One-off activation fee, in euros: the API takes it in cents. */
  activationFee: FormControl<number | null>;
  /** Separately-priced assistance component, copied onto orders and contracts. */
  assistance: FormGroup<PlanAssistanceForm>;
}

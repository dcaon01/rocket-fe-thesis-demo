import { FormArray, FormControl, FormGroup } from "@angular/forms";
import { MixpanelLeverRuleForm } from "./mixpanel-lever-rule-form.interface";
import { StructureFieldForm } from "./structure-field-form.interface";

/**
 * Interface representing the structure of the create/edit product form.
 */
export interface CreateEditProductForm {
  /** Name of the application. */
  name: FormControl<string | null>;
  /** Description of the product. */
  description: FormControl<string | null>;
  /** Prefix for the product. */
  prefix: FormControl<string | null>;
  /** Array of dynamic fields to gain tenant structure information for the product. */
  tenantStructure: FormArray<FormGroup<StructureFieldForm>>;
  /** Array of dynamic fields to gain user structure information for the product. */
  userStructure: FormArray<FormGroup<StructureFieldForm>>;
  /** Custom attributes for the product. */
  customAttributes?: FormControl<string[] | null>;
  /** Status of the product. */
  status: FormControl<string | null>;
  /** Roles associated with the product. */
  roles: FormControl<string[] | null>;
  /** Value of the HubSpot «Soluzione d'interesse» that marks the deals of the product. */
  hubspotSolution: FormControl<string | null>;
  /** Name of the Intercom brand the conversations of the product come through. */
  intercomBrand: FormControl<string | null>;
  /** Identifier of the Sentry project the errors of the product are sent to. */
  sentryProjectId: FormControl<string | null>;
  /** Public address Rocket calls every 15 minutes to tell whether the product answers. */
  healthCheckUrl: FormControl<string | null>;
  /** Domain of the product. */
  domain: FormControl<string | null>;
  /** Stripe API secret key associated with the product. */
  stripeApiKey: FormControl<string | null>;
  /** Stripe webhook signing secret associated with the product. */
  stripeWebhookSecret: FormControl<string | null>;
  /** Stripe Tax Rate id applied to checkout line items. */
  stripeTaxRateId: FormControl<string | null>;
  /** Mixpanel project id used to query the KPI metrics. */
  mixpanelProjectId: FormControl<string | null>;
  /** Default trial duration in days. */
  defaultTrialDuration: FormControl<number | null>;
  /** Whether the product has a trials users limit. */
  hasTrialsUsersLimit: FormControl<boolean | null>;
  /** Maximum number of users allowed for the product's trials. */
  trialsUsersLimit: FormControl<number | null>;
  /** Key rules of the levers, at most one per lever. */
  mixpanelRules: FormArray<FormGroup<MixpanelLeverRuleForm>>;
  /** Whether reseller plans/contracts are enabled for the product. */
  resellerPlansEnabled: FormControl<boolean | null>;
  /** Whether professional plans/contracts are enabled for the product. Kept out of the UI: the network is single-level. */
  professionalPlansEnabled: FormControl<boolean | null>;
}
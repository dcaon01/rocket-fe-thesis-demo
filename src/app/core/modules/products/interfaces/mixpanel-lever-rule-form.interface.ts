import { FormControl } from "@angular/forms";

/**
 * Interface representing a rule of a lever in the product form.
 */
export interface MixpanelLeverRuleForm {
  /** Identifier of the rule, absent until the product is saved. */
  id: FormControl<string | null>;
  /** Lever the rule judges, fixed when the rule is added. */
  lever: FormControl<string | null>;
  /** Shape of the rule, that is what is measured. */
  shape: FormControl<string | null>;
  /** Mixpanel events the rule measures, separated by commas. */
  eventNames: FormControl<string | null>;
  /** Events the measure starts from, on milestones and coverages, separated by commas. */
  anchorEventNames: FormControl<string | null>;
  /** Event property counted by a coverage or averaged by an average. */
  property: FormControl<string | null>;
  /** Size of the rolling window, in the unit. */
  windowValue: FormControl<number | null>;
  /** Time unit of the window, and of the thresholds of milestones and inactivities. */
  unit: FormControl<string | null>;
  /** What an inactivity looks at: the tenant, its users or its objects. */
  inactivityScope: FormControl<string | null>;
  /** Events that close an object, on inactivities per object, separated by commas. */
  closingEventNames: FormControl<string | null>;
  /** Roles of the users an inactivity per user looks at, separated by commas. */
  userRoles: FormControl<string | null>;
  /** Whether a cadence is divided by the active users of the tenant. */
  perActiveUser: FormControl<boolean | null>;
  /** Which side of the thresholds is good, on cadences and averages. */
  direction: FormControl<string | null>;
  /** Value up to which the tenant is compliant. */
  greenThreshold: FormControl<number | null>;
  /** Value up to which the tenant is at risk rather than failing. */
  yellowThreshold: FormControl<number | null>;
  /** Smallest number of occurrences the measure needs. */
  minSample: FormControl<number | null>;
  /** Whether the rule only measures, without judging. */
  observationOnly: FormControl<boolean | null>;
}

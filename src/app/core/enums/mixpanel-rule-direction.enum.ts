import { MixpanelRuleShape } from './mixpanel-rule-shape.enum';

/**
 * Which side of the thresholds of a lever rule is the good one.
 */
export enum MixpanelRuleDirection {
  AtLeast = 'AT_LEAST',
  AtMost = 'AT_MOST',
}

/** Direction of the shapes that do not ask for one, as the backend reads them. */
export const IMPLIED_RULE_DIRECTION: Partial<Record<MixpanelRuleShape, MixpanelRuleDirection>> = {
  [MixpanelRuleShape.Milestone]: MixpanelRuleDirection.AtMost,
  [MixpanelRuleShape.Coverage]: MixpanelRuleDirection.AtLeast,
  [MixpanelRuleShape.Inactivity]: MixpanelRuleDirection.AtMost,
};

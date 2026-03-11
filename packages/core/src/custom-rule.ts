import type { Rule, RuleContext } from './rule.js';
import type { Issue, Severity } from '@inspectorepo/shared';

export interface CustomRuleDefinition {
  id: string;
  title: string;
  severity: Severity;
  run(ctx: RuleContext): Issue[];
}

/**
 * Define a custom rule compatible with InspectoRepo's analysis engine.
 * Custom rules can be passed into analyzeCodebase via options.customRules.
 */
export function defineRule(definition: CustomRuleDefinition): Rule {
  return {
    id: definition.id,
    title: definition.title,
    severity: definition.severity,
    run: definition.run,
  };
}

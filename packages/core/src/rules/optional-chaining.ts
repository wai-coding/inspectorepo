import type { Issue } from '@inspectorepo/shared';
import type { Rule, RuleContext } from '../rule.js';

export const optionalChainingRule: Rule = {
  id: 'optional-chaining',
  title: 'Optional Chaining',
  severity: 'info',
  run(_ctx: RuleContext): Issue[] {
    // Stub: implementation planned for a future milestone
    return [];
  },
};

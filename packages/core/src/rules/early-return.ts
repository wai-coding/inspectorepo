import type { Issue } from '@inspectorepo/shared';
import type { Rule, RuleContext } from '../rule.js';

export const earlyReturnRule: Rule = {
  id: 'early-return',
  title: 'Early Return',
  severity: 'info',
  run(_ctx: RuleContext): Issue[] {
    // Stub: implementation planned for a future milestone
    return [];
  },
};

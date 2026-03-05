import type { Rule } from '../rule.js';
import { unusedImportsRule } from './unused-imports.js';
import { complexityHotspotRule } from './complexity-hotspot.js';
import { optionalChainingRule } from './optional-chaining.js';
import { booleanSimplificationRule } from './boolean-simplification.js';
import { earlyReturnRule } from './early-return.js';

export { unusedImportsRule } from './unused-imports.js';
export { complexityHotspotRule } from './complexity-hotspot.js';
export { optionalChainingRule } from './optional-chaining.js';
export { booleanSimplificationRule } from './boolean-simplification.js';
export { earlyReturnRule } from './early-return.js';

export const allRules: Rule[] = [
  unusedImportsRule,
  complexityHotspotRule,
  optionalChainingRule,
  booleanSimplificationRule,
  earlyReturnRule,
];

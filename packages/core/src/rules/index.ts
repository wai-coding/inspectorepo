import type { Rule } from '../rule.js';
import { unusedImportsRule } from './unused-imports.js';
import { complexityHotspotRule } from './complexity-hotspot.js';
import { optionalChainingRule } from './optional-chaining.js';
import { booleanSimplificationRule } from './boolean-simplification.js';
import { earlyReturnRule } from './early-return.js';
import { noDebuggerRule } from './no-debugger.js';
import { noEmptyCatchRule } from './no-empty-catch.js';
import { noUselessReturnRule } from './no-useless-return.js';
import { tsDiagnosticsRule } from './ts-diagnostics.js';
import { noConsoleRule } from './no-console.js';
import { noEmptyFunctionRule } from './no-empty-function.js';
import { duplicateImportsRule } from './duplicate-imports.js';
import { noUnreachableAfterReturnRule } from './no-unreachable-after-return.js';
import { noThrowLiteralRule } from './no-throw-literal.js';

export { unusedImportsRule } from './unused-imports.js';
export { complexityHotspotRule } from './complexity-hotspot.js';
export { optionalChainingRule } from './optional-chaining.js';
export { booleanSimplificationRule } from './boolean-simplification.js';
export { earlyReturnRule } from './early-return.js';
export { noDebuggerRule } from './no-debugger.js';
export { noEmptyCatchRule } from './no-empty-catch.js';
export { noUselessReturnRule } from './no-useless-return.js';
export { tsDiagnosticsRule } from './ts-diagnostics.js';
export { noConsoleRule } from './no-console.js';
export { noEmptyFunctionRule } from './no-empty-function.js';
export { duplicateImportsRule } from './duplicate-imports.js';
export { noUnreachableAfterReturnRule } from './no-unreachable-after-return.js';
export { noThrowLiteralRule } from './no-throw-literal.js';

export const allRules: Rule[] = [
  unusedImportsRule,
  complexityHotspotRule,
  optionalChainingRule,
  booleanSimplificationRule,
  earlyReturnRule,
  noDebuggerRule,
  noEmptyCatchRule,
  noUselessReturnRule,
  tsDiagnosticsRule,
  noConsoleRule,
  noEmptyFunctionRule,
  duplicateImportsRule,
  noUnreachableAfterReturnRule,
  noThrowLiteralRule,
];

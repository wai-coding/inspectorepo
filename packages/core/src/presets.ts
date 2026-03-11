import type { RuleConfig } from './config.js';

export type PresetName = 'recommended' | 'strict' | 'cleanup' | 'react';

const PRESETS: Record<PresetName, RuleConfig> = {
  recommended: {
    'unused-imports': 'warn',
    'complexity-hotspot': 'warn',
    'optional-chaining': 'warn',
    'boolean-simplification': 'warn',
    'early-return': 'warn',
    'no-debugger': 'warn',
    'no-empty-catch': 'warn',
    'no-useless-return': 'warn',
    'ts-diagnostics': 'off',
    'no-console': 'warn',
    'no-empty-function': 'warn',
    'duplicate-imports': 'warn',
    'no-unreachable-after-return': 'warn',
    'no-throw-literal': 'warn',
  },
  strict: {
    'unused-imports': 'error',
    'complexity-hotspot': 'error',
    'optional-chaining': 'warn',
    'boolean-simplification': 'warn',
    'early-return': 'warn',
    'no-debugger': 'error',
    'no-empty-catch': 'error',
    'no-useless-return': 'warn',
    'ts-diagnostics': 'error',
    'no-console': 'error',
    'no-empty-function': 'warn',
    'duplicate-imports': 'warn',
    'no-unreachable-after-return': 'error',
    'no-throw-literal': 'error',
  },
  cleanup: {
    'unused-imports': 'warn',
    'complexity-hotspot': 'off',
    'optional-chaining': 'warn',
    'boolean-simplification': 'warn',
    'early-return': 'warn',
    'no-debugger': 'warn',
    'no-empty-catch': 'warn',
    'no-useless-return': 'warn',
    'ts-diagnostics': 'off',
    'no-console': 'warn',
    'no-empty-function': 'warn',
    'duplicate-imports': 'warn',
    'no-unreachable-after-return': 'warn',
    'no-throw-literal': 'warn',
  },
  react: {
    'unused-imports': 'error',
    'complexity-hotspot': 'warn',
    'optional-chaining': 'warn',
    'boolean-simplification': 'warn',
    'early-return': 'warn',
    'no-debugger': 'warn',
    'no-empty-catch': 'warn',
    'no-useless-return': 'warn',
    'ts-diagnostics': 'off',
    'no-console': 'warn',
    'no-empty-function': 'warn',
    'duplicate-imports': 'warn',
    'no-unreachable-after-return': 'warn',
    'no-throw-literal': 'warn',
  },
};

const VALID_PRESETS = new Set<string>(Object.keys(PRESETS));

export function isValidPreset(name: string): name is PresetName {
  return VALID_PRESETS.has(name);
}

/**
 * Resolve a preset name to its rule configuration.
 * Returns null for invalid preset names.
 */
export function resolvePreset(name: string): RuleConfig | null {
  if (!isValidPreset(name)) return null;
  return { ...PRESETS[name] };
}

/**
 * Get the list of available preset names.
 */
export function getPresetNames(): PresetName[] {
  return Object.keys(PRESETS) as PresetName[];
}

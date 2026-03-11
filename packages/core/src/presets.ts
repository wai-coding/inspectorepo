import type { RuleConfig } from './config.js';

export type PresetName = 'recommended' | 'strict' | 'cleanup' | 'react';

const PRESETS: Record<PresetName, RuleConfig> = {
  recommended: {
    'unused-imports': 'warn',
    'complexity-hotspot': 'warn',
    'optional-chaining': 'warn',
    'boolean-simplification': 'warn',
    'early-return': 'warn',
  },
  strict: {
    'unused-imports': 'error',
    'complexity-hotspot': 'error',
    'optional-chaining': 'warn',
    'boolean-simplification': 'warn',
    'early-return': 'warn',
  },
  cleanup: {
    'unused-imports': 'warn',
    'complexity-hotspot': 'off',
    'optional-chaining': 'warn',
    'boolean-simplification': 'warn',
    'early-return': 'warn',
  },
  react: {
    'unused-imports': 'error',
    'complexity-hotspot': 'warn',
    'optional-chaining': 'warn',
    'boolean-simplification': 'warn',
    'early-return': 'warn',
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

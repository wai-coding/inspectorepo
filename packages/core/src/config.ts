import type { Rule } from './rule.js';
import { resolvePreset } from './presets.js';

export type RuleSeverityConfig = 'error' | 'warn' | 'off';

export interface RuleConfig {
  [ruleId: string]: RuleSeverityConfig;
}

export interface InspectorepoConfig {
  preset?: string;
  rules: RuleConfig;
}

const DEFAULT_CONFIG: RuleConfig = {
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
};

/**
 * Load .inspectorepo.json from a JSON string.
 * Returns null if the input is empty or invalid.
 */
export function parseConfig(json: string): InspectorepoConfig | null {
  try {
    const parsed = JSON.parse(json) as Partial<InspectorepoConfig>;
    const hasRules = parsed.rules && typeof parsed.rules === 'object';
    const hasPreset = typeof parsed.preset === 'string';
    if (!hasRules && !hasPreset) return null;
    return {
      ...(hasPreset ? { preset: parsed.preset } : {}),
      rules: (hasRules ? parsed.rules : {}) as RuleConfig,
    };
  } catch {
    return null;
  }
}

/**
 * Merge a loaded config with defaults.
 * If a preset is provided and valid, its values serve as defaults.
 * Explicit rule config overrides preset values.
 */
export function mergeConfig(loaded: RuleConfig | null, preset?: string): RuleConfig {
  const base = { ...DEFAULT_CONFIG };
  if (preset) {
    const presetConfig = resolvePreset(preset);
    if (presetConfig) {
      Object.assign(base, presetConfig);
    }
  }
  if (!loaded) return base;
  return { ...base, ...loaded };
}

/**
 * Filter rules based on a config. Only rules with 'error' or 'warn' config are kept.
 * Rules with severity 'error' in config get their severity overridden to 'error'.
 */
export function filterRulesByConfig(
  rules: Rule[],
  config: RuleConfig,
): Rule[] {
  return rules
    .filter((rule) => {
      const setting = config[rule.id] ?? 'warn';
      return setting !== 'off';
    })
    .map((rule) => {
      const setting = config[rule.id];
      if (setting === 'error') {
        return { ...rule, severity: 'error' as const };
      }
      return rule;
    });
}

/**
 * Parse a --rules CLI flag value into a RuleConfig
 * where listed rules are 'warn' and all others are 'off'.
 */
export function cliRulesToConfig(cliRules: string, allRuleIds: string[]): RuleConfig {
  const enabled = new Set(cliRules.split(',').map((r) => r.trim()).filter(Boolean));
  const config: RuleConfig = {};
  for (const id of allRuleIds) {
    config[id] = enabled.has(id) ? 'warn' : 'off';
  }
  return config;
}

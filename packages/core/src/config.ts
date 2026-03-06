import type { Rule } from './rule.js';

export type RuleSeverityConfig = 'error' | 'warn' | 'off';

export interface RuleConfig {
  [ruleId: string]: RuleSeverityConfig;
}

export interface InspectorepoConfig {
  rules: RuleConfig;
}

const DEFAULT_CONFIG: RuleConfig = {
  'unused-imports': 'warn',
  'complexity-hotspot': 'warn',
  'optional-chaining': 'warn',
  'boolean-simplification': 'warn',
  'early-return': 'warn',
};

/**
 * Load .inspectorepo.json from a JSON string.
 * Returns null if the input is empty or invalid.
 */
export function parseConfig(json: string): InspectorepoConfig | null {
  try {
    const parsed = JSON.parse(json) as Partial<InspectorepoConfig>;
    if (parsed.rules && typeof parsed.rules === 'object') {
      return { rules: parsed.rules as RuleConfig };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Merge a loaded config with defaults.
 * Rules not listed in the config keep their default severity.
 */
export function mergeConfig(loaded: RuleConfig | null): RuleConfig {
  if (!loaded) return { ...DEFAULT_CONFIG };
  return { ...DEFAULT_CONFIG, ...loaded };
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

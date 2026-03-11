import { describe, it, expect } from 'vitest';
import {
  parseConfig,
  mergeConfig,
  filterRulesByConfig,
  cliRulesToConfig,
} from './config.js';
import { allRules } from './rules/index.js';
import { resolvePreset, getPresetNames } from './presets.js';

const ALL_RULE_IDS = [
  'unused-imports',
  'complexity-hotspot',
  'optional-chaining',
  'boolean-simplification',
  'early-return',
  'no-debugger',
  'no-empty-catch',
  'no-useless-return',
  'ts-diagnostics',
  'no-console',
  'no-empty-function',
  'duplicate-imports',
  'no-unreachable-after-return',
  'no-throw-literal',
];

describe('parseConfig', () => {
  it('parses a valid config', () => {
    const json = JSON.stringify({
      rules: {
        'optional-chaining': 'error',
        'unused-imports': 'off',
      },
    });
    const result = parseConfig(json);
    expect(result).toEqual({
      rules: {
        'optional-chaining': 'error',
        'unused-imports': 'off',
      },
    });
  });

  it('returns null for invalid JSON', () => {
    expect(parseConfig('not json')).toBeNull();
  });

  it('returns null for JSON without rules key', () => {
    expect(parseConfig('{}')).toBeNull();
  });
});

describe('mergeConfig', () => {
  it('uses defaults when loaded is null', () => {
    const result = mergeConfig(null);
    expect(result['unused-imports']).toBe('warn');
    expect(result['early-return']).toBe('warn');
    expect(result['no-debugger']).toBe('warn');
    expect(result['no-empty-catch']).toBe('warn');
    expect(result['no-useless-return']).toBe('warn');
    expect(result['ts-diagnostics']).toBe('off');
  });

  it('overrides defaults with loaded config', () => {
    const result = mergeConfig({ 'unused-imports': 'off' });
    expect(result['unused-imports']).toBe('off');
    expect(result['early-return']).toBe('warn');
  });
});

describe('DEFAULT_CONFIG contains all rules', () => {
  it('has every registered rule in defaults', () => {
    const defaults = mergeConfig(null);
    for (const id of ALL_RULE_IDS) {
      expect(defaults).toHaveProperty(id);
      expect(['error', 'warn', 'off']).toContain(defaults[id]);
    }
  });

  it('rule registry matches expected rule IDs', () => {
    const registryIds = allRules.map((r) => r.id).sort();
    expect(registryIds).toEqual([...ALL_RULE_IDS].sort());
  });

  it('no rule exists in registry but not in DEFAULT_CONFIG', () => {
    const defaults = mergeConfig(null);
    for (const rule of allRules) {
      expect(defaults).toHaveProperty(rule.id);
    }
  });
});

describe('presets produce valid configs', () => {
  it.each(getPresetNames())('preset "%s" contains all rule IDs', (presetName) => {
    const config = resolvePreset(presetName);
    expect(config).not.toBeNull();
    for (const id of ALL_RULE_IDS) {
      expect(config).toHaveProperty(id);
      expect(['error', 'warn', 'off']).toContain(config![id]);
    }
  });
});

describe('filterRulesByConfig', () => {
  it('removes rules set to off', () => {
    const config = {
      'unused-imports': 'off' as const,
      'complexity-hotspot': 'warn' as const,
      'optional-chaining': 'warn' as const,
      'boolean-simplification': 'warn' as const,
      'early-return': 'warn' as const,
    };
    const filtered = filterRulesByConfig(allRules, config);
    expect(filtered.find((r) => r.id === 'unused-imports')).toBeUndefined();
    expect(filtered.find((r) => r.id === 'complexity-hotspot')).toBeDefined();
  });

  it('overrides severity for rules set to error', () => {
    const config = {
      'unused-imports': 'error' as const,
      'complexity-hotspot': 'warn' as const,
      'optional-chaining': 'warn' as const,
      'boolean-simplification': 'warn' as const,
      'early-return': 'warn' as const,
    };
    const filtered = filterRulesByConfig(allRules, config);
    const rule = filtered.find((r) => r.id === 'unused-imports');
    expect(rule?.severity).toBe('error');
  });

  it('returns only active rules from a full config', () => {
    const defaults = mergeConfig(null);
    const filtered = filterRulesByConfig(allRules, defaults);
    // ts-diagnostics is 'off' in defaults, so it should be excluded
    expect(filtered.find((r) => r.id === 'ts-diagnostics')).toBeUndefined();
    // All other rules should be present
    for (const rule of allRules) {
      if (rule.id === 'ts-diagnostics') continue;
      expect(filtered.find((r) => r.id === rule.id)).toBeDefined();
    }
  });
});

describe('cliRulesToConfig', () => {
  it('enables only listed rules', () => {
    const ids = allRules.map((r) => r.id);
    const config = cliRulesToConfig('optional-chaining,unused-imports', ids);
    expect(config['optional-chaining']).toBe('warn');
    expect(config['unused-imports']).toBe('warn');
    expect(config['complexity-hotspot']).toBe('off');
    expect(config['early-return']).toBe('off');
  });

  it('CLI overrides config file', () => {
    const ids = allRules.map((r) => r.id);
    const config = cliRulesToConfig('early-return', ids);
    expect(config['early-return']).toBe('warn');
    expect(config['unused-imports']).toBe('off');
  });

  it('sets all rules to off or warn', () => {
    const ids = allRules.map((r) => r.id);
    const config = cliRulesToConfig('no-debugger', ids);
    for (const id of ids) {
      expect(['warn', 'off']).toContain(config[id]);
    }
    expect(config['no-debugger']).toBe('warn');
  });
});

import { describe, it, expect } from 'vitest';
import {
  parseConfig,
  mergeConfig,
  filterRulesByConfig,
  cliRulesToConfig,
} from './config.js';
import { allRules } from './rules/index.js';
import { resolvePreset, getPresetNames } from './presets.js';

// Canonical rule ID list — add new rule IDs here when adding rules
const ALL_RULE_IDS = allRules.map((r) => r.id).sort();

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

describe('rule-system alignment', () => {
  it('every rule in allRules is present in DEFAULT_CONFIG', () => {
    const defaults = mergeConfig(null);
    for (const rule of allRules) {
      expect(defaults, `rule "${rule.id}" missing from DEFAULT_CONFIG`).toHaveProperty(rule.id);
    }
  });

  it('DEFAULT_CONFIG has no entries for unknown rules', () => {
    const defaults = mergeConfig(null);
    const ruleIdSet = new Set(allRules.map((r) => r.id));
    for (const key of Object.keys(defaults)) {
      expect(ruleIdSet.has(key), `DEFAULT_CONFIG contains unknown rule "${key}"`).toBe(true);
    }
  });

  it('every preset references only known rule IDs', () => {
    const ruleIdSet = new Set(allRules.map((r) => r.id));
    for (const presetName of getPresetNames()) {
      const config = resolvePreset(presetName)!;
      for (const key of Object.keys(config)) {
        expect(ruleIdSet.has(key), `preset "${presetName}" references unknown rule "${key}"`).toBe(true);
      }
    }
  });

  it('every preset covers every rule', () => {
    for (const presetName of getPresetNames()) {
      const config = resolvePreset(presetName)!;
      for (const id of ALL_RULE_IDS) {
        expect(config, `preset "${presetName}" missing rule "${id}"`).toHaveProperty(id);
      }
    }
  });

  it('filterRulesByConfig returns consistent results with DEFAULT_CONFIG', () => {
    const defaults = mergeConfig(null);
    const filtered = filterRulesByConfig(allRules, defaults);
    const filteredIds = new Set(filtered.map((r) => r.id));

    for (const [id, setting] of Object.entries(defaults)) {
      if (setting === 'off') {
        expect(filteredIds.has(id), `rule "${id}" is off but still active`).toBe(false);
      } else {
        expect(filteredIds.has(id), `rule "${id}" is ${setting} but not active`).toBe(true);
      }
    }
  });

  it('allRules has no duplicate IDs', () => {
    const ids = allRules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('allRules count matches DEFAULT_CONFIG key count', () => {
    const defaults = mergeConfig(null);
    expect(Object.keys(defaults).length).toBe(allRules.length);
  });
});

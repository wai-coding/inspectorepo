import { describe, it, expect } from 'vitest';
import {
  parseConfig,
  mergeConfig,
  filterRulesByConfig,
  cliRulesToConfig,
} from './config.js';
import { allRules } from './rules/index.js';

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
});

import { describe, it, expect } from 'vitest';
import { resolvePreset, isValidPreset, getPresetNames } from './presets.js';
import { mergeConfig } from './config.js';

describe('resolvePreset', () => {
  it('resolves recommended preset', () => {
    const config = resolvePreset('recommended');
    expect(config).not.toBeNull();
    expect(config!['unused-imports']).toBe('warn');
    expect(config!['complexity-hotspot']).toBe('warn');
  });

  it('resolves strict preset with error severities', () => {
    const config = resolvePreset('strict');
    expect(config).not.toBeNull();
    expect(config!['unused-imports']).toBe('error');
    expect(config!['complexity-hotspot']).toBe('error');
  });

  it('resolves cleanup preset without complexity-hotspot', () => {
    const config = resolvePreset('cleanup');
    expect(config).not.toBeNull();
    expect(config!['complexity-hotspot']).toBe('off');
    expect(config!['boolean-simplification']).toBe('warn');
  });

  it('resolves react preset', () => {
    const config = resolvePreset('react');
    expect(config).not.toBeNull();
    expect(config!['unused-imports']).toBe('error');
    expect(config!['optional-chaining']).toBe('warn');
  });

  it('returns null for invalid preset', () => {
    expect(resolvePreset('nonexistent')).toBeNull();
  });
});

describe('isValidPreset', () => {
  it('accepts valid preset names', () => {
    expect(isValidPreset('recommended')).toBe(true);
    expect(isValidPreset('strict')).toBe(true);
    expect(isValidPreset('cleanup')).toBe(true);
    expect(isValidPreset('react')).toBe(true);
  });

  it('rejects invalid preset names', () => {
    expect(isValidPreset('foo')).toBe(false);
    expect(isValidPreset('')).toBe(false);
  });
});

describe('getPresetNames', () => {
  it('returns all preset names', () => {
    const names = getPresetNames();
    expect(names).toContain('recommended');
    expect(names).toContain('strict');
    expect(names).toContain('cleanup');
    expect(names).toContain('react');
    expect(names.length).toBe(4);
  });
});

describe('preset resolution with mergeConfig', () => {
  it('preset provides defaults', () => {
    const result = mergeConfig(null, 'strict');
    expect(result['unused-imports']).toBe('error');
    expect(result['complexity-hotspot']).toBe('error');
  });

  it('explicit rule config overrides preset', () => {
    const result = mergeConfig({ 'unused-imports': 'off' }, 'strict');
    expect(result['unused-imports']).toBe('off');
    expect(result['complexity-hotspot']).toBe('error');
  });

  it('invalid preset falls back to defaults', () => {
    const result = mergeConfig(null, 'nonexistent');
    expect(result['unused-imports']).toBe('warn');
    expect(result['complexity-hotspot']).toBe('warn');
  });
});
